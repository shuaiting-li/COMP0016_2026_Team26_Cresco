#!/bin/bash

# Azure Firewall Configuration Script for Cresco VM
# This script automates the Azure NSG (Network Security Group) rule setup

set -e

SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID:-}"
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-}"
VM_NAME="${AZURE_VM_NAME:-}"
PUBLIC_IP="${AZURE_PUBLIC_IP:-<your-vm-public-ip>}"

if [[ -z "$SUBSCRIPTION_ID" || -z "$RESOURCE_GROUP" || -z "$VM_NAME" ]]; then
  echo "Usage:"
  echo "  AZURE_SUBSCRIPTION_ID=<subscription-id> AZURE_RESOURCE_GROUP=<resource-group> AZURE_VM_NAME=<vm-name> [AZURE_PUBLIC_IP=<public-ip>] bash setup-azure-firewall.sh"
  exit 1
fi

echo "🔧 Setting up Azure firewall rules for Cresco..."
echo "📍 Subscription: $SUBSCRIPTION_ID"
echo "📍 Resource Group: $RESOURCE_GROUP"
echo "📍 VM Name: $VM_NAME"
echo ""

# Set subscription context
echo "1️⃣  Setting Azure subscription..."
az account set --subscription "$SUBSCRIPTION_ID"

# Get the NSG name (usually <vm-name>-nsg)
echo "2️⃣  Finding Network Security Group..."
NSG_NAME="${VM_NAME}-nsg"

# Check if NSG exists
if ! az network nsg show --resource-group "$RESOURCE_GROUP" --name "$NSG_NAME" &>/dev/null; then
  echo "❌ NSG not found. Checking available NSGs..."
  az network nsg list --resource-group "$RESOURCE_GROUP" -o table
  exit 1
fi

echo "✅ Found NSG: $NSG_NAME"
echo ""

# Add rule for Frontend (Port 3000)
echo "3️⃣  Adding firewall rule for Frontend (Port 3000)..."
az network nsg rule create \
  --resource-group "$RESOURCE_GROUP" \
  --nsg-name "$NSG_NAME" \
  --name "allow-frontend" \
  --priority 100 \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 3000 \
  --access Allow \
  --protocol Tcp \
  --description "Allow HTTP traffic to frontend (port 3000)" \
  2>/dev/null || echo "ℹ️  Rule 'allow-frontend' already exists"

echo "✅ Frontend rule configured"
echo ""

# Add rule for Backend API (Port 8000)
echo "4️⃣  Adding firewall rule for Backend API (Port 8000)..."
az network nsg rule create \
  --resource-group "$RESOURCE_GROUP" \
  --nsg-name "$NSG_NAME" \
  --name "allow-api" \
  --priority 101 \
  --source-address-prefixes '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 8000 \
  --access Allow \
  --protocol Tcp \
  --description "Allow HTTP traffic to API (port 8000)" \
  2>/dev/null || echo "ℹ️  Rule 'allow-api' already exists"

echo "✅ Backend API rule configured"
echo ""

# Display final rules
echo "5️⃣  Verifying all rules..."
echo ""
az network nsg rule list \
  --resource-group "$RESOURCE_GROUP" \
  --nsg-name "$NSG_NAME" \
  --query "[?direction=='Inbound'].{Name:name, Priority:priority, Port:\`destinationPortRange\`, Protocol:protocol, Access:access}" \
  -o table

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Your app is now accessible at:"
echo "   http://$PUBLIC_IP:3000"
echo ""
