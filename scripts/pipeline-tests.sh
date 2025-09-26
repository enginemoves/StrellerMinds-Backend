#!/bin/bash

# Pipeline Configuration Tests
# Usage: ./pipeline-tests.sh

set -euo pipefail

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

# Test counters
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

# Test GitHub Actions workflow syntax
test_workflow_syntax() {
    local workflow_file=".github/workflows/enhanced-ci-cd.yml"
    
    if [[ ! -f "$workflow_file" ]]; then
        return 1
    fi
    
    # Basic YAML syntax check
    if command -v yq &> /dev/null; then
        yq eval '.' "$workflow_file" > /dev/null
    elif command -v python3 &> /dev/null; then
        python3 -c "import yaml; yaml.safe_load(open('$workflow_file'))"
    else
        # Basic check for common YAML issues
        grep -q "^[[:space:]]*-[[:space:]]*" "$workflow_file" && \
        ! grep -q $'\t' "$workflow_file"
    fi
}

# Test Docker configuration
test_docker_config() {
    local dockerfile="Dockerfile"
    
    [[ -f "$dockerfile" ]] && \
    grep -q "FROM node:" "$dockerfile" && \
    grep -q "WORKDIR /app" "$dockerfile" && \
    grep -q "EXPOSE 3000" "$dockerfile" && \
    grep -q "CMD.*node.*main.js" "$dockerfile"
}

# Test Kubernetes manifests
test_k8s_manifests() {
    local k8s_dir="k8s"
    
    [[ -d "$k8s_dir" ]] && \
    [[ -f "$k8s_dir/namespace.yaml" ]] && \
    [[ -f "$k8s_dir/deployment.yaml" ]] && \
    [[ -f "$k8s_dir/service.yaml" ]] && \
    [[ -f "$k8s_dir/ingress.yaml" ]]
}

# Test deployment scripts exist and are executable
test_deployment_scripts() {
    local scripts=(
        "scripts/blue-green-deploy.sh"
        "scripts/rollback.sh"
        "scripts/emergency-rollback.sh"
        "scripts/smoke-tests.sh"
        "scripts/monitor-deployment.sh"
    )
    
    for script in "${scripts[@]}"; do
        [[ -f "$script" ]] && [[ -x "$script" ]] || return 1
    done
    
    return 0
}

# Test package.json scripts
test_package_scripts() {
    local required_scripts=(
        "ci:build"
        "ci:test:full"
        "ci:security"
        "deploy:staging"
        "deploy:production"
        "rollback:staging"
        "rollback:production"
    )
    
    for script in "${required_scripts[@]}"; do
        if ! jq -e ".scripts.\"$script\"" package.json > /dev/null 2>&1; then
            return 1
        fi
    done
    
    return 0
}

# Test environment variables configuration
test_env_config() {
    local env_files=(
        ".env.example"
        ".env.test.example"
    )
    
    for env_file in "${env_files[@]}"; do
        [[ -f "$env_file" ]] || return 1
    done
    
    # Check for required environment variables
    local required_vars=(
        "NODE_ENV"
        "DB_HOST"
        "DB_PASSWORD"
        "JWT_SECRET"
    )
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env.example 2>/dev/null; then
            return 1
        fi
    done
    
    return 0
}

# Test security configurations
test_security_config() {
    # Check for security-related files
    [[ -f "scripts/security-scan.sh" ]] && \
    [[ -x "scripts/security-scan.sh" ]] && \
    grep -q "npm audit" "scripts/security-scan.sh" && \
    grep -q "snyk" "scripts/security-scan.sh"
}

# Test monitoring setup
test_monitoring_config() {
    [[ -f "scripts/pipeline-monitoring.sh" ]] && \
    [[ -x "scripts/pipeline-monitoring.sh" ]] && \
    grep -q "grafana" "scripts/pipeline-monitoring.sh" && \
    grep -q "metrics" "scripts/pipeline-monitoring.sh"
}

# Test backup and restore scripts
test_backup_restore() {
    [[ -f "scripts/backup-database.sh" ]] && \
    [[ -f "scripts/restore-database.sh" ]] && \
    [[ -x "scripts/backup-database.sh" ]] && \
    [[ -x "scripts/restore-database.sh" ]]
}

# Test comprehensive testing workflow
test_comprehensive_testing() {
    local workflow_file=".github/workflows/comprehensive-testing.yml"
    
    [[ -f "$workflow_file" ]] && \
    grep -q "unit-tests" "$workflow_file" && \
    grep -q "integration-tests" "$workflow_file" && \
    grep -q "e2e-tests" "$workflow_file" && \
    grep -q "performance-tests" "$workflow_file"
}

# Test blue-green deployment configuration
test_blue_green_config() {
    grep -q "blue" "k8s/deployment.yaml" && \
    grep -q "color: blue" "k8s/service.yaml" && \
    grep -q "blue-green-deploy.sh" "scripts/blue-green-deploy.sh"
}

# Test rollback mechanisms
test_rollback_mechanisms() {
    [[ -f "scripts/rollback.sh" ]] && \
    [[ -f "scripts/emergency-rollback.sh" ]] && \
    grep -q "rollback" "scripts/rollback.sh" && \
    grep -q "emergency" "scripts/emergency-rollback.sh"
}

# Test CI/CD integration
test_cicd_integration() {
    local workflow_file=".github/workflows/enhanced-ci-cd.yml"
    
    grep -q "build-and-test" "$workflow_file" && \
    grep -q "deploy-staging" "$workflow_file" && \
    grep -q "deploy-production" "$workflow_file" && \
    grep -q "rollback" "$workflow_file"
}

# Test health checks
test_health_checks() {
    grep -q "health" "scripts/smoke-tests.sh" && \
    grep -q "/health" "scripts/smoke-tests.sh" && \
    grep -q "livenessProbe" "k8s/deployment.yaml" && \
    grep -q "readinessProbe" "k8s/deployment.yaml"
}

# Main test execution
main() {
    log "Starting pipeline configuration tests"
    
    # Core configuration tests
    run_test "GitHub Actions workflow syntax" "test_workflow_syntax"
    run_test "Docker configuration" "test_docker_config"
    run_test "Kubernetes manifests" "test_k8s_manifests"
    run_test "Deployment scripts" "test_deployment_scripts"
    run_test "Package.json scripts" "test_package_scripts"
    
    # Environment and security tests
    run_test "Environment configuration" "test_env_config"
    run_test "Security configuration" "test_security_config"
    run_test "Monitoring configuration" "test_monitoring_config"
    
    # Backup and recovery tests
    run_test "Backup and restore scripts" "test_backup_restore"
    
    # Pipeline feature tests
    run_test "Comprehensive testing workflow" "test_comprehensive_testing"
    run_test "Blue-green deployment config" "test_blue_green_config"
    run_test "Rollback mechanisms" "test_rollback_mechanisms"
    run_test "CI/CD integration" "test_cicd_integration"
    run_test "Health checks configuration" "test_health_checks"
    
    # Summary
    echo
    log "Pipeline configuration tests completed"
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
        success "All pipeline configuration tests passed! 🎉"
        exit 0
    else
        error "Some pipeline configuration tests failed"
        exit 1
    fi
}

# Run main function
main "$@"
