#!/bin/bash

# Script untuk setup Azure IoT Hub untuk ESP32 Digital Twin
# Script ini akan membuat IoT Hub, device, dan mendapatkan credentials

set -e  # Exit on error

echo "=========================================="
echo "Azure IoT Hub Setup untuk ESP32"
echo "=========================================="
echo ""

# Konfigurasi
RESOURCE_GROUP="digitaltwin-rg"
LOCATION="southeastasia"
IOT_HUB_NAME="digitaltwin-hub"
DEVICE_ID="ESP32_DHT11_Sensor"

echo "📋 Konfigurasi:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  IoT Hub Name: $IOT_HUB_NAME"
echo "  Device ID: $DEVICE_ID"
echo ""

# Cek apakah Azure CLI sudah login
echo "🔐 Memeriksa Azure CLI login status..."
if ! az account show &> /dev/null; then
    echo "❌ Anda belum login ke Azure CLI"
    echo "   Jalankan: az login"
    exit 1
fi
echo "✅ Azure CLI sudah login"
echo ""

# Tampilkan subscription yang aktif
SUBSCRIPTION=$(az account show --query name -o tsv)
echo "📌 Subscription aktif: $SUBSCRIPTION"
echo ""

# Buat Resource Group (skip jika sudah ada)
echo "📦 Membuat Resource Group..."
if az group show --name $RESOURCE_GROUP &> /dev/null; then
    echo "✅ Resource Group '$RESOURCE_GROUP' sudah ada"
else
    az group create --name $RESOURCE_GROUP --location $LOCATION
    echo "✅ Resource Group '$RESOURCE_GROUP' berhasil dibuat"
fi
echo ""

# Buat IoT Hub (skip jika sudah ada)
echo "🏭 Membuat IoT Hub..."
if az iot hub show --name $IOT_HUB_NAME &> /dev/null; then
    echo "✅ IoT Hub '$IOT_HUB_NAME' sudah ada"
else
    echo "   Membuat IoT Hub dengan tier F1 (gratis)..."
    az iot hub create \
        --resource-group $RESOURCE_GROUP \
        --name $IOT_HUB_NAME \
        --sku F1 \
        --partition-count 2
    echo "✅ IoT Hub '$IOT_HUB_NAME' berhasil dibuat"
fi
echo ""

# Buat Device Identity (skip jika sudah ada)
echo "📱 Membuat Device Identity..."
if az iot hub device-identity show --hub-name $IOT_HUB_NAME --device-id $DEVICE_ID &> /dev/null; then
    echo "✅ Device '$DEVICE_ID' sudah ada"
else
    az iot hub device-identity create \
        --hub-name $IOT_HUB_NAME \
        --device-id $DEVICE_ID
    echo "✅ Device '$DEVICE_ID' berhasil dibuat"
fi
echo ""

# Dapatkan Connection String
echo "🔑 Mendapatkan Device Connection String..."
CONNECTION_STRING=$(az iot hub device-identity connection-string show \
    --hub-name $IOT_HUB_NAME \
    --device-id $DEVICE_ID \
    --query connectionString -o tsv)

# Parse connection string untuk mendapatkan components
IOT_HUB_HOSTNAME=$(echo $CONNECTION_STRING | grep -o 'HostName=[^;]*' | cut -d'=' -f2)
DEVICE_ID_PARSED=$(echo $CONNECTION_STRING | grep -o 'DeviceId=[^;]*' | cut -d'=' -f2)
DEVICE_KEY=$(echo $CONNECTION_STRING | grep -o 'SharedAccessKey=[^;]*' | cut -d'=' -f2)

# Extract IoT Hub Name (tanpa .azure-devices.net)
IOT_HUB_NAME_ONLY=$(echo $IOT_HUB_HOSTNAME | cut -d'.' -f1)

echo ""
echo "=========================================="
echo "✅ SETUP BERHASIL!"
echo "=========================================="
echo ""
echo "📝 CREDENTIALS UNTUK ESP32:"
echo "=========================================="
echo ""
echo "IoT Hub Name: $IOT_HUB_NAME_ONLY"
echo "Device ID: $DEVICE_ID_PARSED"
echo "Device Key: $DEVICE_KEY"
echo ""
echo "=========================================="
echo ""
echo "📋 LANGKAH SELANJUTNYA:"
echo "=========================================="
echo ""
echo "1. Buka file: sensor iot/src/main.cpp"
echo ""
echo "2. Update baris 20-22 dengan nilai berikut:"
echo ""
echo "   const char* iotHubName = \"$IOT_HUB_NAME_ONLY\";"
echo "   const char* deviceId = \"$DEVICE_ID_PARSED\";"
echo "   const char* deviceKey = \"$DEVICE_KEY\";"
echo ""
echo "3. Compile dan upload ke ESP32:"
echo "   platformio run --target upload"
echo ""
echo "4. Monitor serial output:"
echo "   platformio device monitor"
echo ""
echo "=========================================="
echo ""

# Simpan ke file untuk referensi
CONFIG_FILE="/Users/macbookpro/Desktop/dashboard_digitaltwin/sensor iot/azure-setup/azure_credentials.txt"
cat > "$CONFIG_FILE" << EOF
# Azure IoT Hub Credentials
# Generated: $(date)

IoT Hub Name: $IOT_HUB_NAME_ONLY
Device ID: $DEVICE_ID_PARSED
Device Key: $DEVICE_KEY

# Full Connection String:
$CONNECTION_STRING

# Copy-paste untuk main.cpp:
const char* iotHubName = "$IOT_HUB_NAME_ONLY";
const char* deviceId = "$DEVICE_ID_PARSED";
const char* deviceKey = "$DEVICE_KEY";
EOF

echo "💾 Credentials disimpan di: $CONFIG_FILE"
echo ""
