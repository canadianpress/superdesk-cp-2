#!/bin/bash
#
# System Setup Script for Superdesk CMS
# Ubuntu 22.04 LTS (Jammy Jellyfish)
# Run as: sudo ./setup-cms-system.sh
#
# Versions (matching superdesk/superdesk-cp cp30 async stack):
#   Python 3.10   (ships with Ubuntu 22.04)
#   Node.js 22    (via NodeSource)
#   MongoDB 6.0   (optional — skip with INSTALL_MONGODB=false)
#   ES 7.x        (7.17.x)
#   Redis latest
#

set -euo pipefail

# Suppress needrestart prompts during apt operations
export NEEDRESTART_MODE=a
export DEBIAN_FRONTEND=noninteractive

# Script directory (templates are one level up)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load setup env file if present (written by justfile push)
[[ -f "${SCRIPT_DIR}/../setup.env" ]] && source "${SCRIPT_DIR}/../setup.env"

# Versions
NODE_VERSION="${NODE_VERSION:-22}"
MONGO_VERSION="${MONGO_VERSION:-6.0}"

# Set INSTALL_MONGODB=false to skip the local MongoDB install
# (e.g. when using an external cluster such as MongoDB Atlas)
INSTALL_MONGODB="${INSTALL_MONGODB:-true}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

apt_update() { apt-get update -qq > /dev/null; }
apt_install() { apt-get install -y -qq "$@" > /dev/null; }
apt_upgrade() { apt-get upgrade -y -qq > /dev/null; }

# Add a signed apt repo: add_repo <gpg_key_url> <keyring_name> <repo_line>
add_repo() {
    local key_url="$1" keyring="/usr/share/keyrings/$2.gpg" repo_line="$3"
    curl -fsSL "$key_url" | gpg --dearmor --yes -o "$keyring"
    echo "$repo_line" | tee "/etc/apt/sources.list.d/$2.list" > /dev/null
    apt_update
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root (use sudo)"
    exit 1
fi

# Verify Ubuntu 22.04
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    if [[ "$VERSION_ID" != "22.04" ]]; then
        log_warn "This script targets Ubuntu 22.04, detected: $PRETTY_NAME"
    fi
fi

log_info "Starting system setup for Superdesk CMS..."

# ============================================================================
# System Packages
# ============================================================================
log_info "Updating system packages..."
apt_update
apt_upgrade

log_info "Installing base utilities..."
apt_install \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    build-essential \
    pkg-config \
    libffi-dev \
    software-properties-common \
    dos2unix \
    unzip \
    language-pack-en

# ============================================================================
# Python 3.10 (ships with Ubuntu 22.04)
# ============================================================================
log_info "Installing Python 3.10..."
apt_install \
    python3 \
    python3-dev \
    python3-pip \
    python3-venv \
    python3.10-venv

# Python C library dependencies (superdesk server requirements)
log_info "Installing Python library dependencies..."
apt_install \
    libxml2-dev \
    libxslt1-dev \
    libjpeg8-dev \
    libtiff5-dev \
    zlib1g-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libwebp-dev \
    libfontconfig1-dev \
    libssl-dev \
    libxmlsec1-dev \
    libxmlsec1-openssl \
    libmagic-dev \
    libexempi8 \
    libimage-exiftool-perl

log_success "Python $(python3 --version 2>&1)"

# ============================================================================
# Node.js 22 + grunt (superdesk client toolchain)
# ============================================================================
log_info "Installing Node.js ${NODE_VERSION}..."
add_repo "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" \
    "nodesource" \
    "deb [signed-by=/usr/share/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_VERSION}.x nodistro main"
apt_install nodejs

log_info "Installing grunt-cli..."
npm install -g grunt-cli > /dev/null 2>&1

log_success "Node.js $(node --version), npm $(npm --version), grunt $(grunt --version 2>&1 | head -1)"

# ============================================================================
# Nginx
# ============================================================================
log_info "Installing Nginx..."
apt_install nginx
log_success "Nginx"

# ============================================================================
# MongoDB 6.0 (skipped when INSTALL_MONGODB=false — e.g. using Atlas)
# ============================================================================
if [[ "$INSTALL_MONGODB" == "true" ]]; then
    log_info "Installing MongoDB ${MONGO_VERSION}..."
    add_repo "https://pgp.mongodb.com/server-${MONGO_VERSION}.asc" \
        "mongodb-org-${MONGO_VERSION}" \
        "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-org-${MONGO_VERSION}.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/${MONGO_VERSION} multiverse"
    apt_install mongodb-org

    systemctl start mongod || log_warn "MongoDB may already be running"
    systemctl enable mongod

    # Auto-restart on failure (e.g. OOM kill)
    mkdir -p /etc/systemd/system/mongod.service.d
    cat > /etc/systemd/system/mongod.service.d/override.conf <<EOF
[Service]
Restart=on-failure
RestartSec=5
EOF

    log_success "MongoDB $(mongod --version 2>&1 | head -1)"
else
    log_info "Skipping MongoDB install (INSTALL_MONGODB=false) — using an external cluster"
fi

# ============================================================================
# Elasticsearch 7.x
# ============================================================================
log_info "Installing Elasticsearch 7.x..."
add_repo "https://artifacts.elastic.co/GPG-KEY-elasticsearch" \
    "elastic-7.x" \
    "deb [signed-by=/usr/share/keyrings/elastic-7.x.gpg] https://artifacts.elastic.co/packages/7.x/apt stable main"
apt_install elasticsearch

systemctl daemon-reload
systemctl start elasticsearch || log_warn "Elasticsearch may already be running"
systemctl enable elasticsearch

# Auto-restart on failure (e.g. OOM kill)
mkdir -p /etc/systemd/system/elasticsearch.service.d
cat > /etc/systemd/system/elasticsearch.service.d/override.conf <<EOF
[Service]
Restart=on-failure
RestartSec=5
EOF

log_success "Elasticsearch 7.x"

# ============================================================================
# Redis
# ============================================================================
log_info "Installing Redis..."
apt_install redis-server

systemctl restart redis-server
systemctl enable redis-server

# Auto-restart on failure (e.g. OOM kill)
mkdir -p /etc/systemd/system/redis-server.service.d
cat > /etc/systemd/system/redis-server.service.d/override.conf <<EOF
[Service]
Restart=on-failure
RestartSec=5
EOF

systemctl daemon-reload
log_success "Redis"

# ============================================================================
# Swap (prevents OOM kills during frontend builds)
# ============================================================================
SWAP_SIZE="${SWAP_SIZE:-4G}"
if [[ ! -f /swapfile ]]; then
    log_info "Creating ${SWAP_SIZE} swap file..."
    fallocate -l "$SWAP_SIZE" /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    log_success "Swap enabled (${SWAP_SIZE})"
else
    log_info "Swap file already exists"
fi

# ============================================================================
# System Tuning (idempotent)
# ============================================================================
log_info "Applying system tuning..."

if ! grep -q "^vm.max_map_count=262144" /etc/sysctl.conf 2>/dev/null; then
    echo "vm.max_map_count=262144" >> /etc/sysctl.conf
fi
sysctl -w vm.max_map_count=262144 > /dev/null

if ! grep -q "^fs.inotify.max_user_watches=524288" /etc/sysctl.conf 2>/dev/null; then
    echo "fs.inotify.max_user_watches=524288" >> /etc/sysctl.conf
fi
sysctl -w fs.inotify.max_user_watches=524288 > /dev/null

if ! grep -q "soft nofile 65536" /etc/security/limits.conf 2>/dev/null; then
    cat >> /etc/security/limits.conf <<EOF
* soft nofile 65536
* hard nofile 65536
EOF
fi

# Disable rsyslog (superdesk uses its own logging)
systemctl disable rsyslog 2>/dev/null || true
systemctl stop rsyslog 2>/dev/null || true

# Set locale
locale-gen en_US.UTF-8 > /dev/null 2>&1 || true

# ============================================================================
# Verify Services
# ============================================================================
log_info "Waiting for services..."
sleep 5

if [[ "$INSTALL_MONGODB" == "true" ]]; then
    if systemctl is-active --quiet mongod; then
        log_success "MongoDB is running"
    else
        log_error "MongoDB is not running"
    fi
fi

log_info "Waiting for Elasticsearch..."
for i in {1..60}; do
    if curl -s http://127.0.0.1:9200 >/dev/null 2>&1; then
        log_success "Elasticsearch is running"
        break
    fi
    if [[ $i -eq 60 ]]; then
        log_error "Elasticsearch failed to start within 60s"
    fi
    sleep 1
done

if systemctl is-active --quiet redis-server; then
    log_success "Redis is running"
else
    log_error "Redis is not running"
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
log_success "System setup complete!"
echo ""
log_info "  Python:        $(python3 --version 2>&1)"
log_info "  Node.js:       $(node --version)"
log_info "  npm:           $(npm --version)"
if [[ "$INSTALL_MONGODB" == "true" ]]; then
    log_info "  MongoDB:       $(mongod --version 2>&1 | head -1)"
else
    log_info "  MongoDB:       external (local install skipped)"
fi
log_info "  Elasticsearch: $(curl -s http://127.0.0.1:9200 | grep -oP '"number"\s*:\s*"\K[^"]+' 2>/dev/null || echo 'starting...')"
log_info "  Redis:         $(redis-server --version | grep -oP 'v=\S+')"
log_info "  Nginx:         $(nginx -v 2>&1)"
echo ""
log_info "Next: run services/cms.sh as the ubuntu user"
