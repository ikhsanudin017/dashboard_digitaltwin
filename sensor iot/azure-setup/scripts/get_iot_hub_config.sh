#!/bin/bash

# Script untuk mendapatkan IoT Hub Connection String dan konfigurasi
set -e

echo "=========================================="
echo "Get Azure IoT Hub Connection Strings"
echo "=========================================="
echo ""

IOT_HUB_NAME="iothub-energymonitor-ef753d74"
DEVICE_ID="ESP32_DHT11_Sensor"

echo "📋 Configuration:"
echo "  IoT Hub: $IOT_HUB_NAME"
echo "  Device ID: $DEVICE_ID"
echo ""

# Get Event Hub-compatible connection string for Azure Function
echo "🔑 Getting Event Hub-compatible connection string (for Azure Function)..."
EVENT_HUB_CONNECTION_STRING=$(az iot hub connection-string show \
  --hub-name $IOT_HUB_NAME \
  --policy-name service \
  --query connectionString -o tsv)

echo "✅ Event Hub connection string retrieved"
echo ""

# Get Device connection string (untuk ESP32, jika perlu)
echo "🔑 Getting Device connection string (for ESP32)..."
DEVICE_CONNECTION_STRING=$(az iot hub device-identity connection-string show \
  --hub-name $IOT_HUB_NAME \
  --device-id $DEVICE_ID \
  --query connectionString -o tsv)

echo "✅ Device connection string retrieved"
echo ""

# Parse device credentials
DEVICE_KEY=$(echo $DEVICE_CONNECTION_STRING | grep -o 'SharedAccessKey=[^;]*' | cut -d'=' -f2)

echo "=========================================="
echo "✅ CONNECTION STRINGS"
echo "=========================================="
echo ""
echo "📌 UNTUK AZURE FUNCTION APP SETTINGS:"
echo "----------------------------------------"
echo ""
echo "IOT_HUB_CONNECTION_STRING=$EVENT_HUB_CONNECTION_STRING"
echo ""
echo "=========================================="
echo ""
echo "📌 UNTUK ESP32 (sudah dikonfigurasi di main.cpp):"
echo "----------------------------------------"
echo ""
echo "IoT Hub Name: $IOT_HUB_NAME"
echo "Device ID: $DEVICE_ID"
echo "Device Key: $DEVICE_KEY"
echo ""
echo "=========================================="
echo ""
echo "📋 LANGKAH DEPLOYMENT:"
echo "=========================================="
echo ""
echo "1. Set Function App Settings:"
echo ""
echo "   az functionapp config appsettings set \\"
echo "     --name <YOUR_FUNCTION_APP_NAME> \\"
echo "     --resource-group <YOUR_RESOURCE_GROUP> \\"
echo "     --settings \"IOT_HUB_CONNECTION_STRING=$EVENT_HUB_CONNECTION_STRING\""
echo ""
echo "2. Deploy Azure Function:"
echo ""
echo "   cd sensor iot/azure-setup/azure-function"
echo "   func azure functionapp publish <YOUR_FUNCTION_APP_NAME>"
echo ""
echo "3. Upload ESP32 code:"
echo ""
echo "   cd sensor iot"
echo "   platformio run --target upload"
echo ""
echo "4. Test IoT Hub messages:"
echo ""
echo "   az iot hub monitor-events \\"
echo "     --hub-name $IOT_HUB_NAME \\"
echo "     --device-id $DEVICE_ID"
echo ""
echo "=========================================="
echo ""

# Save to file
OUTPUT_FILE="/Users/macbookpro/Desktop/dashboard_digitaltwin/sensor iot/azure-setup/iot_hub_config.txt"
cat > "$OUTPUT_FILE" << EOF
# Azure IoT Hub Configuration
# Generated: $(date)

========================================
AZURE FUNCTION APP SETTINGS
========================================

IOT_HUB_CONNECTION_STRING=$EVENT_HUB_CONNECTION_STRING

========================================
ESP32 CONFIGURATION (Already in main.cpp)
========================================

IoT Hub Name: $IOT_HUB_NAME
Device ID: $DEVICE_ID  
Device Key: $DEVICE_KEY

========================================
FULL CONNECTION STRINGS
========================================

Event Hub Connection String (for Function):
$EVENT_HUB_CONNECTION_STRING

Device Connection String (for ESP32):
$DEVICE_CONNECTION_STRING

EOF

echo "💾 Configuration saved to: $OUTPUT_FILE"
echo ""
