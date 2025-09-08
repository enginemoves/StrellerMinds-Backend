#!/bin/bash

# Blue-Green Deployment Script
# Usage: ./blue-green-deploy.sh <environment> <image_tag>

set -euo pipefail

ENVIRONMENT=${1:-staging}
IMAGE_TAG=${2:-latest}
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
    log "Checking prerequisites..."
    
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

# Create namespace if it doesn't exist
ensure_namespace() {
    log "Ensuring namespace ${NAMESPACE} exists..."
    kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
    success "Namespace ${NAMESPACE} ready"
}

# Get current deployment color
get_current_color() {
    local current_color
    current_color=$(kubectl get service "${APP_NAME}-service" -n "${NAMESPACE}" -o jsonpath='{.spec.selector.color}' 2>/dev/null || echo "")
    
    if [[ -z "$current_color" ]]; then
        echo "blue"  # Default to blue if no current deployment
    else
        echo "$current_color"
    fi
}

# Get next deployment color
get_next_color() {
    local current_color=$1
    if [[ "$current_color" == "blue" ]]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Deploy to specific color
deploy_color() {
    local color=$1
    local deployment_name="${DEPLOYMENT_NAME}-${color}"
    
    log "Deploying ${color} version with image ${IMAGE_TAG}..."
    
    # Create deployment manifest
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
    version: ${IMAGE_TAG}
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
        version: ${IMAGE_TAG}
    spec:
      containers:
      - name: ${APP_NAME}
        image: ghcr.io/istifanus-n/strellerminds-backend:${IMAGE_TAG}
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

    success "Deployed ${color} version"
}

# Wait for deployment to be ready
wait_for_deployment() {
    local color=$1
    local deployment_name="${DEPLOYMENT_NAME}-${color}"
    
    log "Waiting for ${color} deployment to be ready..."
    
    if kubectl rollout status deployment/"${deployment_name}" -n "${NAMESPACE}" --timeout=600s; then
        success "${color} deployment is ready"
        return 0
    else
        error "${color} deployment failed to become ready"
        return 1
    fi
}

# Run health checks
run_health_checks() {
    local color=$1
    local service_name="${APP_NAME}-service-${color}"
    
    log "Running health checks for ${color} deployment..."
    
    # Port forward to test the service
    kubectl port-forward service/"${service_name}" 8080:80 -n "${NAMESPACE}" &
    local port_forward_pid=$!
    
    # Wait for port forward to be ready
    sleep 5
    
    local health_check_passed=false
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log "Health check attempt ${attempt}/${max_attempts}..."
        
        if curl -f -s http://localhost:8080/health > /dev/null 2>&1; then
            success "Health check passed for ${color} deployment"
            health_check_passed=true
            break
        fi
        
        sleep 10
        ((attempt++))
    done
    
    # Clean up port forward
    kill $port_forward_pid 2>/dev/null || true
    
    if [[ "$health_check_passed" == "false" ]]; then
        error "Health checks failed for ${color} deployment"
        return 1
    fi
    
    return 0
}

# Switch traffic to new deployment
switch_traffic() {
    local new_color=$1
    
    log "Switching traffic to ${new_color} deployment..."
    
    # Update main service to point to new color
    kubectl patch service "${APP_NAME}-service" -n "${NAMESPACE}" -p '{"spec":{"selector":{"color":"'${new_color}'"}}}'
    
    success "Traffic switched to ${new_color} deployment"
}

# Create main service if it doesn't exist
ensure_main_service() {
    if ! kubectl get service "${APP_NAME}-service" -n "${NAMESPACE}" &> /dev/null; then
        log "Creating main service..."
        
        cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: ${APP_NAME}-service
  namespace: ${NAMESPACE}
  labels:
    app: ${APP_NAME}
spec:
  selector:
    app: ${APP_NAME}
    color: blue
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
  type: LoadBalancer
EOF
        success "Main service created"
    fi
}

# Save deployment state for rollback
save_deployment_state() {
    local current_color=$1
    local new_color=$2
    
    log "Saving deployment state for rollback..."
    
    local state_file="/tmp/deployment-state-${ENVIRONMENT}.json"
    
    cat > "${state_file}" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "${ENVIRONMENT}",
  "previous_color": "${current_color}",
  "current_color": "${new_color}",
  "image_tag": "${IMAGE_TAG}",
  "deployment_id": "${GITHUB_RUN_ID:-$(date +%s)}"
}
EOF
    
    # Store in ConfigMap for persistence
    kubectl create configmap "deployment-state-${ENVIRONMENT}" \
        --from-file=state.json="${state_file}" \
        -n "${NAMESPACE}" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    success "Deployment state saved"
}

# Cleanup old deployment
cleanup_old_deployment() {
    local old_color=$1
    
    log "Cleaning up old ${old_color} deployment..."
    
    # Scale down old deployment
    kubectl scale deployment "${DEPLOYMENT_NAME}-${old_color}" --replicas=0 -n "${NAMESPACE}" 2>/dev/null || true
    
    # Wait a bit before deletion
    sleep 30
    
    # Delete old deployment (but keep service for quick rollback)
    kubectl delete deployment "${DEPLOYMENT_NAME}-${old_color}" -n "${NAMESPACE}" 2>/dev/null || true
    
    success "Old ${old_color} deployment cleaned up"
}

# Main deployment function
main() {
    log "Starting blue-green deployment for ${ENVIRONMENT} with image ${IMAGE_TAG}"
    
    check_prerequisites
    ensure_namespace
    ensure_main_service
    
    local current_color
    current_color=$(get_current_color)
    local new_color
    new_color=$(get_next_color "$current_color")
    
    log "Current deployment color: ${current_color}"
    log "New deployment color: ${new_color}"
    
    # Deploy new version
    deploy_color "$new_color"
    
    # Wait for deployment to be ready
    if ! wait_for_deployment "$new_color"; then
        error "Deployment failed, cleaning up..."
        kubectl delete deployment "${DEPLOYMENT_NAME}-${new_color}" -n "${NAMESPACE}" 2>/dev/null || true
        exit 1
    fi
    
    # Run health checks
    if ! run_health_checks "$new_color"; then
        error "Health checks failed, cleaning up..."
        kubectl delete deployment "${DEPLOYMENT_NAME}-${new_color}" -n "${NAMESPACE}" 2>/dev/null || true
        exit 1
    fi
    
    # Save state for rollback
    save_deployment_state "$current_color" "$new_color"
    
    # Switch traffic
    switch_traffic "$new_color"
    
    # Wait a bit to ensure traffic is flowing
    sleep 30
    
    # Final health check
    if ! run_health_checks "$new_color"; then
        error "Final health check failed, rolling back..."
        switch_traffic "$current_color"
        kubectl delete deployment "${DEPLOYMENT_NAME}-${new_color}" -n "${NAMESPACE}" 2>/dev/null || true
        exit 1
    fi
    
    # Cleanup old deployment after successful switch
    if [[ "$current_color" != "$new_color" ]]; then
        cleanup_old_deployment "$current_color"
    fi
    
    success "Blue-green deployment completed successfully!"
    log "New deployment is live with color: ${new_color}"
}

# Run main function
main "$@"
