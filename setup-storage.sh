#!/bin/bash

# Script pour configurer automatiquement le Storage via l'API Supabase Management

PROJECT_REF="elysrdqujzlbvnjfilvh"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE2MzMxNCwiZXhwIjoyMDc3NzM5MzE0fQ.sR6o9PVKYtQlthqjx5JA8gAEb0FqJxO3uwxpR9uOQFo"

echo "🚀 Configuration du Storage pour le projet $PROJECT_REF..."

# 1. Vérifier si le bucket existe
echo -e "\n1️⃣ Vérification du bucket 'documents'..."

BUCKET_CHECK=$(curl -s "https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/bucket/documents" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "apikey: $SERVICE_ROLE_KEY")

if echo "$BUCKET_CHECK" | grep -q "id"; then
  echo "✅ Le bucket 'documents' existe déjà"
else
  echo "📁 Création du bucket 'documents'..."
  
  curl -s -X POST "https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/bucket" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "id": "documents",
      "name": "documents",
      "public": false,
      "file_size_limit": 52428800,
      "allowed_mime_types": [
        "application/pdf",
        "image/jpeg", 
        "image/png",
        "image/gif",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain"
      ]
    }'
    
  echo "✅ Bucket créé"
fi

echo -e "\n2️⃣ Configuration des politiques RLS..."
echo "📝 Les politiques doivent être créées via l'interface graphique Supabase"
echo "   ou via la Database REST API"

echo -e "\n✨ Configuration du bucket terminée!"
echo -e "\n📋 Prochaines étapes:"
echo "   1. Allez sur: https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/storage/policies"
echo "   2. Créez les 4 politiques décrites dans CONFIGURE_STORAGE_GUI.md"
echo "   3. Testez la génération de PDF depuis l'interface"
