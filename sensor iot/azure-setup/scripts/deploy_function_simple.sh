#!/bin/bash

# Manual Azure Function Deployment
# Untuk deployment cepat tanpa interactive prompt

set -e

# ===== KONFIGURASI - EDIT DI SINI =====
RESOURCE_GROUP="rg-digitaltwin-energymonitor"
FUNCTION_APP_NAME="func-energymonitor-7d2e5be2"
STORAGE_ACCOUNT="mlsuhu0426140346"
# ======================================

echo "============================================"
echo "🚀 Azure Function Deployment"
echo "============================================"
echo ""
echo "Resource Group:   $RESOURCE_GROUP"
echo "Function App:     $FUNCTION_APP_NAME"
echo "Storage Account:  $STORAGE_ACCOUNT"
echo ""
read -p "Lanjutkan? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "Deployment dibatalkan"
    exit 0
fi

# Get storage connection string
echo ""
echo "📦 Getting Storage connection string..."
STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
    --name "$STORAGE_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --output tsv)

echo "✓ Connection string obtained"

# Configure function app
echo ""
echo "⚙️  Configuring Function App..."
az functionapp config appsettings set \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --settings \
        FUNCTIONS_WORKER_RUNTIME="node" \
        FUNCTIONS_EXTENSION_VERSION="~4" \
        WEBSITE_NODE_DEFAULT_VERSION="~18" \
        AzureWebJobsStorage="$STORAGE_CONNECTION_STRING" \
        WEBSITE_CONTENTAZUREFILECONNECTIONSTRING="$STORAGE_CONNECTION_STRING" \
        STORAGE_CONNECTION_STRING="$STORAGE_CONNECTION_STRING" \
    --output none

echo "✓ Settings configured"

# Navigate to function directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FUNCTION_DIR="$SCRIPT_DIR/../azure-function"

cd "$FUNCTION_DIR"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install --silent

echo "✓ Dependencies installed"

# Deploy
echo ""
echo "🚀 Deploying to Azure..."
echo ""
func azure functionapp publish "$FUNCTION_APP_NAME" --javascript

echo ""
echo "============================================"
echo "✅ Deployment Complete!"
echo "============================================"
echo ""

# Get function URL
FUNCTION_URL=$(az functionapp show \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "defaultHostName" \
    --output tsv)

echo "🌐 Function App URL:"
echo "   https://$FUNCTION_URL"
echo ""
echo "📡 API Endpoints:"
echo "   Latest:   https://$FUNCTION_URL/api/GetTelemetryData/latest"
echo "   History:  https://$FUNCTION_URL/api/GetTelemetryData/history?hours=24"
echo "   Stats:    https://$FUNCTION_URL/api/GetTelemetryData/stats?hours=24"
echo ""
echo "📝 Next Steps:"
echo "   1. Test endpoint:"
echo "      curl https://$FUNCTION_URL/api/GetTelemetryData/latest"
echo ""
echo "   2. Edit view_virtual/.env:"
echo "      VITE_AZURE_FUNCTION_URL=https://$FUNCTION_URL"
echo ""
echo "   3. Restart dashboard:"
echo "      cd view_virtual && npm run dev"
echo ""
