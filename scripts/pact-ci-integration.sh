#!/bin/bash

# Pact Contract Testing CI/CD Integration Script
# This script provides utilities for integrating Pact contract testing into CI/CD pipelines

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PACT_BROKER_URL="${PACT_BROKER_URL:-https://your-pact-broker.com}"
PACT_BROKER_TOKEN="${PACT_BROKER_TOKEN:-}"
PROVIDER_BASE_URL="${PROVIDER_BASE_URL:-http://localhost:3000}"
PROVIDER_APP_VERSION="${PROVIDER_APP_VERSION:-${npm_package_version:-1.0.0}}"
CONSUMER_APP_VERSION="${CONSUMER_APP_VERSION:-${npm_package_version:-1.0.0}}"
GITHUB_REF_NAME="${GITHUB_REF_NAME:-main}"
GITHUB_SHA="${GITHUB_SHA:-$(git rev-parse HEAD)}"
GITHUB_RUN_ID="${GITHUB_RUN_ID:-local}"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v pact-broker &> /dev/null; then
        log_warning "pact-broker CLI not found, installing..."
        npm install -g @pact-foundation/pact-broker-cli
    fi
    
    log_success "Dependencies check completed"
}

# Validate environment variables
validate_environment() {
    log_info "Validating environment variables..."
    
    if [ -z "$PACT_BROKER_URL" ] || [ "$PACT_BROKER_URL" = "https://your-pact-broker.com" ]; then
        log_error "PACT_BROKER_URL is not configured"
        exit 1
    fi
    
    if [ -z "$PACT_BROKER_TOKEN" ]; then
        log_error "PACT_BROKER_TOKEN is not configured"
        exit 1
    fi
    
    log_success "Environment validation completed"
}

# Run consumer contract tests
run_consumer_tests() {
    log_info "Running consumer contract tests..."
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Run contract tests
    if npm run test:contract; then
        log_success "Consumer contract tests passed"
        return 0
    else
        log_error "Consumer contract tests failed"
        return 1
    fi
}

# Publish contracts to broker
publish_contracts() {
    log_info "Publishing contracts to broker..."
    
    local branch_name="$1"
    local build_url="$2"
    
    if [ -d "pacts" ] && [ "$(ls -A pacts)" ]; then
        pact-broker publish ./pacts \
            --consumer-app-version="$CONSUMER_APP_VERSION" \
            --broker-base-url="$PACT_BROKER_URL" \
            --broker-token="$PACT_BROKER_TOKEN" \
            --branch="${branch_name:-$GITHUB_REF_NAME}" \
            --build-url="${build_url:-https://github.com/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID}" \
            --auto-detect-version-properties
        
        log_success "Contracts published successfully"
    else
        log_warning "No contracts found to publish"
    fi
}

# Start provider application
start_provider() {
    log_info "Starting provider application..."
    
    # Start the application in background
    npm run start:dev &
    PROVIDER_PID=$!
    
    # Wait for application to be ready
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$PROVIDER_BASE_URL/health" > /dev/null; then
            log_success "Provider application is ready"
            return 0
        fi
        
        log_info "Waiting for provider to be ready... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    log_error "Provider application failed to start within timeout"
    return 1
}

# Stop provider application
stop_provider() {
    if [ ! -z "$PROVIDER_PID" ]; then
        log_info "Stopping provider application..."
        kill $PROVIDER_PID 2>/dev/null || true
        wait $PROVIDER_PID 2>/dev/null || true
        log_success "Provider application stopped"
    fi
}

# Run provider verification
run_provider_verification() {
    log_info "Running provider verification..."
    
    local branch_name="$1"
    
    pact-broker verify \
        --provider-base-url="$PROVIDER_BASE_URL" \
        --provider-app-version="$PROVIDER_APP_VERSION" \
        --broker-base-url="$PACT_BROKER_URL" \
        --broker-token="$PACT_BROKER_TOKEN" \
        --publish-verification-results \
        --provider-version-branch="${branch_name:-$GITHUB_REF_NAME}" \
        --enable-pending \
        --include-wip-pacts-since="2023-01-01"
    
    log_success "Provider verification completed"
}

# Check if deployment is safe
check_deployment_safety() {
    log_info "Checking deployment safety..."
    
    local environment="$1"
    local version="$2"
    
    pact-broker can-i-deploy \
        --pacticipant="StrellerMinds-Backend" \
        --version="${version:-$PROVIDER_APP_VERSION}" \
        --to-environment="${environment:-production}" \
        --broker-base-url="$PACT_BROKER_URL" \
        --broker-token="$PACT_BROKER_TOKEN"
    
    log_success "Deployment safety check passed"
}

# Create webhook for automatic verification
create_webhook() {
    log_info "Creating webhook for automatic verification..."
    
    local webhook_url="$1"
    
    pact-broker create-webhook \
        --broker-base-url="$PACT_BROKER_URL" \
        --broker-token="$PACT_BROKER_TOKEN" \
        --request='POST' \
        --url="$webhook_url" \
        --description="Auto-verify provider on contract change" \
        --provider="StrellerMinds-Backend" \
        --contract-published
    
    log_success "Webhook created successfully"
}

# Generate contract testing report
generate_report() {
    log_info "Generating contract testing report..."
    
    local report_dir="pact-reports"
    mkdir -p "$report_dir"
    
    # Generate HTML report
    pact-broker generate-report \
        --broker-base-url="$PACT_BROKER_URL" \
        --broker-token="$PACT_BROKER_TOKEN" \
        --output="$report_dir/contract-report.html" \
        --format=html
    
    # Generate JSON report
    pact-broker generate-report \
        --broker-base-url="$PACT_BROKER_URL" \
        --broker-token="$PACT_BROKER_TOKEN" \
        --output="$report_dir/contract-report.json" \
        --format=json
    
    log_success "Contract testing report generated in $report_dir/"
}

# Main execution function
main() {
    local command="$1"
    shift
    
    case "$command" in
        "consumer")
            check_dependencies
            validate_environment
            run_consumer_tests
            publish_contracts "$@"
            ;;
        "provider")
            check_dependencies
            validate_environment
            start_provider
            run_provider_verification "$@"
            stop_provider
            ;;
        "verify")
            check_dependencies
            validate_environment
            check_deployment_safety "$@"
            ;;
        "webhook")
            check_dependencies
            validate_environment
            create_webhook "$@"
            ;;
        "report")
            check_dependencies
            validate_environment
            generate_report
            ;;
        "full")
            check_dependencies
            validate_environment
            
            # Run consumer tests and publish
            if run_consumer_tests; then
                publish_contracts "$@"
                
                # Start provider and verify
                if start_provider; then
                    run_provider_verification "$@"
                    stop_provider
                    
                    # Check deployment safety
                    check_deployment_safety "$@"
                fi
            fi
            ;;
        *)
            echo "Pact Contract Testing CI/CD Integration Script"
            echo ""
            echo "Usage: $0 <command> [options]"
            echo ""
            echo "Commands:"
            echo "  consumer [branch] [build-url]  - Run consumer tests and publish contracts"
            echo "  provider [branch]              - Run provider verification"
            echo "  verify [environment] [version] - Check deployment safety"
            echo "  webhook <webhook-url>          - Create webhook for auto-verification"
            echo "  report                         - Generate contract testing report"
            echo "  full [branch] [build-url]      - Run complete contract testing pipeline"
            echo ""
            echo "Environment Variables:"
            echo "  PACT_BROKER_URL               - Pact Broker URL"
            echo "  PACT_BROKER_TOKEN             - Pact Broker authentication token"
            echo "  PROVIDER_BASE_URL             - Provider application URL (default: http://localhost:3000)"
            echo "  PROVIDER_APP_VERSION          - Provider application version"
            echo "  CONSUMER_APP_VERSION          - Consumer application version"
            echo "  GITHUB_REF_NAME               - Git branch name"
            echo "  GITHUB_SHA                    - Git commit SHA"
            echo "  GITHUB_RUN_ID                 - GitHub Actions run ID"
            ;;
    esac
}

# Trap to ensure provider is stopped on script exit
trap stop_provider EXIT

# Run main function with all arguments
main "$@"
