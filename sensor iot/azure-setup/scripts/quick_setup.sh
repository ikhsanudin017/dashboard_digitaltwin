#!/bin/bash

# Quick Start - Azure Digital Twins Setup
# Jalankan script ini untuk setup otomatis

echo "=========================================="
echo "🚀 Azure Digital Twins Quick Setup"
echo "=========================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

# Check Azure CLI
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not found!"
    echo "   Install: brew install azure-cli"
    exit 1
fi
echo "✓ Azure CLI installed"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found!"
    echo "   Install: brew install node"
    exit 1
fi
echo "✓ Node.js installed"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found!"
    exit 1
fi
echo "✓ Python 3 installed"

echo ""

# Azure login check
echo "Checking Azure login..."
if ! az account show &> /dev/null; then
    echo "Please login to Azure:"
    az login
fi

SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
echo "✓ Logged in to: $SUBSCRIPTION_NAME"
echo ""

# Confirm setup
read -p "Deploy Azure resources? This will use your Azure for Students credit. (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

# Run deployment
echo ""
echo "Starting deployment..."
echo ""

chmod +x ./deploy_azure.sh
./deploy_azure.sh

# Check if successful
if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ Setup Complete!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Save the connection strings displayed above"
    echo "2. Deploy Azure Function (see README.md)"
    echo "3. Setup HiveMQ webhook (manual step)"
    echo "4. Test end-to-end data flow"
    echo ""
    echo "Read full instructions in README.md"
else
    echo ""
    echo "❌ Setup failed! Check errors above."
    exit 1
fi
