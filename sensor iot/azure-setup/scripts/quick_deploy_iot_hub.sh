#!/bin/bash

# Quick Deploy Script - Azure IoT Hub Integration
set -e

echo "=========================================="
echo "🚀 Quick Deploy - Azure IoT Hub Setup"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
IOT_HUB_NAME="iothub-energymonitor-ef753d74"
DEVICE_ID="ESP32_DHT11_Sensor"

echo "📋 Configuration:"
echo "  IoT Hub: $IOT_HUB_NAME"
echo "  Device ID: $DEVICE_ID"
echo ""

# Step 1: Check Function App
echo -e "${YELLOW}📦 Step 1: Check Function App${NC}"
echo ""

FUNCTION_APPS=$(az functionapp list --query "[].{Name:name, ResourceGroup:resourceGroup, State:state}" -o table)

if [ -z "$FUNCTION_APPS" ]; then
    echo -e "${RED}❌ No Function App found!${NC}"
    echo ""
    echo "Please create a Function App first:"
    echo ""
    echo "  1. Go to Azure Portal"
    echo "  2. Create a Function App (Node.js runtime)"
    echo "  3. Run this script again"
    echo ""
    exit 1
else
    echo "✅ Function Apps found:"
    echo ""
    echo "$FUNCTION_APPS"
    echo ""
    
    # Get function app name from user
    read -p "Enter Function App name to deploy: " FUNCTION_APP_NAME
    
    if [ -z "$FUNCTION_APP_NAME" ]; then
        echo -e "${RED}❌ Function App name required!${NC}"
        exit 1
    fi
    
    # Get resource group
    RESOURCE_GROUP=$(az functionapp show --name "$FUNCTION_APP_NAME" --query resourceGroup -o tsv 2>/dev/null || echo "")
    
    if [ -z "$RESOURCE_GROUP" ]; then
        echo -e "${RED}❌ Function App '$FUNCTION_APP_NAME' not found!${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Using Function App: $FUNCTION_APP_NAME${NC}"
    echo "   Resource Group: $RESOURCE_GROUP"
    echo ""
fi

# Step 2: Configure Function App Settings
echo -e "${YELLOW}📝 Step 2: Configure Function App Settings${NC}"
echo ""

# Get IoT Hub connection string
IOT_HUB_CONNECTION_STRING=$(az iot hub connection-string show \
  --hub-name $IOT_HUB_NAME \
  --policy-name service \
  --query connectionString -o tsv)

echo "Setting IOT_HUB_CONNECTION_STRING..."
az functionapp config appsettings set \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings "IOT_HUB_CONNECTION_STRING=$IOT_HUB_CONNECTION_STRING" \
  --output none

echo -e "${GREEN}✅ IoT Hub connection string configured${NC}"
echo ""

# Check if Storage connection string exists
STORAGE_CONN=$(az functionapp config appsettings list \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "[?name=='STORAGE_CONNECTION_STRING'].value" -o tsv)

if [ -z "$STORAGE_CONN" ]; then
    echo -e "${YELLOW}⚠️  STORAGE_CONNECTION_STRING not found!${NC}"
    echo ""
    read -p "Enter Storage Account connection string (or press Enter to skip): " STORAGE_INPUT
    
    if [ ! -z "$STORAGE_INPUT" ]; then
        az functionapp config appsettings set \
          --name "$FUNCTION_APP_NAME" \
          --resource-group "$RESOURCE_GROUP" \
          --settings "STORAGE_CONNECTION_STRING=$STORAGE_INPUT" \
          --output none
        echo -e "${GREEN}✅ Storage connection string configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Skipped Storage configuration${NC}"
    fi
else
    echo -e "${GREEN}✅ Storage connection string already configured${NC}"
fi
echo ""

# Step 3: Deploy Function
echo -e "${YELLOW}🚀 Step 3: Deploy Azure Function${NC}"
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FUNCTION_DIR="$SCRIPT_DIR/../azure-function"

if [ ! -d "$FUNCTION_DIR" ]; then
    echo -e "${RED}❌ Function directory not found: $FUNCTION_DIR${NC}"
    exit 1
fi

cd "$FUNCTION_DIR"

echo "Installing dependencies..."
npm install --silent

echo ""
echo "Deploying to $FUNCTION_APP_NAME..."
func azure functionapp publish "$FUNCTION_APP_NAME" --javascript

echo ""
echo -e "${GREEN}✅ Function deployed successfully!${NC}"
echo ""

# Step 4: Summary
echo "=========================================="
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "=========================================="
echo ""
echo "📊 Deployment Summary:"
echo "  Function App: $FUNCTION_APP_NAME"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  IoT Hub: $IOT_HUB_NAME"
echo "  Device ID: $DEVICE_ID"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Upload ESP32 code:"
echo "   cd \"sensor iot\""
echo "   platformio run --target upload"
echo ""
echo "2. Monitor ESP32:"
echo "   platformio device monitor"
echo ""
echo "3. Test IoT Hub messages:"
echo "   az iot hub monitor-events \\"
echo "     --hub-name $IOT_HUB_NAME \\"
echo "     --device-id $DEVICE_ID"
echo ""
echo "4. Check Function logs:"
echo "   func azure functionapp logstream $FUNCTION_APP_NAME"
echo ""
echo "=========================================="
