#!/bin/bash

# Deployment Monitoring Script
# Usage: ./monitor-deployment.sh <environment> <duration_seconds>

set -euo pipefail

ENVIRONMENT=${1:-staging}
DURATION=${2:-300}  # Default 5 minutes
NAMESPACE="strellerminds-${ENVIRONMENT}"
APP_NAME="strellerminds-backend"

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

# Monitoring metrics
TOTAL_CHECKS=0
FAILED_CHECKS=0
ERROR_RATE_THRESHOLD=5  # 5% error rate threshold
RESPONSE_TIME_THRESHOLD=2000  # 2 second response time threshold

# Get base URL for environment
get_base_url() {
    case $ENVIRONMENT in
        "staging")
            echo "https://staging.strellerminds.com"
            ;;
        "production")
            echo "https://strellerminds.com"
            ;;
        *)
            echo "http://localhost:3000"
            ;;
    esac
}

# Check application health
check_health() {
    local base_url=$(get_base_url)
    local start_time=$(date +%s%3N)
    
    if curl -f -s "${base_url}/health" > /dev/null; then
        local end_time=$(date +%s%3N)
        local response_time=$((end_time - start_time))
        echo "$response_time"
        return 0
    else
        return 1
    fi
}

# Check pod status
check_pods() {
    local ready_pods
    local total_pods
    
    ready_pods=$(kubectl get pods -n "${NAMESPACE}" -l app="${APP_NAME}" --field-selector=status.phase=Running -o json | jq '.items | length')
    total_pods=$(kubectl get pods -n "${NAMESPACE}" -l app="${APP_NAME}" -o json | jq '.items | length')
    
    if [[ $ready_pods -eq $total_pods ]] && [[ $ready_pods -gt 0 ]]; then
        echo "${ready_pods}/${total_pods}"
        return 0
    else
        echo "${ready_pods}/${total_pods}"
        return 1
    fi
}

# Check service endpoints
check_service_endpoints() {
    local endpoints
    endpoints=$(kubectl get endpoints "${APP_NAME}-service" -n "${NAMESPACE}" -o json | jq '.subsets[0].addresses | length' 2>/dev/null || echo "0")
    
    if [[ $endpoints -gt 0 ]]; then
        echo "$endpoints"
        return 0
    else
        return 1
    fi
}

# Get error rate from logs
get_error_rate() {
    local error_count
    local total_count
    
    # Get logs from last minute and count errors
    error_count=$(kubectl logs -n "${NAMESPACE}" -l app="${APP_NAME}" --since=1m | grep -c "ERROR\|FATAL\|5[0-9][0-9]" || echo "0")
    total_count=$(kubectl logs -n "${NAMESPACE}" -l app="${APP_NAME}" --since=1m | wc -l || echo "1")
    
    if [[ $total_count -eq 0 ]]; then
        echo "0"
    else
        echo "scale=2; $error_count * 100 / $total_count" | bc
    fi
}

# Get memory usage
get_memory_usage() {
    kubectl top pods -n "${NAMESPACE}" -l app="${APP_NAME}" --no-headers | awk '{sum+=$3} END {print sum}' || echo "0"
}

# Get CPU usage
get_cpu_usage() {
    kubectl top pods -n "${NAMESPACE}" -l app="${APP_NAME}" --no-headers | awk '{sum+=$2} END {print sum}' || echo "0"
}

# Send alert
send_alert() {
    local message=$1
    local severity=${2:-warning}
    
    log "ALERT: ${message}"
    
    # Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="warning"
        local emoji="⚠️"
        
        case $severity in
            "critical")
                color="danger"
                emoji="🚨"
                ;;
            "warning")
                color="warning"
                emoji="⚠️"
                ;;
            "info")
                color="good"
                emoji="ℹ️"
                ;;
        esac
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"text\": \"${emoji} Deployment Monitor Alert\",
                \"attachments\": [{
                    \"color\": \"${color}\",
                    \"fields\": [{
                        \"title\": \"Environment\",
                        \"value\": \"${ENVIRONMENT}\",
                        \"short\": true
                    }, {
                        \"title\": \"Message\",
                        \"value\": \"${message}\",
                        \"short\": false
                    }, {
                        \"title\": \"Timestamp\",
                        \"value\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                        \"short\": true
                    }]
                }]
            }" \
            "${SLACK_WEBHOOK_URL}" &
    fi
}

# Main monitoring loop
monitor_deployment() {
    local start_time=$(date +%s)
    local end_time=$((start_time + DURATION))
    local check_interval=10  # Check every 10 seconds
    
    log "Starting deployment monitoring for ${DURATION} seconds"
    log "Environment: ${ENVIRONMENT}"
    log "Check interval: ${check_interval} seconds"
    
    local consecutive_failures=0
    local max_consecutive_failures=3
    
    while [[ $(date +%s) -lt $end_time ]]; do
        TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
        local check_failed=false
        
        log "Check #${TOTAL_CHECKS}"
        
        # Health check
        local response_time
        if response_time=$(check_health); then
            log "  Health: OK (${response_time}ms)"
            
            if [[ $response_time -gt $RESPONSE_TIME_THRESHOLD ]]; then
                warn "  Response time high: ${response_time}ms (threshold: ${RESPONSE_TIME_THRESHOLD}ms)"
                send_alert "High response time: ${response_time}ms in ${ENVIRONMENT}" "warning"
            fi
        else
            error "  Health: FAILED"
            check_failed=true
        fi
        
        # Pod status
        local pod_status
        if pod_status=$(check_pods); then
            log "  Pods: ${pod_status} ready"
        else
            error "  Pods: ${pod_status} ready"
            check_failed=true
        fi
        
        # Service endpoints
        local endpoints
        if endpoints=$(check_service_endpoints); then
            log "  Endpoints: ${endpoints} available"
        else
            error "  Endpoints: No endpoints available"
            check_failed=true
        fi
        
        # Error rate
        local error_rate
        error_rate=$(get_error_rate)
        log "  Error rate: ${error_rate}%"
        
        if (( $(echo "$error_rate > $ERROR_RATE_THRESHOLD" | bc -l) )); then
            warn "  High error rate: ${error_rate}% (threshold: ${ERROR_RATE_THRESHOLD}%)"
            send_alert "High error rate: ${error_rate}% in ${ENVIRONMENT}" "warning"
        fi
        
        # Resource usage
        local memory_usage
        local cpu_usage
        memory_usage=$(get_memory_usage)
        cpu_usage=$(get_cpu_usage)
        
        log "  Memory: ${memory_usage}Mi, CPU: ${cpu_usage}m"
        
        # Track failures
        if [[ "$check_failed" == "true" ]]; then
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            consecutive_failures=$((consecutive_failures + 1))
            
            if [[ $consecutive_failures -ge $max_consecutive_failures ]]; then
                error "Multiple consecutive failures detected!"
                send_alert "Multiple consecutive failures in ${ENVIRONMENT} - possible deployment issue" "critical"
                return 1
            fi
        else
            consecutive_failures=0
        fi
        
        # Sleep until next check
        sleep $check_interval
    done
    
    return 0
}

# Generate monitoring report
generate_report() {
    local success_rate
    success_rate=$(echo "scale=2; ($TOTAL_CHECKS - $FAILED_CHECKS) * 100 / $TOTAL_CHECKS" | bc)
    
    log "Monitoring completed"
    log "Total checks: ${TOTAL_CHECKS}"
    log "Failed checks: ${FAILED_CHECKS}"
    log "Success rate: ${success_rate}%"
    
    # Create report file
    local report_file="/tmp/deployment-monitor-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" <<EOF
{
  "environment": "${ENVIRONMENT}",
  "monitoring_duration": ${DURATION},
  "total_checks": ${TOTAL_CHECKS},
  "failed_checks": ${FAILED_CHECKS},
  "success_rate": ${success_rate},
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "$([ $FAILED_CHECKS -eq 0 ] && echo "healthy" || echo "issues_detected")"
}
EOF
    
    log "Report saved to: ${report_file}"
    
    # Send summary notification
    if [[ $FAILED_CHECKS -eq 0 ]]; then
        success "Deployment monitoring completed successfully - no issues detected"
        send_alert "Deployment monitoring completed - ${ENVIRONMENT} is healthy (${success_rate}% success rate)" "info"
    else
        warn "Deployment monitoring completed with ${FAILED_CHECKS} failed checks"
        send_alert "Deployment monitoring completed - ${ENVIRONMENT} had ${FAILED_CHECKS} failed checks (${success_rate}% success rate)" "warning"
    fi
}

# Main function
main() {
    log "Deployment monitoring starting..."
    
    # Check prerequisites
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        error "jq is not installed"
        exit 1
    fi
    
    if ! command -v bc &> /dev/null; then
        error "bc is not installed"
        exit 1
    fi
    
    # Start monitoring
    if monitor_deployment; then
        generate_report
        exit 0
    else
        generate_report
        error "Deployment monitoring detected critical issues"
        exit 1
    fi
}

# Handle interruption
trap 'error "Monitoring interrupted"; generate_report; exit 1' INT TERM

# Run main function
main "$@"
