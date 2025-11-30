#!/bin/bash

# Azure Digital Twins Setup Script
# Script ini akan membuat semua resource Azure yang diperlukan

set -e

echo "=========================================="
echo "Azure Digital Twins Setup"
echo "=========================================="

# Konfigurasi
RESOURCE_GROUP="rg-digitaltwin-energymonitor"
LOCATION="southeastasia"  # Singapore - terdekat dengan Indonesia
IOT_HUB_NAME="iothub-energymonitor-$(openssl rand -hex 4)"
ADT_INSTANCE_NAME="adt-energymonitor-$(openssl rand -hex 4)"
FUNCTION_APP_NAME="func-energymonitor-$(openssl rand -hex 4)"
STORAGE_ACCOUNT_NAME="stenergy$(openssl rand -hex 4)"
DEVICE_ID="ESP32_ENERGY_MONITOR_001"

echo ""
echo "Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  IoT Hub: $IOT_HUB_NAME"
echo "  Digital Twins: $ADT_INSTANCE_NAME"
echo "  Function App: $FUNCTION_APP_NAME"
echo "  Storage Account: $STORAGE_ACCOUNT_NAME"
echo ""

# Check Azure CLI login
echo "Checking Azure CLI login..."
if ! az account show > /dev/null 2>&1; then
    echo "Please login to Azure CLI first:"
    echo "  az login"
    exit 1
fi

echo "✓ Logged in to Azure"
echo ""

# 1. Create Resource Group
echo "1. Creating Resource Group..."
az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --tags project=digitaltwin environment=dev

echo "✓ Resource Group created"
echo ""

# 2. Create IoT Hub (Free tier - 1 per subscription)
echo "2. Creating IoT Hub..."
az iot hub create \
    --name "$IOT_HUB_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku F1 \
    --partition-count 2

echo "✓ IoT Hub created"
echo ""

# 3. Register ESP32 device in IoT Hub
echo "3. Registering device in IoT Hub..."
az iot hub device-identity create \
    --hub-name "$IOT_HUB_NAME" \
    --device-id "$DEVICE_ID"

# Get device connection string
DEVICE_CONNECTION_STRING=$(az iot hub device-identity connection-string show \
    --hub-name "$IOT_HUB_NAME" \
    --device-id "$DEVICE_ID" \
    --query connectionString -o tsv)

echo "✓ Device registered"
echo "  Device ID: $DEVICE_ID"
echo ""

# 4. Create Storage Account for Function App
echo "4. Creating Storage Account..."
az storage account create \
    --name "$STORAGE_ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku Standard_LRS

echo "✓ Storage Account created"
echo ""

# 5. Create Function App (Consumption plan - Free tier)
echo "5. Creating Function App..."
az functionapp create \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --storage-account "$STORAGE_ACCOUNT_NAME" \
    --consumption-plan-location "$LOCATION" \
    --runtime node \
    --runtime-version 18 \
    --functions-version 4 \
    --os-type Linux

echo "✓ Function App created"
echo ""

# 6. Get IoT Hub connection string
echo "6. Getting IoT Hub connection string..."
IOT_HUB_CONNECTION_STRING=$(az iot hub connection-string show \
    --hub-name "$IOT_HUB_NAME" \
    --query connectionString -o tsv)

echo "✓ Connection string retrieved"
echo ""

# 7. Create Azure Digital Twins instance
echo "7. Creating Azure Digital Twins instance..."
az dt create \
    --dt-name "$ADT_INSTANCE_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION"

# Assign role to current user
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
echo "  URL: https://$ADT_INSTANCE_URL"
echo ""

# 8. Configure Function App settings
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

# 9. Upload DTDL model to Azure Digital Twins
echo "9. Uploading DTDL model..."
MODEL_FILE="../models/EnergyMonitorSensor.json"

if [ -f "$MODEL_FILE" ]; then
    az dt model create \
        --dt-name "$ADT_INSTANCE_NAME" \
        --models "$MODEL_FILE"
    echo "✓ DTDL model uploaded"
else
    echo "⚠ Model file not found: $MODEL_FILE"
    echo "  Please upload manually using Azure CLI or Portal"
fi
echo ""

# 10. Create digital twin instance
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
echo "  IoT Hub: $IOT_HUB_NAME"
echo "  Digital Twins: $ADT_INSTANCE_NAME"
echo "  Function App: $FUNCTION_APP_NAME"
echo "  Device ID: $DEVICE_ID"
echo ""
echo "Next Steps:"
echo "  1. Deploy Azure Function:"
echo "     cd ../azure-function"
echo "     func azure functionapp publish $FUNCTION_APP_NAME"
echo ""
echo "  2. Get Function URL and Key:"
echo "     az functionapp function show \\"
echo "       --name $FUNCTION_APP_NAME \\"
echo "       --resource-group $RESOURCE_GROUP \\"
echo "       --function-name MqttToIoTHub"
echo ""
echo "  3. Setup HiveMQ webhook:"
echo "     python3 ../scripts/setup_hivemq_webhook.py"
echo ""
echo "  4. View in Azure Portal:"
echo "     https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP"
echo ""
echo "Connection Strings (SAVE THESE!):"
echo "=========================================="
echo "IoT Hub Connection String:"
echo "$IOT_HUB_CONNECTION_STRING"
echo ""
echo "Device Connection String:"
echo "$DEVICE_CONNECTION_STRING"
echo ""
echo "Azure Digital Twins URL:"
echo "https://$ADT_INSTANCE_URL"
echo "=========================================="
