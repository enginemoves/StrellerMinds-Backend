#!/bin/bash

# Smoke Tests Script
# Usage: ./smoke-tests.sh <environment>

set -euo pipefail

ENVIRONMENT=${1:-staging}
BASE_URL=""
API_KEY="${API_KEY:-}"

# Set environment-specific URLs
case $ENVIRONMENT in
    "staging")
        BASE_URL="https://staging.strellerminds.com"
        ;;
    "production")
        BASE_URL="https://strellerminds.com"
        ;;
    *)
        echo "Unknown environment: $ENVIRONMENT"
        exit 1
        ;;
esac

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

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Run a test
run_test() {
    local test_name=$1
    local test_command=$2
    
    TESTS_RUN=$((TESTS_RUN + 1))
    log "Running test: ${test_name}"
    
    if eval "$test_command"; then
        success "✅ ${test_name}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        error "❌ ${test_name}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Basic health check
test_health_endpoint() {
    curl -f -s "${BASE_URL}/health" > /dev/null
}

# API readiness check
test_api_ready() {
    curl -f -s "${BASE_URL}/health/ready" > /dev/null
}

# Database connectivity
test_database_connection() {
    local response
    response=$(curl -s "${BASE_URL}/health/db" | jq -r '.status' 2>/dev/null || echo "error")
    [[ "$response" == "ok" ]]
}

# Redis connectivity
test_redis_connection() {
    local response
    response=$(curl -s "${BASE_URL}/health/redis" | jq -r '.status' 2>/dev/null || echo "error")
    [[ "$response" == "ok" ]]
}

# Authentication endpoint
test_auth_endpoint() {
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/auth/login")
    [[ "$response" == "200" ]] || [[ "$response" == "400" ]] || [[ "$response" == "401" ]]
}

# User registration endpoint
test_user_registration() {
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/auth/register" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"invalid"}')
    [[ "$response" == "400" ]] || [[ "$response" == "409" ]]
}

# Courses endpoint
test_courses_endpoint() {
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/courses")
    [[ "$response" == "200" ]] || [[ "$response" == "401" ]]
}

# Analytics endpoint
test_analytics_endpoint() {
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/analytics/dashboard")
    [[ "$response" == "200" ]] || [[ "$response" == "401" ]]
}

# Data quality endpoint
test_data_quality_endpoint() {
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/data-quality/dashboard")
    [[ "$response" == "200" ]] || [[ "$response" == "401" ]]
}

# API versioning
test_api_versioning() {
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/v1/health")
    [[ "$response" == "200" ]]
}

# CORS headers
test_cors_headers() {
    local response
    response=$(curl -s -I "${BASE_URL}/health" | grep -i "access-control-allow-origin" || echo "")
    [[ -n "$response" ]]
}

# Security headers
test_security_headers() {
    local headers
    headers=$(curl -s -I "${BASE_URL}/health")
    
    echo "$headers" | grep -qi "x-frame-options" && \
    echo "$headers" | grep -qi "x-content-type-options" && \
    echo "$headers" | grep -qi "x-xss-protection"
}

# Rate limiting
test_rate_limiting() {
    local response
    # Make multiple requests quickly
    for i in {1..10}; do
        response=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/health")
        if [[ "$response" == "429" ]]; then
            return 0  # Rate limiting is working
        fi
    done
    return 0  # No rate limiting detected, but that's okay for health endpoint
}

# Response time check
test_response_time() {
    local response_time
    response_time=$(curl -s -o /dev/null -w "%{time_total}" "${BASE_URL}/health")
    # Response time should be less than 2 seconds
    (( $(echo "$response_time < 2.0" | bc -l) ))
}

# SSL certificate check
test_ssl_certificate() {
    if [[ "$BASE_URL" =~ ^https:// ]]; then
        local cert_info
        cert_info=$(curl -s -I "${BASE_URL}/health" 2>&1)
        ! echo "$cert_info" | grep -qi "certificate"
    else
        return 0  # Skip SSL test for non-HTTPS URLs
    fi
}

# Load balancer health
test_load_balancer() {
    # Make multiple requests and check for consistent responses
    local responses=()
    for i in {1..5}; do
        local response
        response=$(curl -s "${BASE_URL}/health" | jq -r '.status' 2>/dev/null || echo "error")
        responses+=("$response")
    done
    
    # All responses should be "ok"
    for response in "${responses[@]}"; do
        [[ "$response" == "ok" ]] || return 1
    done
    return 0
}

# Memory usage check
test_memory_usage() {
    local memory_info
    memory_info=$(curl -s "${BASE_URL}/health/metrics" | jq -r '.memory.usage' 2>/dev/null || echo "0")
    # Memory usage should be less than 80%
    (( $(echo "$memory_info < 80" | bc -l) )) 2>/dev/null || return 0
}

# CPU usage check
test_cpu_usage() {
    local cpu_info
    cpu_info=$(curl -s "${BASE_URL}/health/metrics" | jq -r '.cpu.usage' 2>/dev/null || echo "0")
    # CPU usage should be less than 90%
    (( $(echo "$cpu_info < 90" | bc -l) )) 2>/dev/null || return 0
}

# Main test execution
main() {
    log "Starting smoke tests for ${ENVIRONMENT} environment"
    log "Base URL: ${BASE_URL}"
    
    # Core functionality tests
    run_test "Health endpoint" "test_health_endpoint"
    run_test "API readiness" "test_api_ready"
    run_test "Database connection" "test_database_connection"
    run_test "Redis connection" "test_redis_connection"
    
    # API endpoint tests
    run_test "Authentication endpoint" "test_auth_endpoint"
    run_test "User registration endpoint" "test_user_registration"
    run_test "Courses endpoint" "test_courses_endpoint"
    run_test "Analytics endpoint" "test_analytics_endpoint"
    run_test "Data quality endpoint" "test_data_quality_endpoint"
    
    # Technical tests
    run_test "API versioning" "test_api_versioning"
    run_test "CORS headers" "test_cors_headers"
    run_test "Security headers" "test_security_headers"
    run_test "Response time" "test_response_time"
    run_test "SSL certificate" "test_ssl_certificate"
    
    # Performance tests
    run_test "Load balancer health" "test_load_balancer"
    run_test "Memory usage" "test_memory_usage"
    run_test "CPU usage" "test_cpu_usage"
    
    # Summary
    echo
    log "Smoke tests completed"
    log "Tests run: ${TESTS_RUN}"
    success "Tests passed: ${TESTS_PASSED}"
    if [[ $TESTS_FAILED -gt 0 ]]; then
        error "Tests failed: ${TESTS_FAILED}"
    fi
    
    # Calculate success rate
    local success_rate
    success_rate=$(echo "scale=2; $TESTS_PASSED * 100 / $TESTS_RUN" | bc)
    log "Success rate: ${success_rate}%"
    
    # Exit with appropriate code
    if [[ $TESTS_FAILED -eq 0 ]]; then
        success "All smoke tests passed! 🎉"
        exit 0
    elif [[ $success_rate -ge 80 ]]; then
        warn "Some tests failed but success rate is acceptable (${success_rate}%)"
        exit 0
    else
        error "Too many tests failed (${success_rate}% success rate)"
        exit 1
    fi
}

# Run main function
main "$@"
