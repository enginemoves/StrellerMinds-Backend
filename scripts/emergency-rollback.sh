#!/bin/bash

# Emergency Rollback Script - Fast rollback for critical production issues
# Usage: ./emergency-rollback.sh <environment>

set -euo pipefail

ENVIRONMENT=${1:-production}
NAMESPACE="strellerminds-${ENVIRONMENT}"
APP_NAME="strellerminds-backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[EMERGENCY $(date +'%H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[CRITICAL ERROR] $1${NC}" >&2
}

success() {
    echo -e "${GREEN}[EMERGENCY SUCCESS] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[EMERGENCY WARNING] $1${NC}"
}

# Emergency notification
send_emergency_alert() {
    local message=$1
    local status=${2:-"alert"}
    
    log "Sending emergency alert: ${message}"
    
    # Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 EMERGENCY ROLLBACK: ${message}\", \"channel\":\"#production-alerts\"}" \
            "${SLACK_WEBHOOK_URL}" &
    fi
    
    # PagerDuty integration (if configured)
    if [[ -n "${PAGERDUTY_INTEGRATION_KEY:-}" ]]; then
        curl -X POST \
            -H 'Content-Type: application/json' \
            -d "{
                \"routing_key\": \"${PAGERDUTY_INTEGRATION_KEY}\",
                \"event_action\": \"trigger\",
                \"payload\": {
                    \"summary\": \"Emergency Rollback: ${message}\",
                    \"source\": \"${ENVIRONMENT}\",
                    \"severity\": \"critical\"
                }
            }" \
            'https://events.pagerduty.com/v2/enqueue' &
    fi
}

# Get last known good deployment
get_last_known_good() {
    log "Finding last known good deployment..."
    
    # Try to get from deployment history
    local deployments
    deployments=$(kubectl get deployments -n "${NAMESPACE}" -l app="${APP_NAME}" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -z "$deployments" ]]; then
        error "No deployments found in namespace ${NAMESPACE}"
        return 1
    fi
    
    # Look for the deployment that's not currently active
    local current_color
    current_color=$(kubectl get service "${APP_NAME}-service" -n "${NAMESPACE}" -o jsonpath='{.spec.selector.color}' 2>/dev/null || echo "")
    
    for deployment in $deployments; do
        if [[ "$deployment" =~ -blue$ ]] && [[ "$current_color" != "blue" ]]; then
            echo "blue"
            return 0
        elif [[ "$deployment" =~ -green$ ]] && [[ "$current_color" != "green" ]]; then
            echo "green"
            return 0
        fi
    done
    
    # If no alternate deployment found, use backup strategy
    warn "No alternate deployment found, checking for backup deployment"
    
    # Look for emergency or backup deployments
    if kubectl get deployment "${APP_NAME}-${ENVIRONMENT}-emergency" -n "${NAMESPACE}" &>/dev/null; then
        echo "emergency"
        return 0
    fi
    
    error "No rollback target found"
    return 1
}

# Immediate traffic switch
immediate_rollback() {
    local target_color=$1
    
    log "EXECUTING IMMEDIATE ROLLBACK to ${target_color}"
    send_emergency_alert "Executing immediate rollback to ${target_color} in ${ENVIRONMENT}"
    
    # Scale up target deployment immediately
    kubectl scale deployment "${APP_NAME}-${ENVIRONMENT}-${target_color}" --replicas=3 -n "${NAMESPACE}"
    
    # Don't wait for full readiness - switch traffic immediately for emergency
    log "Switching traffic immediately (emergency mode)"
    kubectl patch service "${APP_NAME}-service" -n "${NAMESPACE}" -p "{\"spec\":{\"selector\":{\"color\":\"${target_color}\"}}}"
    
    success "Emergency traffic switch completed"
    
    # Background health monitoring
    (
        sleep 30
        local health_ok=false
        for i in {1..10}; do
            if kubectl get pods -n "${NAMESPACE}" -l color="${target_color}" --field-selector=status.phase=Running | grep -q Running; then
                health_ok=true
                break
            fi
            sleep 10
        done
        
        if [[ "$health_ok" == "true" ]]; then
            send_emergency_alert "Emergency rollback to ${target_color} is healthy" "recovery"
        else
            send_emergency_alert "Emergency rollback to ${target_color} may have issues - manual intervention required" "critical"
        fi
    ) &
}

# Create emergency maintenance page
create_maintenance_mode() {
    log "Creating emergency maintenance mode..."
    
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${APP_NAME}-maintenance
  namespace: ${NAMESPACE}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ${APP_NAME}-maintenance
  template:
    metadata:
      labels:
        app: ${APP_NAME}-maintenance
    spec:
      containers:
      - name: maintenance
        image: nginx:alpine
        ports:
        - containerPort: 80
        volumeMounts:
        - name: maintenance-page
          mountPath: /usr/share/nginx/html
      volumes:
      - name: maintenance-page
        configMap:
          name: maintenance-page
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: maintenance-page
  namespace: ${NAMESPACE}
data:
  index.html: |
    <!DOCTYPE html>
    <html>
    <head>
        <title>Maintenance Mode</title>
        <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 600px; margin: 0 auto; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔧 System Maintenance</h1>
            <p>We're currently performing emergency maintenance to ensure the best experience.</p>
            <p>We'll be back online shortly. Thank you for your patience.</p>
            <p><small>Incident ID: $(date +%Y%m%d-%H%M%S)</small></p>
        </div>
    </body>
    </html>
---
apiVersion: v1
kind: Service
metadata:
  name: ${APP_NAME}-maintenance-service
  namespace: ${NAMESPACE}
spec:
  selector:
    app: ${APP_NAME}-maintenance
  ports:
  - port: 80
    targetPort: 80
EOF

    success "Maintenance mode created"
}

# Switch to maintenance mode
switch_to_maintenance() {
    log "Switching to maintenance mode..."
    send_emergency_alert "Switching ${ENVIRONMENT} to maintenance mode"
    
    create_maintenance_mode
    
    # Wait for maintenance pods to be ready
    kubectl wait --for=condition=available deployment/${APP_NAME}-maintenance -n "${NAMESPACE}" --timeout=60s
    
    # Switch main service to maintenance
    kubectl patch service "${APP_NAME}-service" -n "${NAMESPACE}" -p '{"spec":{"selector":{"app":"'${APP_NAME}'-maintenance"}}}'
    
    success "Switched to maintenance mode"
}

# Main emergency rollback function
main() {
    local start_time=$(date +%s)
    
    log "🚨 EMERGENCY ROLLBACK INITIATED for ${ENVIRONMENT}"
    send_emergency_alert "Emergency rollback initiated for ${ENVIRONMENT}"
    
    # Quick prerequisite check
    if ! kubectl cluster-info &>/dev/null; then
        error "Cannot connect to Kubernetes cluster"
        send_emergency_alert "Emergency rollback FAILED - no cluster connection"
        exit 1
    fi
    
    # Find rollback target
    local target_color
    if ! target_color=$(get_last_known_good); then
        warn "No rollback target found, switching to maintenance mode"
        switch_to_maintenance
        send_emergency_alert "No rollback target found - switched to maintenance mode"
        exit 0
    fi
    
    log "Emergency rollback target: ${target_color}"
    
    # Execute immediate rollback
    immediate_rollback "$target_color"
    
    # Calculate rollback time
    local end_time=$(date +%s)
    local rollback_time=$((end_time - start_time))
    
    success "🚀 EMERGENCY ROLLBACK COMPLETED in ${rollback_time} seconds"
    send_emergency_alert "Emergency rollback completed in ${rollback_time}s - ${target_color} is now active" "recovery"
    
    # Log incident details
    cat > "/tmp/emergency-rollback-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log" <<EOF
Emergency Rollback Report
========================
Environment: ${ENVIRONMENT}
Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Rollback Target: ${target_color}
Rollback Time: ${rollback_time} seconds
Triggered By: ${GITHUB_ACTOR:-$(whoami)}
Run ID: ${GITHUB_RUN_ID:-manual}

Next Steps:
1. Verify application functionality
2. Monitor error rates and performance
3. Investigate root cause of original issue
4. Plan proper fix and deployment
EOF
    
    log "Emergency rollback report saved to /tmp/"
    log "Please verify application functionality and monitor for issues"
}

# Handle script interruption
trap 'error "Emergency rollback interrupted"; send_emergency_alert "Emergency rollback was interrupted"' INT TERM

# Run main function
main "$@"
