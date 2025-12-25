#!/bin/bash

# Script to apply the signature addons migration to Supabase
# This adds columns to track purchased signature packages

echo "🚀 Applying signature addons migration..."

# Read the SQL file
SQL_FILE="supabase/migrations/20251225_add_signature_addons.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ Migration file not found: $SQL_FILE"
  exit 1
fi

# Apply via psql or Supabase SQL Editor
echo "📝 Migration SQL:"
cat "$SQL_FILE"

echo ""
echo "✅ To apply this migration:"
echo "1. Go to your Supabase project dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Copy and paste the SQL above"
echo "4. Click 'Run'"
echo ""
echo "Or use the Supabase CLI:"
echo "supabase db push"
