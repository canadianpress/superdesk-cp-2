#!/usr/bin/env bash
set -euo pipefail

# Configuration (matching cms.sh defaults)
APP_NAME="${APP_NAME:-cms}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root (use sudo)"
    exit 1
fi

echo "=================================================="
log_info "Stopping Superdesk CMS application stack..."
echo "=================================================="

# 1. Stop the frontend web server proxy
log_info "Stopping Nginx routing..."
systemctl stop nginx
log_success "Nginx stopped."

# 2. Stop the core Python application stack (Honcho/API workers)
log_info "Stopping Superdesk API application service (${APP_NAME})..."
systemctl stop "${APP_NAME}.service"
log_success "Superdesk core processes stopped."

# 3. Optional: Stop local datastores 
# (Uncomment the lines below if you want a complete cold shutdown of the databases)
# echo "--------------------------------------------------"
# log_warn "Stopping datastores..."
# systemctl stop redis-server && log_success "Redis stopped."
# systemctl stop elasticsearch && log_success "Elasticsearch stopped."
# if systemctl list-unit-files | grep -q mongod; then
#     systemctl stop mongod && log_success "MongoDB stopped."
# fi

echo ""
log_success "Application stack shutdown sequence complete."