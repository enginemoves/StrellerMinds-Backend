#!/bin/bash

# Security Scanning Script for CI/CD Pipeline
# Usage: ./security-scan.sh <environment>

set -euo pipefail

ENVIRONMENT=${1:-staging}
SCAN_RESULTS_DIR="/tmp/security-scans"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

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

# Create scan results directory
create_scan_dir() {
    mkdir -p "$SCAN_RESULTS_DIR"
    log "Created scan results directory: $SCAN_RESULTS_DIR"
}

# Run npm audit
run_npm_audit() {
    log "Running npm audit..."
    
    local audit_file="${SCAN_RESULTS_DIR}/npm-audit-${TIMESTAMP}.json"
    
    if npm audit --json > "$audit_file" 2>/dev/null; then
        success "npm audit completed - no vulnerabilities found"
        return 0
    else
        local exit_code=$?
        if [[ $exit_code -eq 1 ]]; then
            warn "npm audit found vulnerabilities - check $audit_file"
            
            # Extract summary
            local high_vulns=$(jq '.metadata.vulnerabilities.high // 0' "$audit_file")
            local critical_vulns=$(jq '.metadata.vulnerabilities.critical // 0' "$audit_file")
            
            log "Critical vulnerabilities: $critical_vulns"
            log "High vulnerabilities: $high_vulns"
            
            if [[ $critical_vulns -gt 0 ]]; then
                error "Critical vulnerabilities found - deployment should be blocked"
                return 1
            elif [[ $high_vulns -gt 5 ]]; then
                warn "High number of high-severity vulnerabilities: $high_vulns"
                return 1
            fi
        else
            error "npm audit failed with exit code $exit_code"
            return 1
        fi
    fi
    
    return 0
}

# Run Snyk security scan
run_snyk_scan() {
    if [[ -z "${SNYK_TOKEN:-}" ]]; then
        warn "SNYK_TOKEN not set, skipping Snyk scan"
        return 0
    fi
    
    log "Running Snyk security scan..."
    
    local snyk_file="${SCAN_RESULTS_DIR}/snyk-scan-${TIMESTAMP}.json"
    
    if command -v snyk &> /dev/null; then
        if snyk test --json > "$snyk_file" 2>/dev/null; then
            success "Snyk scan completed - no vulnerabilities found"
            return 0
        else
            local exit_code=$?
            if [[ $exit_code -eq 1 ]]; then
                warn "Snyk found vulnerabilities - check $snyk_file"
                
                # Extract high and critical issues
                local high_issues=$(jq '[.vulnerabilities[] | select(.severity == "high")] | length' "$snyk_file" 2>/dev/null || echo "0")
                local critical_issues=$(jq '[.vulnerabilities[] | select(.severity == "critical")] | length' "$snyk_file" 2>/dev/null || echo "0")
                
                log "Critical issues: $critical_issues"
                log "High issues: $high_issues"
                
                if [[ $critical_issues -gt 0 ]]; then
                    error "Critical security issues found"
                    return 1
                fi
            else
                warn "Snyk scan failed with exit code $exit_code"
            fi
        fi
    else
        warn "Snyk CLI not installed, skipping scan"
    fi
    
    return 0
}

# Run container security scan with Trivy
run_container_scan() {
    local image_name=${1:-"strellerminds-backend:latest"}
    
    log "Running container security scan with Trivy..."
    
    local trivy_file="${SCAN_RESULTS_DIR}/trivy-scan-${TIMESTAMP}.json"
    
    if command -v trivy &> /dev/null; then
        if trivy image --format json --output "$trivy_file" "$image_name"; then
            # Parse results
            local critical_vulns=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "CRITICAL")] | length' "$trivy_file" 2>/dev/null || echo "0")
            local high_vulns=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "HIGH")] | length' "$trivy_file" 2>/dev/null || echo "0")
            
            log "Container scan results:"
            log "  Critical vulnerabilities: $critical_vulns"
            log "  High vulnerabilities: $high_vulns"
            
            if [[ $critical_vulns -gt 0 ]]; then
                error "Critical vulnerabilities found in container image"
                return 1
            elif [[ $high_vulns -gt 10 ]]; then
                warn "High number of high-severity vulnerabilities: $high_vulns"
                return 1
            fi
            
            success "Container security scan completed"
            return 0
        else
            error "Trivy container scan failed"
            return 1
        fi
    else
        warn "Trivy not installed, skipping container scan"
        return 0
    fi
}

# Run SAST (Static Application Security Testing)
run_sast_scan() {
    log "Running SAST scan..."
    
    local sast_file="${SCAN_RESULTS_DIR}/sast-scan-${TIMESTAMP}.json"
    
    # Use semgrep for SAST if available
    if command -v semgrep &> /dev/null; then
        if semgrep --config=auto --json --output="$sast_file" .; then
            local findings=$(jq '.results | length' "$sast_file" 2>/dev/null || echo "0")
            local high_findings=$(jq '[.results[] | select(.extra.severity == "ERROR")] | length' "$sast_file" 2>/dev/null || echo "0")
            
            log "SAST scan results:"
            log "  Total findings: $findings"
            log "  High severity findings: $high_findings"
            
            if [[ $high_findings -gt 0 ]]; then
                warn "High severity security findings detected"
                # Don't fail for SAST findings in this implementation
            fi
            
            success "SAST scan completed"
        else
            warn "SAST scan failed"
        fi
    else
        warn "Semgrep not installed, skipping SAST scan"
    fi
    
    return 0
}

# Run license compliance check
run_license_check() {
    log "Running license compliance check..."
    
    local license_file="${SCAN_RESULTS_DIR}/license-check-${TIMESTAMP}.json"
    
    if command -v license-checker &> /dev/null; then
        license-checker --json --out "$license_file" || true
        
        # Check for problematic licenses
        local problematic_licenses=("GPL" "AGPL" "LGPL" "CPAL" "EPL")
        local issues_found=false
        
        for license in "${problematic_licenses[@]}"; do
            if grep -q "$license" "$license_file" 2>/dev/null; then
                warn "Potentially problematic license found: $license"
                issues_found=true
            fi
        done
        
        if [[ "$issues_found" == "false" ]]; then
            success "License compliance check passed"
        else
            warn "License compliance issues detected - review required"
        fi
    else
        warn "license-checker not installed, skipping license check"
    fi
    
    return 0
}

# Generate security report
generate_security_report() {
    log "Generating security report..."
    
    local report_file="${SCAN_RESULTS_DIR}/security-report-${TIMESTAMP}.json"
    
    cat > "$report_file" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "scan_id": "$TIMESTAMP",
  "scans": {
    "npm_audit": {
      "completed": $([ -f "${SCAN_RESULTS_DIR}/npm-audit-${TIMESTAMP}.json" ] && echo "true" || echo "false"),
      "file": "npm-audit-${TIMESTAMP}.json"
    },
    "snyk": {
      "completed": $([ -f "${SCAN_RESULTS_DIR}/snyk-scan-${TIMESTAMP}.json" ] && echo "true" || echo "false"),
      "file": "snyk-scan-${TIMESTAMP}.json"
    },
    "container": {
      "completed": $([ -f "${SCAN_RESULTS_DIR}/trivy-scan-${TIMESTAMP}.json" ] && echo "true" || echo "false"),
      "file": "trivy-scan-${TIMESTAMP}.json"
    },
    "sast": {
      "completed": $([ -f "${SCAN_RESULTS_DIR}/sast-scan-${TIMESTAMP}.json" ] && echo "true" || echo "false"),
      "file": "sast-scan-${TIMESTAMP}.json"
    },
    "license": {
      "completed": $([ -f "${SCAN_RESULTS_DIR}/license-check-${TIMESTAMP}.json" ] && echo "true" || echo "false"),
      "file": "license-check-${TIMESTAMP}.json"
    }
  },
  "summary": {
    "total_scans": 5,
    "completed_scans": $(find "$SCAN_RESULTS_DIR" -name "*-${TIMESTAMP}.json" | wc -l),
    "status": "completed"
  }
}
EOF
    
    log "Security report generated: $report_file"
    
    # Set GitHub Actions output
    if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
        echo "security_report=$report_file" >> "$GITHUB_OUTPUT"
        echo "scan_timestamp=$TIMESTAMP" >> "$GITHUB_OUTPUT"
    fi
}

# Send security notifications
send_security_notification() {
    local status=$1
    local critical_issues=${2:-0}
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        local emoji="✅"
        
        if [[ "$status" == "failed" ]]; then
            color="danger"
            emoji="🚨"
        elif [[ $critical_issues -gt 0 ]]; then
            color="warning"
            emoji="⚠️"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"text\": \"${emoji} Security Scan ${status}\",
                \"attachments\": [{
                    \"color\": \"${color}\",
                    \"fields\": [{
                        \"title\": \"Environment\",
                        \"value\": \"${ENVIRONMENT}\",
                        \"short\": true
                    }, {
                        \"title\": \"Critical Issues\",
                        \"value\": \"${critical_issues}\",
                        \"short\": true
                    }, {
                        \"title\": \"Scan ID\",
                        \"value\": \"${TIMESTAMP}\",
                        \"short\": true
                    }]
                }]
            }" \
            "${SLACK_WEBHOOK_URL}" || warn "Failed to send notification"
    fi
}

# Main function
main() {
    log "Starting security scans for ${ENVIRONMENT}"
    
    create_scan_dir
    
    local failed_scans=0
    local critical_issues=0
    
    # Run all security scans
    if ! run_npm_audit; then
        failed_scans=$((failed_scans + 1))
        critical_issues=$((critical_issues + 1))
    fi
    
    if ! run_snyk_scan; then
        failed_scans=$((failed_scans + 1))
    fi
    
    if ! run_container_scan "ghcr.io/istifanus-n/strellerminds-backend:${IMAGE_TAG:-latest}"; then
        failed_scans=$((failed_scans + 1))
        critical_issues=$((critical_issues + 1))
    fi
    
    run_sast_scan  # Don't fail on SAST issues
    run_license_check  # Don't fail on license issues
    
    generate_security_report
    
    # Determine overall status
    if [[ $critical_issues -gt 0 ]]; then
        error "Security scans found critical issues"
        send_security_notification "failed" "$critical_issues"
        exit 1
    elif [[ $failed_scans -gt 0 ]]; then
        warn "Some security scans failed but no critical issues found"
        send_security_notification "completed with warnings" "$critical_issues"
        exit 0
    else
        success "All security scans completed successfully"
        send_security_notification "completed" "$critical_issues"
        exit 0
    fi
}

# Run main function
main "$@"
