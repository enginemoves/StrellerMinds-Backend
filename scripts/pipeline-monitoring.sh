#!/bin/bash

# Pipeline Monitoring and Metrics Collection Script
# Usage: ./pipeline-monitoring.sh <environment>

set -euo pipefail

ENVIRONMENT=${1:-production}
METRICS_ENDPOINT="https://metrics.strellerminds.com"
GRAFANA_URL="https://grafana.strellerminds.com"

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

# Collect deployment metrics
collect_deployment_metrics() {
    local deployment_id=${1:-$(date +%s)}
    local version=${2:-"unknown"}
    
    log "Collecting deployment metrics for ${ENVIRONMENT}"
    
    # Deployment timing metrics
    local deployment_start_time="${DEPLOYMENT_START_TIME:-$(date +%s)}"
    local deployment_end_time=$(date +%s)
    local deployment_duration=$((deployment_end_time - deployment_start_time))
    
    # Application metrics
    local response_time=$(curl -s -o /dev/null -w "%{time_total}" "https://${ENVIRONMENT}.strellerminds.com/health" || echo "0")
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "https://${ENVIRONMENT}.strellerminds.com/health" || echo "000")
    
    # Infrastructure metrics
    local pod_count=$(kubectl get pods -n "strellerminds-${ENVIRONMENT}" -l app=strellerminds-backend --field-selector=status.phase=Running | wc -l || echo "0")
    local memory_usage=$(kubectl top pods -n "strellerminds-${ENVIRONMENT}" -l app=strellerminds-backend --no-headers | awk '{sum+=$3} END {print sum}' || echo "0")
    local cpu_usage=$(kubectl top pods -n "strellerminds-${ENVIRONMENT}" -l app=strellerminds-backend --no-headers | awk '{sum+=$2} END {print sum}' || echo "0")
    
    # Create metrics payload
    local metrics_payload=$(cat <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "${ENVIRONMENT}",
  "deployment_id": "${deployment_id}",
  "version": "${version}",
  "metrics": {
    "deployment": {
      "duration_seconds": ${deployment_duration},
      "status": "$([ "$status_code" = "200" ] && echo "success" || echo "failed")"
    },
    "application": {
      "response_time_ms": $(echo "$response_time * 1000" | bc),
      "status_code": ${status_code},
      "health_status": "$([ "$status_code" = "200" ] && echo "healthy" || echo "unhealthy")"
    },
    "infrastructure": {
      "pod_count": ${pod_count},
      "memory_usage_mb": ${memory_usage},
      "cpu_usage_millicores": ${cpu_usage}
    }
  }
}
EOF
)
    
    # Send metrics to monitoring system
    if [[ -n "${METRICS_ENDPOINT}" ]]; then
        curl -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${METRICS_API_KEY:-}" \
            -d "$metrics_payload" \
            "${METRICS_ENDPOINT}/api/v1/metrics" || warn "Failed to send metrics"
    fi
    
    # Save metrics locally
    echo "$metrics_payload" > "/tmp/deployment-metrics-${ENVIRONMENT}-${deployment_id}.json"
    success "Metrics collected and saved"
}

# Setup monitoring dashboards
setup_monitoring_dashboards() {
    log "Setting up monitoring dashboards for ${ENVIRONMENT}"
    
    # Create Grafana dashboard configuration
    local dashboard_config=$(cat <<'EOF'
{
  "dashboard": {
    "id": null,
    "title": "StrellerMinds Deployment Pipeline",
    "tags": ["deployment", "cicd"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Deployment Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(deployment_success_total[5m])",
            "legendFormat": "Success Rate"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Deployment Duration",
        "type": "graph",
        "targets": [
          {
            "expr": "deployment_duration_seconds",
            "legendFormat": "Duration (seconds)"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "Application Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "http_request_duration_seconds",
            "legendFormat": "Response Time"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "Error Rate"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
EOF
)
    
    # Create dashboard via Grafana API
    if [[ -n "${GRAFANA_API_KEY:-}" ]]; then
        curl -X POST \
            -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
            -H "Content-Type: application/json" \
            -d "$dashboard_config" \
            "${GRAFANA_URL}/api/dashboards/db" || warn "Failed to create Grafana dashboard"
    fi
    
    success "Monitoring dashboards configured"
}

# Setup alerting rules
setup_alerting() {
    log "Setting up alerting rules for ${ENVIRONMENT}"
    
    # Prometheus alerting rules
    local alerting_rules=$(cat <<'EOF'
groups:
- name: deployment.rules
  rules:
  - alert: DeploymentFailed
    expr: deployment_status != 1
    for: 0m
    labels:
      severity: critical
    annotations:
      summary: "Deployment failed in {{ $labels.environment }}"
      description: "Deployment {{ $labels.deployment_id }} failed in {{ $labels.environment }}"

  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }} in {{ $labels.environment }}"

  - alert: SlowResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Slow response time detected"
      description: "95th percentile response time is {{ $value }}s in {{ $labels.environment }}"

  - alert: PodCrashLooping
    expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
    for: 0m
    labels:
      severity: critical
    annotations:
      summary: "Pod is crash looping"
      description: "Pod {{ $labels.pod }} is crash looping in {{ $labels.namespace }}"
EOF
)
    
    # Save alerting rules
    echo "$alerting_rules" > "/tmp/alerting-rules-${ENVIRONMENT}.yml"
    
    # Apply alerting rules via kubectl (if using Prometheus Operator)
    if kubectl get crd prometheusrules.monitoring.coreos.com &>/dev/null; then
        cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: strellerminds-deployment-alerts
  namespace: monitoring
spec:
  $(echo "$alerting_rules" | sed 's/^/  /')
EOF
    fi
    
    success "Alerting rules configured"
}

# Setup notification channels
setup_notifications() {
    log "Setting up notification channels for ${ENVIRONMENT}"
    
    # Slack notification configuration
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local slack_config=$(cat <<EOF
{
  "name": "slack-deployments",
  "type": "slack",
  "settings": {
    "url": "${SLACK_WEBHOOK_URL}",
    "channel": "#deployments",
    "title": "Deployment Alert",
    "text": "{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}"
  }
}
EOF
)
        
        # Create Grafana notification channel
        if [[ -n "${GRAFANA_API_KEY:-}" ]]; then
            curl -X POST \
                -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
                -H "Content-Type: application/json" \
                -d "$slack_config" \
                "${GRAFANA_URL}/api/alert-notifications" || warn "Failed to create Slack notification channel"
        fi
    fi
    
    # PagerDuty notification configuration
    if [[ -n "${PAGERDUTY_INTEGRATION_KEY:-}" ]]; then
        local pagerduty_config=$(cat <<EOF
{
  "name": "pagerduty-critical",
  "type": "pagerduty",
  "settings": {
    "integrationKey": "${PAGERDUTY_INTEGRATION_KEY}",
    "severity": "critical"
  }
}
EOF
)
        
        # Create Grafana notification channel
        if [[ -n "${GRAFANA_API_KEY:-}" ]]; then
            curl -X POST \
                -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
                -H "Content-Type: application/json" \
                -d "$pagerduty_config" \
                "${GRAFANA_URL}/api/alert-notifications" || warn "Failed to create PagerDuty notification channel"
        fi
    fi
    
    success "Notification channels configured"
}

# Monitor pipeline health
monitor_pipeline_health() {
    log "Monitoring pipeline health for ${ENVIRONMENT}"
    
    local health_checks=0
    local failed_checks=0
    
    # Check GitHub Actions workflow status
    if [[ -n "${GITHUB_TOKEN:-}" ]]; then
        local workflow_status
        workflow_status=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
            "https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/runs" | \
            jq -r '.workflow_runs[0].status' || echo "unknown")
        
        health_checks=$((health_checks + 1))
        if [[ "$workflow_status" != "completed" ]]; then
            failed_checks=$((failed_checks + 1))
            warn "GitHub Actions workflow status: ${workflow_status}"
        else
            log "GitHub Actions workflow status: ${workflow_status}"
        fi
    fi
    
    # Check deployment status
    local deployment_status
    deployment_status=$(kubectl get deployment "strellerminds-backend-${ENVIRONMENT}" -n "strellerminds-${ENVIRONMENT}" -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' 2>/dev/null || echo "Unknown")
    
    health_checks=$((health_checks + 1))
    if [[ "$deployment_status" != "True" ]]; then
        failed_checks=$((failed_checks + 1))
        warn "Deployment status: ${deployment_status}"
    else
        log "Deployment status: ${deployment_status}"
    fi
    
    # Check service health
    local service_health
    service_health=$(curl -s -f "https://${ENVIRONMENT}.strellerminds.com/health" && echo "healthy" || echo "unhealthy")
    
    health_checks=$((health_checks + 1))
    if [[ "$service_health" != "healthy" ]]; then
        failed_checks=$((failed_checks + 1))
        warn "Service health: ${service_health}"
    else
        log "Service health: ${service_health}"
    fi
    
    # Calculate health score
    local health_score
    health_score=$(echo "scale=2; ($health_checks - $failed_checks) * 100 / $health_checks" | bc)
    
    log "Pipeline health score: ${health_score}%"
    
    # Send health status
    if [[ $failed_checks -eq 0 ]]; then
        success "Pipeline is healthy"
        return 0
    else
        error "Pipeline has ${failed_checks} failed health checks"
        return 1
    fi
}

# Generate monitoring report
generate_monitoring_report() {
    log "Generating monitoring report for ${ENVIRONMENT}"
    
    local report_file="/tmp/monitoring-report-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"
    
    # Collect various metrics
    local uptime=$(kubectl get deployment "strellerminds-backend-${ENVIRONMENT}" -n "strellerminds-${ENVIRONMENT}" -o jsonpath='{.metadata.creationTimestamp}' 2>/dev/null || echo "unknown")
    local replica_count=$(kubectl get deployment "strellerminds-backend-${ENVIRONMENT}" -n "strellerminds-${ENVIRONMENT}" -o jsonpath='{.status.replicas}' 2>/dev/null || echo "0")
    local ready_replicas=$(kubectl get deployment "strellerminds-backend-${ENVIRONMENT}" -n "strellerminds-${ENVIRONMENT}" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    
    cat > "$report_file" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "${ENVIRONMENT}",
  "monitoring": {
    "uptime": "${uptime}",
    "replicas": {
      "desired": ${replica_count},
      "ready": ${ready_replicas}
    },
    "health_status": "$(monitor_pipeline_health >/dev/null 2>&1 && echo "healthy" || echo "unhealthy")",
    "dashboards": {
      "grafana_url": "${GRAFANA_URL}/d/deployment-pipeline",
      "metrics_endpoint": "${METRICS_ENDPOINT}"
    }
  }
}
EOF
    
    log "Monitoring report saved to: ${report_file}"
    success "Monitoring report generated"
}

# Main function
main() {
    log "Starting pipeline monitoring setup for ${ENVIRONMENT}"
    
    # Setup monitoring components
    collect_deployment_metrics "${GITHUB_RUN_ID:-$(date +%s)}" "${IMAGE_TAG:-latest}"
    setup_monitoring_dashboards
    setup_alerting
    setup_notifications
    
    # Monitor current health
    if monitor_pipeline_health; then
        success "Pipeline monitoring setup completed - system is healthy"
    else
        warn "Pipeline monitoring setup completed - issues detected"
    fi
    
    # Generate report
    generate_monitoring_report
    
    log "Pipeline monitoring is now active for ${ENVIRONMENT}"
}

# Run main function
main "$@"
