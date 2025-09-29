#!/bin/bash

# Automated Rollback Script
# Usage: ./rollback.sh <environment> [version]

set -euo pipefail

ENVIRONMENT=${1:-staging}
TARGET_VERSION=${2:-""}
NAMESPACE="strellerminds-${ENVIRONMENT}"
APP_NAME="strellerminds-backend"
DEPLOYMENT_NAME="${APP_NAME}-${ENVIRONMENT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites for rollback..."
    
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        error "jq is not installed or not in PATH"
        exit 1
    fi
    
    # Test kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Get deployment state
get_deployment_state() {
    log "Retrieving deployment state..."
    
    local state_json
    if state_json=$(kubectl get configmap "deployment-state-${ENVIRONMENT}" -n "${NAMESPACE}" -o jsonpath='{.data.state\.json}' 2>/dev/null); then
        echo "$state_json"
    else
        error "No deployment state found for ${ENVIRONMENT}"
        return 1
    fi
}

# Get current deployment color
get_current_color() {
    local current_color
    current_color=$(kubectl get service "${APP_NAME}-service" -n "${NAMESPACE}" -o jsonpath='{.spec.selector.color}' 2>/dev/null || echo "")
    
    if [[ -z "$current_color" ]]; then
        error "Cannot determine current deployment color"
        return 1
    fi
    
    echo "$current_color"
}

# Get rollback target
get_rollback_target() {
    local state_json=$1
    
    if [[ -n "$TARGET_VERSION" ]]; then
        log "Using specified target version: ${TARGET_VERSION}"
        echo "$TARGET_VERSION"
        return 0
    fi
    
    # Get previous version from state
    local previous_color
    previous_color=$(echo "$state_json" | jq -r '.previous_color // empty')
    
    if [[ -z "$previous_color" ]]; then
        error "No previous deployment color found in state"
        return 1
    fi
    
    # Check if previous deployment still exists
    if kubectl get deployment "${DEPLOYMENT_NAME}-${previous_color}" -n "${NAMESPACE}" &> /dev/null; then
        log "Found previous deployment with color: ${previous_color}"
        echo "$previous_color"
    else
        error "Previous deployment ${previous_color} not found"
        return 1
    fi
}

# Validate rollback target
validate_rollback_target() {
    local target=$1
    
    log "Validating rollback target: ${target}"
    
    # If target is a color, check deployment exists
    if [[ "$target" =~ ^(blue|green)$ ]]; then
        if ! kubectl get deployment "${DEPLOYMENT_NAME}-${target}" -n "${NAMESPACE}" &> /dev/null; then
            error "Target deployment ${target} does not exist"
            return 1
        fi
    else
        # If target is a version, we'll need to deploy it
        log "Target is a version tag: ${target}"
    fi
    
    success "Rollback target validated"
}

# Create emergency deployment for version rollback
create_emergency_deployment() {
    local version=$1
    local color="emergency"
    local deployment_name="${DEPLOYMENT_NAME}-${color}"
    
    log "Creating emergency deployment for version ${version}..."
    
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${deployment_name}
  namespace: ${NAMESPACE}
  labels:
    app: ${APP_NAME}
    environment: ${ENVIRONMENT}
    color: ${color}
    version: ${version}
    rollback: "true"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ${APP_NAME}
      color: ${color}
  template:
    metadata:
      labels:
        app: ${APP_NAME}
        color: ${color}
        version: ${version}
        rollback: "true"
    spec:
      containers:
      - name: ${APP_NAME}
        image: ghcr.io/istifanus-n/strellerminds-backend:${version}
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: ${ENVIRONMENT}
        - name: PORT
          value: "3000"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: ${APP_NAME}-secrets
              key: db-host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ${APP_NAME}-secrets
              key: db-password
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: ${APP_NAME}-secrets
              key: redis-url
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: ${APP_NAME}-service-${color}
  namespace: ${NAMESPACE}
  labels:
    app: ${APP_NAME}
    color: ${color}
spec:
  selector:
    app: ${APP_NAME}
    color: ${color}
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
  type: ClusterIP
EOF

    success "Emergency deployment created"
    echo "$color"
}

# Wait for rollback deployment
wait_for_rollback_deployment() {
    local target_color=$1
    local deployment_name="${DEPLOYMENT_NAME}-${target_color}"
    
    log "Waiting for rollback deployment to be ready..."
    
    # Scale up if deployment exists but is scaled down
    kubectl scale deployment "${deployment_name}" --replicas=3 -n "${NAMESPACE}"
    
    if kubectl rollout status deployment/"${deployment_name}" -n "${NAMESPACE}" --timeout=300s; then
        success "Rollback deployment is ready"
        return 0
    else
        error "Rollback deployment failed to become ready"
        return 1
    fi
}

# Run rollback health checks
run_rollback_health_checks() {
    local target_color=$1
    local service_name="${APP_NAME}-service-${target_color}"
    
    log "Running health checks for rollback deployment..."
    
    # Port forward to test the service
    kubectl port-forward service/"${service_name}" 8081:80 -n "${NAMESPACE}" &
    local port_forward_pid=$!
    
    # Wait for port forward to be ready
    sleep 5
    
    local health_check_passed=false
    local max_attempts=15
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log "Rollback health check attempt ${attempt}/${max_attempts}..."
        
        if curl -f -s http://localhost:8081/health > /dev/null 2>&1; then
            success "Rollback health check passed"
            health_check_passed=true
            break
        fi
        
        sleep 10
        ((attempt++))
    done
    
    # Clean up port forward
    kill $port_forward_pid 2>/dev/null || true
    
    if [[ "$health_check_passed" == "false" ]]; then
        error "Rollback health checks failed"
        return 1
    fi
    
    return 0
}

# Execute rollback
execute_rollback() {
    local target_color=$1
    local current_color=$2
    
    log "Executing rollback from ${current_color} to ${target_color}..."
    
    # Create backup of current state
    local backup_timestamp=$(date -u +%Y%m%d-%H%M%S)
    kubectl create configmap "rollback-backup-${backup_timestamp}" \
        --from-literal=environment="${ENVIRONMENT}" \
        --from-literal=from_color="${current_color}" \
        --from-literal=to_color="${target_color}" \
        --from-literal=timestamp="${backup_timestamp}" \
        -n "${NAMESPACE}"
    
    # Switch traffic to rollback target
    log "Switching traffic to ${target_color}..."
    kubectl patch service "${APP_NAME}-service" -n "${NAMESPACE}" -p '{"spec":{"selector":{"color":"'${target_color}'"}}}'
    
    # Wait for traffic to stabilize
    sleep 15
    
    # Final health check
    if ! run_rollback_health_checks "$target_color"; then
        error "Final rollback health check failed"
        # Attempt to switch back
        kubectl patch service "${APP_NAME}-service" -n "${NAMESPACE}" -p '{"spec":{"selector":{"color":"'${current_color}'"}}}'
        return 1
    fi
    
    success "Rollback executed successfully"
    
    # Update deployment state
    save_rollback_state "$current_color" "$target_color"
    
    return 0
}

# Save rollback state
save_rollback_state() {
    local previous_color=$1
    local current_color=$2
    
    log "Saving rollback state..."
    
    local state_file="/tmp/rollback-state-${ENVIRONMENT}.json"
    
    cat > "${state_file}" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "${ENVIRONMENT}",
  "rollback_from": "${previous_color}",
  "rollback_to": "${current_color}",
  "rollback_id": "${GITHUB_RUN_ID:-$(date +%s)}",
  "rollback_type": "automated"
}
EOF
    
    # Store in ConfigMap
    kubectl create configmap "rollback-state-${ENVIRONMENT}" \
        --from-file=rollback.json="${state_file}" \
        -n "${NAMESPACE}" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    success "Rollback state saved"
}

# Cleanup failed deployment
cleanup_failed_deployment() {
    local failed_color=$1
    
    log "Cleaning up failed deployment: ${failed_color}..."
    
    # Scale down failed deployment
    kubectl scale deployment "${DEPLOYMENT_NAME}-${failed_color}" --replicas=0 -n "${NAMESPACE}" 2>/dev/null || true
    
    # Wait before deletion
    sleep 10
    
    # Delete failed deployment
    kubectl delete deployment "${DEPLOYMENT_NAME}-${failed_color}" -n "${NAMESPACE}" 2>/dev/null || true
    kubectl delete service "${APP_NAME}-service-${failed_color}" -n "${NAMESPACE}" 2>/dev/null || true
    
    success "Failed deployment cleaned up"
}

# Send rollback notifications
send_rollback_notification() {
    local status=$1
    local target=$2
    local reason=${3:-"Manual rollback"}
    
    log "Sending rollback notification..."
    
    local webhook_url="${SLACK_WEBHOOK_URL:-}"
    if [[ -z "$webhook_url" ]]; then
        warn "No Slack webhook URL configured, skipping notification"
        return 0
    fi
    
    local color="warning"
    local emoji="⚠️"
    if [[ "$status" == "failed" ]]; then
        color="danger"
        emoji="🚨"
    elif [[ "$status" == "success" ]]; then
        color="good"
        emoji="✅"
    fi
    
    local payload=$(cat <<EOF
{
  "text": "${emoji} Rollback ${status} for ${ENVIRONMENT}",
  "attachments": [{
    "color": "${color}",
    "fields": [
      {
        "title": "Environment",
        "value": "${ENVIRONMENT}",
        "short": true
      },
      {
        "title": "Target",
        "value": "${target}",
        "short": true
      },
      {
        "title": "Reason",
        "value": "${reason}",
        "short": false
      },
      {
        "title": "Timestamp",
        "value": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
        "short": true
      }
    ]
  }]
}
EOF
)
    
    curl -X POST -H 'Content-type: application/json' --data "$payload" "$webhook_url" || warn "Failed to send notification"
}

# Main rollback function
main() {
    log "Starting rollback process for ${ENVIRONMENT}"
    
    check_prerequisites
    
    # Get current state
    local state_json
    if ! state_json=$(get_deployment_state); then
        warn "No deployment state found, attempting emergency rollback"
        if [[ -z "$TARGET_VERSION" ]]; then
            error "No target version specified for emergency rollback"
            exit 1
        fi
    fi
    
    local current_color
    if ! current_color=$(get_current_color); then
        error "Cannot determine current deployment state"
        exit 1
    fi
    
    # Determine rollback target
    local target
    if [[ -n "$TARGET_VERSION" ]]; then
        target="$TARGET_VERSION"
    else
        if ! target=$(get_rollback_target "$state_json"); then
            error "Cannot determine rollback target"
            exit 1
        fi
    fi
    
    log "Current deployment: ${current_color}"
    log "Rollback target: ${target}"
    
    # Validate target
    if ! validate_rollback_target "$target"; then
        exit 1
    fi
    
    local target_color="$target"
    
    # If target is a version, create emergency deployment
    if [[ ! "$target" =~ ^(blue|green)$ ]]; then
        if ! target_color=$(create_emergency_deployment "$target"); then
            error "Failed to create emergency deployment"
            exit 1
        fi
    fi
    
    # Wait for rollback deployment to be ready
    if ! wait_for_rollback_deployment "$target_color"; then
        error "Rollback deployment failed"
        cleanup_failed_deployment "$target_color"
        send_rollback_notification "failed" "$target" "Deployment readiness check failed"
        exit 1
    fi
    
    # Execute rollback
    if ! execute_rollback "$target_color" "$current_color"; then
        error "Rollback execution failed"
        cleanup_failed_deployment "$target_color"
        send_rollback_notification "failed" "$target" "Rollback execution failed"
        exit 1
    fi
    
    # Cleanup old deployment
    cleanup_failed_deployment "$current_color"
    
    success "Rollback completed successfully!"
    log "Service is now running on: ${target_color}"
    
    send_rollback_notification "success" "$target" "Automated rollback completed"
}

# Run main function
main "$@"
