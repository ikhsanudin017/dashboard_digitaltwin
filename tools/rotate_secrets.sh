#!/usr/bin/env bash
# rotate_secrets.sh - Template to rotate compromised credentials for dashboard_digitaltwin
# WARNING: This is a helper script with placeholders. Review and run interactively.
# Prereqs: az, gh, influx (optional), jq (optional), vercel (optional) installed and authenticated.

set -euo pipefail

# ---------------------------
# Configuration - FILL THESE
# ---------------------------
SUBSCRIPTION_ID=""        # e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
RESOURCE_GROUP=""         # e.g. my-resource-group
STORAGE_ACCOUNT_NAME="stordigitaltwin2026v2"
FUNCTION_APP_NAME=""      # Function App resource name (not host name)
REPO="ikhsanudin017/dashboard_digitaltwin"
IOT_HUB_NAME=""
INFLUX_ORG="digitaltwin"
INFLUX_ADMIN_TOKEN=""     # Optional: admin token to create new tokens via CLI/UI
RPi_SSH_HOST="digitaltwin@192.168.1.8"  # RPi SSH target used to update local env (optional)
RPi_ENV_PATH="/etc/digitaltwin.env"

# ---------------------------
# Helpers
# ---------------------------
require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1. Install or authenticate before running." >&2
    return 1
  fi
}

echo "This script will assist rotating secrets. It won't delete old keys automatically in all services."
read -r -p "Continue? (y/N) " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Aborted by user."; exit 1
fi

# Optional: set Azure subscription
if [[ -n "$SUBSCRIPTION_ID" ]]; then
  require_cmd az || exit 1
  az account set --subscription "$SUBSCRIPTION_ID"
fi

# 1) Rotate Storage Account primary key and print new connection string
if [[ -n "$RESOURCE_GROUP" && -n "$STORAGE_ACCOUNT_NAME" ]]; then
  if command -v az >/dev/null 2>&1; then
    echo "Rotating storage account primary key for $STORAGE_ACCOUNT_NAME..."
    az storage account keys renew --resource-group "$RESOURCE_GROUP" --account-name "$STORAGE_ACCOUNT_NAME" --key primary || true
    echo "Retrieving new connection string..."
    NEW_CONN_STR=$(az storage account show-connection-string --resource-group "$RESOURCE_GROUP" --name "$STORAGE_ACCOUNT_NAME" -o tsv)
    echo "--- NEW AZURE_STORAGE_CONNECTION_STRING ---"
    printf "%s\n" "$NEW_CONN_STR"
  else
    echo "Azure CLI not installed; skip storage rotation." >&2
  fi
else
  echo "Skipping storage rotation: RESOURCE_GROUP or STORAGE_ACCOUNT_NAME not set." >&2
fi

# 2) Update Function App app settings (only app settings, not function host keys)
if [[ -n "$FUNCTION_APP_NAME" && -n "$NEW_CONN_STR" ]]; then
  if command -v az >/dev/null 2>&1; then
    echo "Updating Function App app settings with new connection string..."
    az functionapp config appsettings set --name "$FUNCTION_APP_NAME" --resource-group "$RESOURCE_GROUP" --settings AZURE_STORAGE_CONNECTION_STRING="$NEW_CONN_STR"
    echo "Updated Function App app settings. Note: rotate Function keys via Portal (see docs)."
  else
    echo "Azure CLI not available; cannot update Function App settings." >&2
  fi
else
  echo "Skipping Function App appsettings update (FUNCTION_APP_NAME or NEW_CONN_STR missing)."
fi

# 3) InfluxDB token rotation (if admin token provided and influx CLI available)
if [[ -n "$INFLUX_ADMIN_TOKEN" ]]; then
  if command -v influx >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
    echo "Creating new InfluxDB token for org $INFLUX_ORG..."
    export INFLUX_TOKEN="$INFLUX_ADMIN_TOKEN"
    NEW_INFLUX_TOKEN_JSON=$(influx auth create --org "$INFLUX_ORG" --description "rotated-$(date +%Y%m%d)" --read-buckets --write-buckets -o json)
    NEW_INFLUX_TOKEN=$(echo "$NEW_INFLUX_TOKEN_JSON" | jq -r '.token')
    echo "--- NEW INFLUX TOKEN ---"
    printf "%s\n" "$NEW_INFLUX_TOKEN"
    echo -n "$NEW_INFLUX_TOKEN" | gh secret set INFLUX_TOKEN --repo "$REPO" || true
    echo "Updated GitHub Actions secret INFLUX_TOKEN (if gh CLI auth present)."
  else
    echo "Influx CLI or jq not available; skipping Influx token creation." >&2
  fi
else
  echo "No INFLUX_ADMIN_TOKEN provided; skipping Influx token rotation." >&2
fi

# 4) GitHub / Vercel / CI secrets
echo "\n-- Manual actions recommended --"
echo "Rotate the following and update their values in the platforms (Portal/CLI):"
echo "- AZURE_FUNCTION_KEY (Function host/function keys): rotate in Azure Portal: Function App -> Functions -> Manage"
echo "- VITE_AZURE_FUNCTION_WRITE_KEY: update in Vercel / hosting provider"
echo "- IoT Hub / device keys: rotate in IoT Hub Portal and update device config"
echo "- Any other service-specific keys (verify README/.env.example)"

# 5) Optional: update Raspberry Pi environment and restart service (requires SSH and sudo)
if [[ -n "${NEW_INFLUX_TOKEN-}" && -n "$RPi_SSH_HOST" ]]; then
  echo "Updating RPi env at $RPi_SSH_HOST:$RPi_ENV_PATH (will append INFLUX_TOKEN)."
  ssh "$RPi_SSH_HOST" bash -s <<'SSH_EOF'
set -e
RPi_ENV_PATH="${RPi_ENV_PATH}"
# backup
sudo cp "$RPi_ENV_PATH" "$RPi_ENV_PATH.bak.$(date +%s)" || true
# remove existing INFLUX_TOKEN lines
sudo sed -i '/^INFLUX_TOKEN=/d' "$RPi_ENV_PATH" || true
# append new token (value substituted locally)
SSH_EOF
  # Append new token via ssh (safer to avoid exposing via logs)
  ssh "$RPi_SSH_HOST" "echo 'INFLUX_TOKEN=${NEW_INFLUX_TOKEN}' | sudo tee -a ${RPi_ENV_PATH} && sudo systemctl restart ml_pipeline.service || true"
  echo "RPi env updated (if ssh succeeded)."
else
  echo "Skipping RPi env update (missing NEW_INFLUX_TOKEN or RPi_SSH_HOST)."
fi

echo "\nRotation helper finished. Next steps:"
echo "1) Rotate Function keys and IoT keys via Azure Portal and revoke old keys."
echo "2) Update hosting/CI secrets (GitHub Actions, Vercel, Azure App Settings) with new values."
echo "3) Rebuild frontend and verify no secrets embedded in compiled assets."
echo "4) Run a repo secret scan (gitleaks / rg) and confirm clean state."

echo "See docs/ROTATE_SECRETS.md for detailed manual steps."
