#!/bin/bash

# Database Restore Script for Emergency Rollbacks
# Usage: ./restore-database.sh <environment> [backup_file]

set -euo pipefail

ENVIRONMENT=${1:-production}
BACKUP_FILE=${2:-""}
BACKUP_DIR="/tmp/db-backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Get database connection details
get_db_config() {
    case $ENVIRONMENT in
        "production")
            DB_HOST="${PROD_DB_HOST:-localhost}"
            DB_PORT="${PROD_DB_PORT:-5432}"
            DB_NAME="${PROD_DB_NAME:-strellerminds_prod}"
            DB_USER="${PROD_DB_USER:-postgres}"
            DB_PASSWORD="${PROD_DB_PASSWORD:-}"
            ;;
        "staging")
            DB_HOST="${STAGING_DB_HOST:-localhost}"
            DB_PORT="${STAGING_DB_PORT:-5432}"
            DB_NAME="${STAGING_DB_NAME:-strellerminds_staging}"
            DB_USER="${STAGING_DB_USER:-postgres}"
            DB_PASSWORD="${STAGING_DB_PASSWORD:-}"
            ;;
        *)
            error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
}

# Find latest backup if none specified
find_latest_backup() {
    if [[ -z "$BACKUP_FILE" ]]; then
        log "Finding latest backup for ${ENVIRONMENT}..."
        
        BACKUP_FILE=$(find "$BACKUP_DIR" -name "strellerminds-${ENVIRONMENT}-*.sql.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
        
        if [[ -z "$BACKUP_FILE" ]]; then
            error "No backup files found for ${ENVIRONMENT}"
            return 1
        fi
        
        log "Using latest backup: $(basename "$BACKUP_FILE")"
    fi
    
    if [[ ! -f "$BACKUP_FILE" ]]; then
        error "Backup file not found: $BACKUP_FILE"
        return 1
    fi
    
    return 0
}

# Validate backup file
validate_backup() {
    log "Validating backup file..."
    
    # Check if file is compressed
    if [[ "$BACKUP_FILE" =~ \.gz$ ]]; then
        if ! gzip -t "$BACKUP_FILE"; then
            error "Backup file is corrupted (gzip test failed)"
            return 1
        fi
    fi
    
    # Check file size
    local file_size
    file_size=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup file size: $file_size"
    
    if [[ -f "${BACKUP_FILE}.meta" ]]; then
        log "Backup metadata found:"
        cat "${BACKUP_FILE}.meta"
    fi
    
    success "Backup file validation passed"
    return 0
}

# Create pre-restore backup
create_pre_restore_backup() {
    log "Creating pre-restore backup as safety measure..."
    
    local pre_restore_timestamp=$(date +%Y%m%d-%H%M%S)
    local pre_restore_file="${BACKUP_DIR}/pre-restore-${ENVIRONMENT}-${pre_restore_timestamp}.sql"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --format=custom \
        --file="$pre_restore_file"; then
        
        gzip "$pre_restore_file"
        success "Pre-restore backup created: ${pre_restore_file}.gz"
        
        # Store reference for potential rollback
        echo "${pre_restore_file}.gz" > "/tmp/pre-restore-backup-${ENVIRONMENT}.txt"
    else
        warn "Failed to create pre-restore backup, continuing anyway..."
    fi
}

# Restore database
restore_database() {
    log "Starting database restore for ${ENVIRONMENT}"
    log "Restoring from: $(basename "$BACKUP_FILE")"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Prepare the backup file
    local restore_file="$BACKUP_FILE"
    
    # Decompress if needed
    if [[ "$BACKUP_FILE" =~ \.gz$ ]]; then
        log "Decompressing backup file..."
        restore_file="${BACKUP_FILE%.gz}"
        gunzip -c "$BACKUP_FILE" > "$restore_file"
    fi
    
    # Terminate active connections to the database
    log "Terminating active database connections..."
    psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="postgres" \
        --command="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" || warn "Failed to terminate some connections"
    
    # Restore the database
    log "Restoring database..."
    if pg_restore \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --verbose \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        "$restore_file"; then
        
        success "Database restore completed successfully"
        
        # Clean up temporary decompressed file
        if [[ "$restore_file" != "$BACKUP_FILE" ]]; then
            rm -f "$restore_file"
        fi
        
        return 0
    else
        error "Database restore failed"
        
        # Clean up temporary decompressed file
        if [[ "$restore_file" != "$BACKUP_FILE" ]]; then
            rm -f "$restore_file"
        fi
        
        return 1
    fi
}

# Verify restore
verify_restore() {
    log "Verifying database restore..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Check if database is accessible
    if psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --command="SELECT 1;" > /dev/null 2>&1; then
        
        log "Database connection test passed"
    else
        error "Database connection test failed"
        return 1
    fi
    
    # Check table count
    local table_count
    table_count=$(psql \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --tuples-only \
        --command="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')
    
    log "Tables found: $table_count"
    
    if [[ $table_count -gt 0 ]]; then
        success "Database restore verification passed"
        return 0
    else
        error "Database restore verification failed - no tables found"
        return 1
    fi
}

# Send restore notification
send_restore_notification() {
    local status=$1
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        local emoji="✅"
        
        if [[ "$status" == "failed" ]]; then
            color="danger"
            emoji="❌"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"text\": \"${emoji} Database Restore ${status}\",
                \"attachments\": [{
                    \"color\": \"${color}\",
                    \"fields\": [{
                        \"title\": \"Environment\",
                        \"value\": \"${ENVIRONMENT}\",
                        \"short\": true
                    }, {
                        \"title\": \"Backup File\",
                        \"value\": \"$(basename "$BACKUP_FILE")\",
                        \"short\": true
                    }, {
                        \"title\": \"Timestamp\",
                        \"value\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                        \"short\": true
                    }]
                }]
            }" \
            "${SLACK_WEBHOOK_URL}" || warn "Failed to send notification"
    fi
}

# Main function
main() {
    log "Starting database restore process for ${ENVIRONMENT}"
    
    get_db_config
    
    if ! find_latest_backup; then
        exit 1
    fi
    
    if ! validate_backup; then
        exit 1
    fi
    
    # Confirmation prompt for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        warn "⚠️  You are about to restore the PRODUCTION database!"
        warn "This will overwrite all current data with the backup."
        read -p "Type 'RESTORE PRODUCTION' to confirm: " confirmation
        
        if [[ "$confirmation" != "RESTORE PRODUCTION" ]]; then
            log "Restore cancelled by user"
            exit 0
        fi
    fi
    
    create_pre_restore_backup
    
    if restore_database && verify_restore; then
        success "Database restore completed successfully"
        send_restore_notification "completed"
        
        log "Restore summary:"
        log "  Environment: $ENVIRONMENT"
        log "  Backup file: $(basename "$BACKUP_FILE")"
        log "  Restore time: $(date)"
        
        exit 0
    else
        error "Database restore failed"
        send_restore_notification "failed"
        
        # Offer to restore from pre-restore backup
        if [[ -f "/tmp/pre-restore-backup-${ENVIRONMENT}.txt" ]]; then
            local pre_restore_backup
            pre_restore_backup=$(cat "/tmp/pre-restore-backup-${ENVIRONMENT}.txt")
            
            warn "Pre-restore backup available: $(basename "$pre_restore_backup")"
            warn "You can restore it manually if needed"
        fi
        
        exit 1
    fi
}

# Run main function
main "$@"
