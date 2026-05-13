#!/bin/bash
# Quick install Grafana on RPi - Run this script locally
# Usage: ./install_on_rpi.sh

set -e

RPI_HOST="digitaltwin@192.168.1.7"
RPI_IP="192.168.1.7"
RPI_PASSWORD="digitaltwin"

echo "=========================================="
echo "  Grafana Installation on RPi"
echo "=========================================="

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo "Installing sshpass..."
    brew install sshpass 2>/dev/null || echo "Run: brew install sshpass"
fi

# Test connection first
echo "[0/4] Testing SSH connection..."
if sshpass -p "${RPI_PASSWORD}" ssh -o StrictHostKeyChecking=no ${RPI_HOST} "echo 'SSH OK'" 2>/dev/null; then
    echo "SSH connection successful!"
else
    echo "SSH failed. Check password/connection."
    exit 1
fi

# Copy scripts to RPi
echo "[1/4] Copying scripts to RPi..."
sshpass -p "${RPI_PASSWORD}" ssh ${RPI_HOST} "mkdir -p /mnt/storage/grafana" 2>/dev/null
sshpass -p "${RPI_PASSWORD}" scp -o StrictHostKeyChecking=no \
    /Users/macbookpro/Desktop/dashboard_digitaltwin/raspberry_pi/install_grafana.sh \
    /Users/macbookpro/Desktop/dashboard_digitaltwin/raspberry_pi/setup_grafana_provisioning.sh \
    /Users/macbookpro/Desktop/dashboard_digitaltwin/raspberry_pi/systemd/grafana-override.conf \
    /Users/macbookpro/Desktop/dashboard_digitaltwin/raspberry_pi/grafana_dashboards/rpi_health_dashboard.json \
    ${RPI_HOST}:/mnt/storage/grafana/

# Make scripts executable
echo "[2/4] Setting permissions..."
sshpass -p "${RPI_PASSWORD}" ssh ${RPI_HOST} "chmod +x /mnt/storage/grafana/*.sh"

# Run install script
echo "[3/4] Installing Grafana (this may take a few minutes)..."
sshpass -p "${RPI_PASSWORD}" ssh -t -o StrictHostKeyChecking=no ${RPI_HOST} \
    "echo '${RPI_PASSWORD}' | sudo -S /mnt/storage/grafana/install_grafana.sh"

echo "[4/4] Setup datasource & dashboard..."
sshpass -p "${RPI_PASSWORD}" ssh -t -o StrictHostKeyChecking=no ${RPI_HOST} \
    "echo '${RPI_PASSWORD}' | sudo -S /mnt/storage/grafana/setup_grafana_provisioning.sh"

echo ""
echo "=========================================="
echo "  Installation Complete!"
echo "=========================================="
echo ""
echo "Grafana URL: http://${RPI_IP}:3000"
echo "Username:    admin"
echo "Password:    admin123"
echo ""
echo "Dashboard:   /mnt/storage/grafana/rpi_health_dashboard.json"
echo "=========================================="
