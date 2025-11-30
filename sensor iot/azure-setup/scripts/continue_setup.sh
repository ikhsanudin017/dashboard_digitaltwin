#!/bin/bash
set -e

# Configuration - using existing IoT Hub
RESOURCE_GROUP="rg-digitaltwin-energymonitor"
LOCATION="southeastasia"
IOT_HUB_NAME="iothub-energymonitor-ef753d74"  # Using existing
ADT_INSTANCE_NAME="adt-energymonitor-$(openssl rand -hex 4)"
FUNCTION_APP_NAME="func-energymonitor-$(openssl rand -hex 4)"
STORAGE_ACCOUNT_NAME="stenergy$(openssl rand -hex 4)"
DEVICE_ID="ESP32_ENERGY_MONITOR_001"

echo "Using existing IoT Hub: $IOT_HUB_NAME"
echo "New resources:"
echo "  Digital Twins: $ADT_INSTANCE_NAME"
echo "  Function App: $FUNCTION_APP_NAME"
echo "  Storage: $STORAGE_ACCOUNT_NAME"
echo ""

# Register device
echo "3. Registering device in IoT Hub..."
az iot hub device-identity create \
    --hub-name "$IOT_HUB_NAME" \
    --device-id "$DEVICE_ID" || echo "Device may already exist"

DEVICE_CONNECTION_STRING=$(az iot hub device-identity connection-string show \
    --hub-name "$IOT_HUB_NAME" \
    --device-id "$DEVICE_ID" \
    --query connectionString -o tsv)

echo "✓ Device registered: $DEVICE_ID"
echo ""

# Create Storage Account
echo "4. Creating Storage Account..."
az storage account create \
    --name "$STORAGE_ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku Standard_LRS

echo "✓ Storage Account created"
echo ""

# Create Function App
echo "5. Creating Function App..."
az functionapp create \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --storage-account "$STORAGE_ACCOUNT_NAME" \
    --consumption-plan-location "$LOCATION" \
    --runtime node \
    --runtime-version 20 \
    --functions-version 4 \
    --os-type Linux

echo "✓ Function App created"
echo ""

# Get IoT Hub connection string
echo "6. Getting IoT Hub connection string..."
IOT_HUB_CONNECTION_STRING=$(az iot hub connection-string show \
    --hub-name "$IOT_HUB_NAME" \
    --query connectionString -o tsv)

echo "✓ Connection string retrieved"
echo ""

# Create Azure Digital Twins
echo "7. Creating Azure Digital Twins instance..."
az dt create \
    --dt-name "$ADT_INSTANCE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION"

CURRENT_USER=$(az account show --query user.name -o tsv)
az dt role-assignment create \
    --dt-name "$ADT_INSTANCE_NAME" \
    --assignee "$CURRENT_USER" \
    --role "Azure Digital Twins Data Owner"

ADT_INSTANCE_URL=$(az dt show \
    --dt-name "$ADT_INSTANCE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query hostName -o tsv)

echo "✓ Azure Digital Twins created"
echo ""

# Configure Function App
echo "8. Configuring Function App..."
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
echo "9. Uploading DTDL model..."
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
echo "10. Creating digital twin instance..."
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
echo "Setup Complete! 🎉"
echo "=========================================="
echo ""
echo "Resource Details:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  IoT Hub: $IOT_HUB_NAME (existing)"
echo "  Digital Twins: $ADT_INSTANCE_NAME"
echo "  Function App: $FUNCTION_APP_NAME"
echo "  Device ID: $DEVICE_ID"
echo ""
echo "IoT Hub Connection String:"
echo "$IOT_HUB_CONNECTION_STRING"
echo ""
echo "Device Connection String:"
echo "$DEVICE_CONNECTION_STRING"
echo ""
echo "Azure Digital Twins URL:"
echo "https://$ADT_INSTANCE_URL"
echo ""
