#!/usr/bin/env bash
set -euo pipefail

#
# CMS (Superdesk) — CI/CD update script
# Pulls latest code, rebuilds what changed, restarts services.
# Run as: the app user (e.g. ubuntu)
#
# Environment variables (all optional, sensible defaults):
#   DEPLOY_DIR    — app root           (default: /opt/cms)
#   REPO_REF      — branch or tag      (default: cp30.1)
#   FORCE_REBUILD — set to "true" to force full rebuild
#   NODE_MAX_MEM  — Node.js heap MB    (default: 4096)
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load deploy env file if present (written by justfile push)
[[ -f "${SCRIPT_DIR}/../deploy.env" ]] && source "${SCRIPT_DIR}/../deploy.env"

APP_NAME="${APP_NAME:-cms}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/${APP_NAME}}"
SERVER_DIR="${DEPLOY_DIR}/server"
CLIENT_DIR="${DEPLOY_DIR}/client"
ENV_FILE="${ENV_FILE:-/etc/${APP_NAME}/env}"
# REPO_REF accepts a branch or a release tag (e.g. cp30.1); REPO_BRANCH is a back-compat alias
REPO_REF="${REPO_REF:-${REPO_BRANCH:-cp30.1}}"
REQUIREMENTS_FILE="${REQUIREMENTS_FILE:-requirements.txt}"
PYTHON_VERSION="${PYTHON_VERSION:-3.10}"
NODE_VERSION="${NODE_VERSION:-22}"
USE_PNPM="${USE_PNPM:-false}"
USE_UV="${USE_UV:-false}"
FORCE_REBUILD="${FORCE_REBUILD:-false}"
NODE_MAX_MEM="${NODE_MAX_MEM:-4096}"

# Timing (set TIMING=true to enable per-step timing)
TIMING="${TIMING:-false}"
DEPLOY_START="${EPOCHSECONDS:-$(date +%s)}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }

# Run a function/command and print elapsed time if TIMING=true
time_step() {
    local label="$1"
    shift
    if [[ "$TIMING" == "true" ]]; then
        local start=${EPOCHSECONDS:-$(date +%s)}
        "$@"
        local end=${EPOCHSECONDS:-$(date +%s)}
        echo -e "${BLUE}[TIME]${NC} ${label}: $((end - start))s"
    else
        "$@"
    fi
}

# ============================================================================
# Steps
# ============================================================================

preflight() {
    [[ -f "$ENV_FILE" ]] || { log_error "Environment file not found: $ENV_FILE — run the full deploy first"; exit 1; }
    set -a && source "$ENV_FILE" && set +a
}

pull_code() {
    log_info "Pulling latest code (ref: $REPO_REF)..."
    PREV_COMMIT=$(git -C "$DEPLOY_DIR" rev-parse HEAD)
    git -C "$DEPLOY_DIR" fetch --prune --tags --force origin

    # Tags have no origin/<ref> tracking ref — handle tag vs branch separately
    if git -C "$DEPLOY_DIR" rev-parse -q --verify "refs/tags/${REPO_REF}" >/dev/null; then
        git -C "$DEPLOY_DIR" checkout --force "tags/${REPO_REF}"
    else
        git -C "$DEPLOY_DIR" checkout --force -B "$REPO_REF" "origin/${REPO_REF}"
    fi
    NEW_COMMIT=$(git -C "$DEPLOY_DIR" rev-parse HEAD)

    if [[ "$PREV_COMMIT" == "$NEW_COMMIT" && "$FORCE_REBUILD" != "true" ]]; then
        log_info "Already up to date at ${NEW_COMMIT:0:7}. Nothing to deploy."
        exit 0
    fi

    log_info "Updating ${PREV_COMMIT:0:7} → ${NEW_COMMIT:0:7}"
}

detect_changes() {
    SERVER_CHANGED=false
    CLIENT_CHANGED=false

    if [[ "$FORCE_REBUILD" == "true" ]]; then
        SERVER_CHANGED=true
        CLIENT_CHANGED=true
    else
        CHANGED_FILES=$(git -C "$DEPLOY_DIR" diff --name-only "$PREV_COMMIT" "$NEW_COMMIT")

        echo "$CHANGED_FILES" | grep -q "^server/" && SERVER_CHANGED=true || true
        echo "$CHANGED_FILES" | grep -q "^client/" && CLIENT_CHANGED=true || true

        if [[ "$SERVER_CHANGED" == "false" && "$CLIENT_CHANGED" == "false" ]]; then
            SERVER_CHANGED=true
            CLIENT_CHANGED=true
        fi
    fi

    log_info "Rebuild scope: server=$SERVER_CHANGED client=$CLIENT_CHANGED"
}

update_server() {
    if [[ "$SERVER_CHANGED" == "true" ]]; then
        log_info "Updating Python dependencies..."
        cd "$SERVER_DIR"

        local_req="$REQUIREMENTS_FILE"
        [[ -f "$local_req" ]] || { log_error "Requirements file not found: $SERVER_DIR/$local_req"; exit 1; }

        if [[ "$USE_UV" == "true" ]]; then
            export PATH="$HOME/.local/bin:$PATH"
            uv pip install --python env/bin/python -r "$local_req"
        else
            source env/bin/activate
            pip install --quiet --upgrade pip wheel setuptools
            pip install --quiet -r "$local_req"
        fi

        log_info "Running initialize_data..."
        source env/bin/activate
        python3 manage.py app:initialize_data || log_warn "initialize_data had partial failures"
        deactivate

        log_success "Server updated"
    else
        log_info "Skipping server (no changes)"
    fi
}

install_pnpm() {
    if ! command -v pnpm &>/dev/null; then
        log_info "Installing pnpm + Node.js ${NODE_VERSION}..."
        export PNPM_HOME="$HOME/.local/share/pnpm"
        curl -fsSL https://get.pnpm.io/install.sh | ENV="/dev/null" SHELL="$(which bash)" sh -
        export PATH="$PNPM_HOME:$PATH"
        pnpm env use --global "${NODE_VERSION}"
    fi
}

rebuild_frontend() {
    if [[ "$CLIENT_CHANGED" == "true" ]]; then
        log_info "Rebuilding frontend (NODE_MAX_MEM=${NODE_MAX_MEM}MB)..."
        cd "$CLIENT_DIR"
        export NODE_OPTIONS="--max-old-space-size=${NODE_MAX_MEM}"
        if [[ "$USE_PNPM" == "true" ]]; then
            install_pnpm
            pnpm import 2>/dev/null || true
            pnpm install --frozen-lockfile --shamefully-hoist
            pnpm run build
        else
            npm ci
            npm run build
        fi
        log_success "Frontend rebuilt"
    else
        log_info "Skipping frontend (no changes)"
    fi
}

restart_service() {
    log_info "Restarting ${APP_NAME}..."
    trap - ERR
    sudo systemctl restart "${APP_NAME}.service"
    sleep 3

    if systemctl is-active --quiet "${APP_NAME}.service"; then
        log_success "Deployment complete! Commit: ${NEW_COMMIT:0:7}"
    else
        log_error "${APP_NAME} failed to start"
        sudo journalctl -u "${APP_NAME}" --no-pager -n 20
        exit 1
    fi
}

# ============================================================================
# Main
# ============================================================================

time_step "Preflight"        preflight
time_step "Pull code"        pull_code

# Rollback on failure
rollback() {
    log_error "Deploy failed — rolling back to ${PREV_COMMIT:0:7}"
    git -C "$DEPLOY_DIR" reset --hard "$PREV_COMMIT"
    sudo systemctl restart "${APP_NAME}.service" || true
}
trap rollback ERR

time_step "Detect changes"   detect_changes
time_step "Update server"    update_server
time_step "Rebuild frontend" rebuild_frontend
time_step "Restart service"  restart_service

if [[ "$TIMING" == "true" ]]; then
    total=$(( ${EPOCHSECONDS:-$(date +%s)} - DEPLOY_START ))
    echo -e "${BLUE}[TIME]${NC} Total: ${total}s"
fi
