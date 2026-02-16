#!/bin/bash

# Deploy Universign Edge Functions
# This script deploys the two Universign signature functions

echo "🚀 Deploying Universign Edge Functions..."

# Deploy universign-create-signature
echo "📝 Deploying universign-create-signature..."
supabase functions deploy universign-create-signature

if [ $? -ne 0 ]; then
  echo "❌ Failed to deploy universign-create-signature"
  exit 1
fi

echo "✅ universign-create-signature deployed successfully"

# Deploy universign-check-status
echo "📊 Deploying universign-check-status..."
supabase functions deploy universign-check-status

if [ $? -ne 0 ]; then
  echo "❌ Failed to deploy universign-check-status"
  exit 1
fi

echo "✅ universign-check-status deployed successfully"

echo ""
echo "✅ All Universign functions deployed!"
echo ""
echo "⚠️  IMPORTANT: Configure the following secrets in Supabase:"
echo "   - UNIVERSIGN_USERNAME"
echo "   - UNIVERSIGN_PASSWORD"
echo "   - UNIVERSIGN_API_URL (default: https://ws.universign.eu/tsa/v1)"
echo ""
echo "Run these commands:"
echo "  supabase secrets set UNIVERSIGN_USERNAME=your_username"
echo "  supabase secrets set UNIVERSIGN_PASSWORD=your_password"
echo "  supabase secrets set UNIVERSIGN_API_URL=https://ws.universign.eu/tsa/v1"
echo ""
echo "📋 Don't forget to apply the database migration:"
echo "  psql \$DATABASE_URL -f add-universign-columns.sql"
