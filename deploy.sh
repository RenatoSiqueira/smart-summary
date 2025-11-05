#!/bin/bash

# Smart Summary App - Fly.io Deployment Script
# This script automates the deployment of backend and frontend to Fly.io

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_APP="smart-summary-backend"
FRONTEND_APP="smart-summary-frontend"
DATABASE_APP="smart-summary-db"
REGION="gru"

# Functions
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_step() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check_fly_cli() {
    if ! command -v fly &> /dev/null; then
        print_error "Fly.io CLI is not installed"
        echo "Install it with: curl -L https://fly.io/install.sh | sh"
        exit 1
    fi
    print_success "Fly.io CLI is installed"
}

check_auth() {
    if ! fly auth whoami &> /dev/null; then
        print_error "Not authenticated with Fly.io"
        echo "Run: fly auth login"
        exit 1
    fi
    print_success "Authenticated with Fly.io"
}

create_database() {
    print_step "Creating PostgreSQL Database"
    
    if fly apps list | grep -q "^${DATABASE_APP}$"; then
        print_warning "Database ${DATABASE_APP} already exists"
        read -p "Do you want to use the existing database? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Please delete the existing database first or use a different name"
            exit 1
        fi
        return
    fi
    
    print_info "Creating database ${DATABASE_APP} in region ${REGION}..."
    fly postgres create --name "${DATABASE_APP}" --region "${REGION}" --vm-size shared-cpu-1x --volume-size 10
    
    print_success "Database created successfully"
    print_info "Save the connection details shown above!"
    
    echo ""
    read -p "Enter the database password (shown above): " DB_PASSWORD
    read -p "Enter the database connection string (shown above): " DB_CONNECTION_STRING
    
    if [ -z "$DB_PASSWORD" ] || [ -z "$DB_CONNECTION_STRING" ]; then
        print_error "Database password and connection string are required"
        exit 1
    fi
    
    export DB_PASSWORD
    export DB_CONNECTION_STRING
    print_success "Database credentials saved"
}

deploy_backend() {
    print_step "Deploying Backend"
    
    # Ensure fly.toml exists with correct configuration
    if [ ! -f "apps/backend/fly.toml" ]; then
        print_error "fly.toml not found at apps/backend/fly.toml"
        exit 1
    fi
    
    # Check if app exists, if not create it
    if ! fly apps list | grep -q "^${BACKEND_APP}$"; then
        print_info "Creating backend app..."
        fly apps create "${BACKEND_APP}" || true
    fi
    
    # Generate API key if not provided
    if [ -z "$API_KEY" ]; then
        print_info "Generating API key..."
        API_KEY=$(openssl rand -hex 32)
        export API_KEY
        print_success "API key generated: ${API_KEY}"
        print_warning "Save this API key for frontend deployment!"
    fi
    
    # Set secrets
    print_info "Setting backend secrets..."
    
    if [ -z "$DB_CONNECTION_STRING" ]; then
        read -p "Enter database connection string: " DB_CONNECTION_STRING
    fi
    
    if [ -z "$OPENROUTER_API_KEY" ]; then
        if [ -n "${OPENROUTER_API_KEY:-}" ]; then
            OPENROUTER_API_KEY="${OPENROUTER_API_KEY}"
        else
            read -p "Enter OpenRouter API key: " OPENROUTER_API_KEY
        fi
    fi
    
    if [ -z "$OPENROUTER_DEFAULT_MODEL" ]; then
        if [ -n "${OPENROUTER_DEFAULT_MODEL:-}" ]; then
            OPENROUTER_DEFAULT_MODEL="${OPENROUTER_DEFAULT_MODEL}"
        else
            OPENROUTER_DEFAULT_MODEL="openai/gpt-4o-mini"
        fi
    fi
    
    if [ -z "$ALLOWED_ORIGINS" ]; then
        if [ -n "${ALLOWED_ORIGINS:-}" ]; then
            ALLOWED_ORIGINS="${ALLOWED_ORIGINS}"
        else
            ALLOWED_ORIGINS="https://${FRONTEND_APP}.fly.dev"
        fi
    fi
    
    # Optional OpenAI secrets
    if [ -n "${OPENAI_API_KEY:-}" ]; then
        fly secrets set \
            OPENAI_API_KEY="${OPENAI_API_KEY}" \
            -a "${BACKEND_APP}"
    fi
    
    if [ -n "${OPENAI_DEFAULT_MODEL:-}" ]; then
        fly secrets set \
            OPENAI_DEFAULT_MODEL="${OPENAI_DEFAULT_MODEL}" \
            -a "${BACKEND_APP}"
    fi
    
    fly secrets set \
        DATABASE_URL="${DB_CONNECTION_STRING}" \
        API_KEY="${API_KEY}" \
        OPENROUTER_API_KEY="${OPENROUTER_API_KEY}" \
        OPENROUTER_DEFAULT_MODEL="${OPENROUTER_DEFAULT_MODEL}" \
        ALLOWED_ORIGINS="${ALLOWED_ORIGINS}" \
        NODE_ENV="production" \
        -a "${BACKEND_APP}"
    
    print_success "Backend secrets configured"
    
    # Deploy from root directory (context = '.')
    print_info "Deploying backend from root directory..."
    # Ensure we're in the root directory (already set by main function)
    fly deploy --config apps/backend/fly.toml -a "${BACKEND_APP}"
    
    print_success "Backend deployed successfully"
    
    # Get backend URL
    BACKEND_URL=$(fly status -a "${BACKEND_APP}" | grep "Hostname" | awk '{print $2}' || echo "https://${BACKEND_APP}.fly.dev")
    export BACKEND_URL
    
    print_info "Backend URL: ${BACKEND_URL}"
}

run_migrations() {
    print_step "Running Database Migrations"
    
    print_info "Running migrations..."
    
    # Run migrations via SSH
    fly ssh console -a "${BACKEND_APP}" -C "cd /app/apps/backend && pnpm --filter @smart-summary/backend migration:run" || {
        print_warning "Migration command failed, trying alternative method..."
        fly ssh console -a "${BACKEND_APP}" << 'EOF'
cd /app/apps/backend
pnpm --filter @smart-summary/backend migration:run
exit
EOF
    }
    
    print_success "Migrations completed"
}

verify_backend() {
    print_step "Verifying Backend Deployment"
    
    if [ -z "$BACKEND_URL" ]; then
        BACKEND_URL="https://${BACKEND_APP}.fly.dev"
    fi
    
    print_info "Checking health endpoint: ${BACKEND_URL}/api/health"
    
    if curl -f -s "${BACKEND_URL}/api/health" > /dev/null; then
        print_success "Backend is healthy"
    else
        print_warning "Backend health check failed, but deployment may still be in progress"
    fi
}

deploy_frontend() {
    print_step "Deploying Frontend"
    
    # Ensure fly.toml exists with correct configuration
    if [ ! -f "apps/frontend/fly.toml" ]; then
        print_error "fly.toml not found at apps/frontend/fly.toml"
        exit 1
    fi
    
    # Check if app exists, if not create it
    if ! fly apps list | grep -q "^${FRONTEND_APP}$"; then
        print_info "Creating frontend app..."
        fly apps create "${FRONTEND_APP}" || true
    fi
    
    # Set secrets
    print_info "Setting frontend secrets..."
    
    if [ -z "$BACKEND_URL" ]; then
        BACKEND_URL="https://${BACKEND_APP}.fly.dev"
    fi
    
    if [ -z "$API_KEY" ]; then
        read -p "Enter API key (same as backend): " API_KEY
    fi
    
    if [ -z "$FRONTEND_URL" ]; then
        FRONTEND_URL="https://${FRONTEND_APP}.fly.dev"
    fi
    
    fly secrets set \
        API_URL="${BACKEND_URL}" \
        API_KEY="${API_KEY}" \
        NEXT_PUBLIC_SITE_URL="${FRONTEND_URL}" \
        NODE_ENV="production" \
        -a "${FRONTEND_APP}"
    
    print_success "Frontend secrets configured"
    
    # Deploy from root directory (context = '.')
    print_info "Deploying frontend from root directory..."
    # Ensure we're in the root directory (already set by main function)
    fly deploy --config apps/frontend/fly.toml -a "${FRONTEND_APP}"
    
    print_success "Frontend deployed successfully"
    
    print_info "Frontend URL: ${FRONTEND_URL}"
}

update_backend_cors() {
    print_step "Updating Backend CORS Configuration"
    
    if [ -z "$FRONTEND_URL" ]; then
        FRONTEND_URL="https://${FRONTEND_APP}.fly.dev"
    fi
    
    print_info "Updating ALLOWED_ORIGINS to include ${FRONTEND_URL}"
    
    fly secrets set \
        ALLOWED_ORIGINS="${FRONTEND_URL}" \
        -a "${BACKEND_APP}"
    
    print_success "CORS configuration updated"
}

# Main menu
show_menu() {
    echo ""
    echo "Smart Summary App - Fly.io Deployment"
    echo "======================================"
    echo ""
    echo "1. Full deployment (database + backend + frontend)"
    echo "2. Create database only"
    echo "3. Deploy backend only"
    echo "4. Deploy frontend only"
    echo "5. Run migrations only"
    echo "6. Update backend CORS"
    echo "7. Exit"
    echo ""
}

# Main execution
main() {
    # Ensure script runs from project root
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    cd "$SCRIPT_DIR" || exit 1
    
    print_step "Pre-deployment Checks"
    check_fly_cli
    check_auth
    
    # Show menu
    show_menu
    read -p "Select an option (1-7): " choice
    
    case $choice in
        1)
            create_database
            deploy_backend
            run_migrations
            verify_backend
            deploy_frontend
            update_backend_cors
            print_step "Deployment Complete!"
            print_success "Backend: https://${BACKEND_APP}.fly.dev"
            print_success "Frontend: https://${FRONTEND_APP}.fly.dev"
            ;;
        2)
            create_database
            ;;
        3)
            if [ -z "$DB_CONNECTION_STRING" ]; then
                read -p "Enter database connection string: " DB_CONNECTION_STRING
            fi
            deploy_backend
            run_migrations
            verify_backend
            ;;
        4)
            deploy_frontend
            ;;
        5)
            run_migrations
            ;;
        6)
            update_backend_cors
            ;;
        7)
            print_info "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid option"
            exit 1
            ;;
    esac
}

# Run main function
main

