#!/bin/bash
# Grafana Datasource & Dashboard Provisioning Script
# Run AFTER Grafana is installed and running
# Run as: chmod +x setup_grafana_provisioning.sh && ./setup_grafana_provisioning.sh

set -e

GRAFANA_URL="http://localhost:3000"
GRAFANA_USER="admin"
GRAFANA_PASSWORD="admin123"
INFLUXDB_URL="http://localhost:8086"
INFLUXDB_ORG="digitaltwin"
INFLUXDB_BUCKET="sensor_data"

echo "=========================================="
echo "  Grafana Datasource & Dashboard Setup"
echo "=========================================="

# Wait for Grafana to be ready
echo "[1/5] Waiting for Grafana to start..."
for i in {1..30}; do
    if curl -s "${GRAFANA_URL}/api/health" > /dev/null 2>&1; then
        echo "Grafana is ready!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 2
done

echo "[2/5] Creating provisioning directories..."
mkdir -p /etc/grafana/provisioning/datasources
mkdir -p /etc/grafana/provisioning/dashboards

echo "[3/5] Creating InfluxDB datasource configuration..."
cat > /etc/grafana/provisioning/datasources/influxdb.yml << EOF
apiVersion: 1

datasources:
  - name: InfluxDB
    type: influxdb
    access: proxy
    url: ${INFLUXDB_URL}
    jsonData:
      httpMode: GET
      organization: ${INFLUXDB_ORG}
      bucket: ${INFLUXDB_BUCKET}
      version: Flux
EOF

echo "[4/5] Creating dashboard provisioning configuration..."
cat > /etc/grafana/provisioning/dashboards/dashboards.yml << EOF
apiVersion: 1

providers:
  - name: 'Digital Twin Dashboards'
    orgId: 1
    folder: ''
    folderUid: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
EOF

echo "[5/5] Copying dashboard JSON..."
cp /mnt/storage/grafana_dashboards/rpi_health_dashboard.json /etc/grafana/provisioning/dashboards/ 2>/dev/null || \
cp ./grafana_dashboards/rpi_health_dashboard.json /etc/grafana/provisioning/dashboards/ 2>/dev/null || \
echo "Dashboard JSON not found in expected locations, will use API import"

# Reload Grafana
echo ""
echo "Reloading Grafana configuration..."
systemctl restart grafana-server
sleep 3

# Try to import dashboard via API if file exists
DASHBOARD_FILE="/etc/grafana/provisioning/dashboards/rpi_health_dashboard.json"
if [ -f "$DASHBOARD_FILE" ]; then
    echo "Importing dashboard via API..."
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -u "${GRAFANA_USER}:${GRAFANA_PASSWORD}" \
        "${GRAFANA_URL}/api/dashboards/db" \
        -d "{\"dashboard\": $(cat "$DASHBOARD_FILE"), \"overwrite\": true}" > /dev/null 2>&1 || true
fi

echo ""
echo "=========================================="
echo "  Grafana Setup Complete!"
echo "=========================================="
echo ""
echo "URL:      ${GRAFANA_URL}"
echo "Username: ${GRAFANA_USER}"
echo "Password: ${GRAFANA_PASSWORD}"
echo ""
echo "InfluxDB Datasource:"
echo "  - Name: InfluxDB"
echo "  - URL: ${INFLUXDB_URL}"
echo "  - Org: ${INFLUXDB_ORG}"
echo "  - Bucket: ${INFLUXDB_BUCKET}"
echo ""
echo "Dashboard: rpi_health_dashboard.json"
echo "  - RPi CPU, Memory, Disk, WiFi gauges"
echo "  - CPU & Memory trend"
echo "  - CPU temperature"
echo "  - Sensor data: Suhu, Kelembaban, Daya, People Count"
echo ""
echo "=========================================="
echo ""
echo "Manual steps (if API import failed):"
echo "1. Open ${GRAFANA_URL}"
echo "2. Login with ${GRAFANA_USER}/${GRAFANA_PASSWORD}"
echo "3. Go to Connections > Data Sources"
echo "4. Click 'Add new data source'"
echo "5. Select 'InfluxDB'"
echo "6. Configure:"
echo "   - Query Language: Flux"
echo "   - URL: ${INFLUXDB_URL}"
echo "   - Organization: ${INFLUXDB_ORG}"
echo "   - Default Bucket: ${INFLUXDB_BUCKET}"
echo "7. Click 'Save & test'"
echo "8. Go to Dashboards > Import"
echo "9. Upload: /etc/grafana/provisioning/dashboards/rpi_health_dashboard.json"
echo "=========================================="
