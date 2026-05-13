#!/bin/bash
# Grafana Installation Script for Raspberry Pi (Binary Install)
# No apt needed - direct binary download

set -e

GRAFANA_VERSION="11.2.0"
GRAFANA_PORT="3000"
INSTALL_DIR="/mnt/storage/grafana"

echo "=========================================="
echo "  Grafana Installation (Binary) for RPi"
echo "=========================================="

echo "[1/7] Creating directories..."
mkdir -p ${INSTALL_DIR}/data
mkdir -p ${INSTALL_DIR}/log
mkdir -p ${INSTALL_DIR}/plugins
mkdir -p ${INSTALL_DIR}/provisioning

echo "[2/7] Downloading Grafana binary (ARM64)..."
cd /tmp
wget -q --show-progress https://dl.grafana.com/oss/release/grafana-${GRAFANA_VERSION}.linux-arm64.tar.gz \
    -O grafana-${GRAFANA_VERSION}.linux-arm64.tar.gz
sudo mkdir -p ${INSTALL_DIR}/grafana-bin
sudo tar -xzf grafana-${GRAFANA_VERSION}.linux-arm64.tar.gz -C /tmp
sudo mv /tmp/grafana-${GRAFANA_VERSION} ${INSTALL_DIR}/grafana-bin
rm grafana-${GRAFANA_VERSION}.linux-arm64.tar.gz

echo "[3/7] Extracting Grafana..."
tar -xzf grafana-${GRAFANA_VERSION}.linux-arm64.tar.gz
mv grafana-${GRAFANA_VERSION} ${INSTALL_DIR}/grafana-bin
rm grafana-${GRAFANA_VERSION}.linux-arm64.tar.gz

echo "[4/7] Configuring Grafana..."
cat > ${INSTALL_DIR}/grafana.ini << EOF
[server]
protocol = http
http_addr = 0.0.0.0
http_port = ${GRAFANA_PORT}
domain = 0.0.0.0

[paths]
data = ${INSTALL_DIR}/data
logs = ${INSTALL_DIR}/log
plugins = ${INSTALL_DIR}/plugins
provisioning = ${INSTALL_DIR}/provisioning

[database]
type = sqlite3
path = ${INSTALL_DIR}/data/grafana.db

[security]
admin_user = admin
admin_password = admin123

[users]
allow_sign_up = false
auto_assign_org = true
auto_assign_org_role = Admin

[auth.anonymous]
enabled = true

[log]
mode = console
EOF

echo "[5/7] Creating systemd service..."
cat > /etc/systemd/system/grafana-server.service << 'EOF'
[Unit]
Description=Grafana Server
After=network.target mnt-storage.mount
Requires=mnt-storage.mount

[Service]
Type=simple
User=digitaltwin
Group=digitaltwin
ExecStart=/mnt/storage/grafana/grafana-bin/bin/grafana-server \
    --homepath=/mnt/storage/grafana/grafana-bin \
    --config=/mnt/storage/grafana/grafana.ini
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo "[6/7] Applying service override..."
cp /mnt/storage/grafana/grafana-override.conf /etc/systemd/system/grafana-server.service.d/override.conf 2>/dev/null || true

echo "[7/7] Enabling and starting Grafana..."
systemctl daemon-reload
systemctl enable grafana-server
systemctl start grafana-server

echo ""
echo "=========================================="
echo "  Grafana Installation Complete!"
echo "=========================================="
echo ""
echo "URL:      http://192.168.1.7:${GRAFANA_PORT}"
echo "Username: admin"
echo "Password: admin123"
echo ""
echo "Data directory: ${INSTALL_DIR}/data"
echo "=========================================="
