#!/bin/bash

# Database Backup Script for Blue-Green Deployments
# Usage: ./backup-database.sh <environment>

set -euo pipefail

ENVIRONMENT=${1:-production}
BACKUP_DIR="/tmp/db-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/strellerminds-${ENVIRONMENT}-${TIMESTAMP}.sql"

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

# Create backup directory
create_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        mkdir -p "$BACKUP_DIR"
        log "Created backup directory: $BACKUP_DIR"
    fi
}

# Perform database backup
backup_database() {
    log "Starting database backup for ${ENVIRONMENT}"
    log "Backup file: ${BACKUP_FILE}"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --verbose \
        --clean \
        --if-exists \
        --create \
        --format=custom \
        --file="$BACKUP_FILE"; then
        
        success "Database backup completed successfully"
        
        # Compress backup
        gzip "$BACKUP_FILE"
        BACKUP_FILE="${BACKUP_FILE}.gz"
        
        # Get backup size
        local backup_size
        backup_size=$(du -h "$BACKUP_FILE" | cut -f1)
        log "Backup size: $backup_size"
        
        # Store backup metadata
        cat > "${BACKUP_FILE}.meta" <<EOF
{
  "environment": "$ENVIRONMENT",
  "timestamp": "$TIMESTAMP",
  "database": "$DB_NAME",
  "host": "$DB_HOST",
  "size": "$backup_size",
  "file": "$(basename "$BACKUP_FILE")"
}
EOF
        
        success "Backup metadata saved"
        
    else
        error "Database backup failed"
        return 1
    fi
}

# Upload backup to cloud storage (optional)
upload_backup() {
    if [[ -n "${AWS_S3_BACKUP_BUCKET:-}" ]]; then
        log "Uploading backup to S3..."
        
        if command -v aws &> /dev/null; then
            aws s3 cp "$BACKUP_FILE" "s3://${AWS_S3_BACKUP_BUCKET}/backups/${ENVIRONMENT}/"
            aws s3 cp "${BACKUP_FILE}.meta" "s3://${AWS_S3_BACKUP_BUCKET}/backups/${ENVIRONMENT}/"
            success "Backup uploaded to S3"
        else
            warn "AWS CLI not available, skipping S3 upload"
        fi
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    local retention_days=${BACKUP_RETENTION_DAYS:-7}
    
    log "Cleaning up backups older than ${retention_days} days"
    
    find "$BACKUP_DIR" -name "strellerminds-${ENVIRONMENT}-*.sql.gz" -mtime +${retention_days} -delete
    find "$BACKUP_DIR" -name "strellerminds-${ENVIRONMENT}-*.sql.gz.meta" -mtime +${retention_days} -delete
    
    success "Old backups cleaned up"
}

# Main function
main() {
    log "Starting database backup process for ${ENVIRONMENT}"
    
    get_db_config
    create_backup_dir
    
    if backup_database; then
        upload_backup
        cleanup_old_backups
        
        success "Database backup process completed"
        log "Backup location: $BACKUP_FILE"
        
        # Set output for GitHub Actions
        if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
            echo "backup_file=$BACKUP_FILE" >> "$GITHUB_OUTPUT"
            echo "backup_timestamp=$TIMESTAMP" >> "$GITHUB_OUTPUT"
        fi
        
        exit 0
    else
        error "Database backup process failed"
        exit 1
    fi
}

# Run main function
main "$@"
