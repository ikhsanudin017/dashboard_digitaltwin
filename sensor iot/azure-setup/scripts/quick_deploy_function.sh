#!/bin/bash

# Quick Setup Script untuk Azure Function Deployment
# Run: ./quick_deploy_function.sh

set -e

echo "============================================"
echo "🚀 Azure Function Quick Deploy Script"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI tidak terinstall${NC}"
    echo "Install dengan: brew install azure-cli"
    exit 1
fi

echo -e "${GREEN}✓ Azure CLI terinstall${NC}"

# Check if func is installed
if ! command -v func &> /dev/null; then
    echo -e "${RED}❌ Azure Functions Core Tools tidak terinstall${NC}"
    echo "Install dengan:"
    echo "  brew tap azure/functions"
    echo "  brew install azure-functions-core-tools@4"
    exit 1
fi

echo -e "${GREEN}✓ Azure Functions Core Tools terinstall${NC}"
echo ""

# Login check
echo "Checking Azure login status..."
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}⚠️  Belum login ke Azure${NC}"
    echo "Membuka browser untuk login..."
    az login
else
    echo -e "${GREEN}✓ Sudah login ke Azure${NC}"
fi

# Get current subscription
SUBSCRIPTION=$(az account show --query name -o tsv)
echo -e "${GREEN}Subscription aktif: ${SUBSCRIPTION}${NC}"
echo ""

# List resource groups
echo "============================================"
echo "📦 Resource Groups yang tersedia:"
echo "============================================"
az group list --output table
echo ""

# Prompt for resource group
read -p "Masukkan nama Resource Group: " RESOURCE_GROUP

if [ -z "$RESOURCE_GROUP" ]; then
    echo -e "${RED}❌ Resource Group tidak boleh kosong${NC}"
    exit 1
fi

# Verify resource group exists
if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    echo -e "${RED}❌ Resource Group '$RESOURCE_GROUP' tidak ditemukan${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Resource Group valid${NC}"
echo ""

# List function apps in the resource group
echo "============================================"
echo "⚡ Function Apps di Resource Group '$RESOURCE_GROUP':"
echo "============================================"
FUNCTION_APPS=$(az functionapp list --resource-group "$RESOURCE_GROUP" --query "[].name" -o tsv)

if [ -z "$FUNCTION_APPS" ]; then
    echo -e "${YELLOW}⚠️  Tidak ada Function App di resource group ini${NC}"
    echo ""
    read -p "Ingin membuat Function App baru? (y/n): " CREATE_NEW
    
    if [ "$CREATE_NEW" = "y" ]; then
        read -p "Nama Function App baru (huruf kecil, tanpa spasi): " FUNCTION_APP_NAME
        read -p "Nama Storage Account (huruf kecil, tanpa spasi): " STORAGE_NAME
        
        echo "Membuat Storage Account..."
        az storage account create \
            --name "$STORAGE_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --location "Southeast Asia" \
            --sku Standard_LRS
        
        echo "Membuat Function App..."
        az functionapp create \
            --name "$FUNCTION_APP_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --storage-account "$STORAGE_NAME" \
            --consumption-plan-location "Southeast Asia" \
            --runtime node \
            --runtime-version 18 \
            --functions-version 4 \
            --os-type Linux
        
        echo -e "${GREEN}✓ Function App created${NC}"
    else
        exit 0
    fi
else
    echo "$FUNCTION_APPS"
    echo ""
    read -p "Masukkan nama Function App: " FUNCTION_APP_NAME
fi

if [ -z "$FUNCTION_APP_NAME" ]; then
    echo -e "${RED}❌ Function App name tidak boleh kosong${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Function App: $FUNCTION_APP_NAME${NC}"
echo ""

# List storage accounts
echo "============================================"
echo "💾 Storage Accounts di Resource Group '$RESOURCE_GROUP':"
echo "============================================"
az storage account list --resource-group "$RESOURCE_GROUP" --output table
echo ""

read -p "Masukkan nama Storage Account: " STORAGE_ACCOUNT

if [ -z "$STORAGE_ACCOUNT" ]; then
    echo -e "${RED}❌ Storage Account tidak boleh kosong${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Storage Account: $STORAGE_ACCOUNT${NC}"
echo ""

# Get storage connection string
echo "Getting Storage connection string..."
STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
    --name "$STORAGE_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --output tsv)

echo -e "${GREEN}✓ Connection string obtained${NC}"
echo ""

# Configure function app runtime
echo "Configuring Function App runtime..."
az functionapp config appsettings set \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --settings FUNCTIONS_WORKER_RUNTIME="node" \
                FUNCTIONS_EXTENSION_VERSION="~4" \
                WEBSITE_NODE_DEFAULT_VERSION="~18" \
                STORAGE_CONNECTION_STRING="$STORAGE_CONNECTION_STRING"

echo -e "${GREEN}✓ Settings configured${NC}"
echo ""

# Navigate to function directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FUNCTION_DIR="$SCRIPT_DIR/../azure-function"

if [ ! -d "$FUNCTION_DIR" ]; then
    echo -e "${RED}❌ Directory azure-function tidak ditemukan${NC}"
    exit 1
fi

cd "$FUNCTION_DIR"

# Install dependencies
echo "============================================"
echo "📦 Installing npm dependencies..."
echo "============================================"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Deploy function
echo "============================================"
echo "🚀 Deploying Azure Function..."
echo "============================================"
func azure functionapp publish "$FUNCTION_APP_NAME" --javascript

echo ""
echo -e "${GREEN}✅ Deployment berhasil!${NC}"
echo ""

# Get function URL
FUNCTION_URL=$(az functionapp show \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "defaultHostName" \
    --output tsv)

echo "============================================"
echo "🎉 Deployment Complete!"
echo "============================================"
echo ""
echo -e "${GREEN}Function App URL:${NC}"
echo "https://$FUNCTION_URL"
echo ""
echo -e "${GREEN}API Endpoints:${NC}"
echo "  Latest Data:     https://$FUNCTION_URL/api/GetTelemetryData/latest"
echo "  History (24h):   https://$FUNCTION_URL/api/GetTelemetryData/history?hours=24&limit=100"
echo "  Statistics:      https://$FUNCTION_URL/api/GetTelemetryData/stats?hours=24"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Copy URL di atas"
echo "2. Edit file view_virtual/.env"
echo "3. Set: VITE_AZURE_FUNCTION_URL=https://$FUNCTION_URL"
echo "4. Restart dashboard: npm run dev"
echo ""
echo -e "${GREEN}Test endpoints:${NC}"
echo "curl https://$FUNCTION_URL/api/GetTelemetryData/latest"
echo ""
echo "============================================"
