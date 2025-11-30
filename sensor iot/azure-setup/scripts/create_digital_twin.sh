#!/bin/bash
set -e

# Configuration - using existing resources
RESOURCE_GROUP="rg-digitaltwin-energymonitor"
LOCATION="southeastasia"
IOT_HUB_NAME="iothub-energymonitor-ef753d74"
STORAGE_ACCOUNT_NAME="stenergy750b783c"  # From previous run
FUNCTION_APP_NAME="func-energymonitor-c9001a7e"  # From previous run
ADT_INSTANCE_NAME="adt-energymonitor-$(openssl rand -hex 4)"
DEVICE_ID="ESP32_ENERGY_MONITOR_001"

echo "=========================================="
echo "Creating Azure Digital Twins Only"
echo "=========================================="
echo ""
echo "Using existing resources:"
echo "  IoT Hub: $IOT_HUB_NAME"
echo "  Storage: $STORAGE_ACCOUNT_NAME"
echo "  Function App: $FUNCTION_APP_NAME"
echo ""
echo "Creating new:"
echo "  Digital Twins: $ADT_INSTANCE_NAME"
echo ""

# Get IoT Hub connection string
echo "1. Getting IoT Hub connection string..."
IOT_HUB_CONNECTION_STRING=$(az iot hub connection-string show \
    --hub-name "$IOT_HUB_NAME" \
    --query connectionString -o tsv)
echo "✓ Connection string retrieved"
echo ""

# Get Device connection string
DEVICE_CONNECTION_STRING=$(az iot hub device-identity connection-string show \
    --hub-name "$IOT_HUB_NAME" \
    --device-id "$DEVICE_ID" \
    --query connectionString -o tsv)

# Create Azure Digital Twins
echo "2. Creating Azure Digital Twins instance (ini akan lama ~3-5 menit)..."
az dt create \
    --dt-name "$ADT_INSTANCE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION"

echo "✓ Azure Digital Twins created"
echo ""

# Assign role
echo "3. Assigning role..."
CURRENT_USER_ID=$(az ad signed-in-user show --query id -o tsv)
az dt role-assignment create \
    --dt-name "$ADT_INSTANCE_NAME" \
    --assignee "$CURRENT_USER_ID" \
    --role "Azure Digital Twins Data Owner"

ADT_INSTANCE_URL=$(az dt show \
    --dt-name "$ADT_INSTANCE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query hostName -o tsv)

echo "✓ Role assigned"
echo ""

# Configure Function App
echo "4. Configuring Function App..."
az functionapp config appsettings set \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --settings \
        IOT_HUB_CONNECTION_STRING="$IOT_HUB_CONNECTION_STRING" \
        ADT_INSTANCE_URL="https://$ADT_INSTANCE_URL" \
        DEVICE_ID="$DEVICE_ID"

echo "✓ Function App configured"
echo ""

# Upload DTDL model
echo "5. Uploading DTDL model..."
MODEL_FILE="../models/EnergyMonitorSensor.json"

if [ -f "$MODEL_FILE" ]; then
    az dt model create \
        --dt-name "$ADT_INSTANCE_NAME" \
        --models "$MODEL_FILE"
    echo "✓ DTDL model uploaded"
else
    echo "⚠ Model file not found: $MODEL_FILE"
fi
echo ""

# Create digital twin instance
echo "6. Creating digital twin instance..."
az dt twin create \
    --dt-name "$ADT_INSTANCE_NAME" \
    --dtmi "dtmi:digitaltwin:energymonitor:EnergyMonitorSensor;1" \
    --twin-id "$DEVICE_ID" \
    --properties '{
        "deviceId": "'"$DEVICE_ID"'",
        "location": "Rumah - Ruang Tamu",
        "status_tegangan": "tidak_terhubung",
        "status_arus": "tidak_terhubung"
    }'

echo "✓ Digital twin instance created"
echo ""

# Summary
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "📊 Resource Details:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  IoT Hub: $IOT_HUB_NAME"
echo "  Storage: $STORAGE_ACCOUNT_NAME"
echo "  Function App: $FUNCTION_APP_NAME"
echo "  Digital Twins: $ADT_INSTANCE_NAME"
echo "  Device ID: $DEVICE_ID"
echo ""
echo "🔗 Connection Strings:"
echo "===================="
echo "IoT Hub:"
echo "$IOT_HUB_CONNECTION_STRING"
echo ""
echo "Device:"
echo "$DEVICE_CONNECTION_STRING"
echo ""
echo "Digital Twins URL:"
echo "https://$ADT_INSTANCE_URL"
echo ""
echo "===================="
echo ""
echo "📝 Next Steps:"
echo "1. Deploy Azure Function (see README.md)"
echo "2. Setup HiveMQ webhook"
echo "3. Test data flow"
echo ""
