#!/bin/bash

# Copy SQL to clipboard
cat supabase/migrations/20260118_client_shared_documents_rls.sql | pbcopy

echo "✅ Migration SQL copiée dans le presse-papier!"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Le dashboard Supabase va s'ouvrir"
echo "2. Collez le SQL avec Cmd+V"
echo "3. Cliquez sur 'Run' pour appliquer la migration"
echo ""

# Open Supabase SQL Editor
open "https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/sql/new"

echo "🚀 Dashboard ouvert! Appliquez la migration pour activer les permissions."
