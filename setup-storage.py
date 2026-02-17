#!/usr/bin/env python3
import requests
import json

# Configuration
SUPABASE_URL = "https://elysrdqujzlbvnjfilvh.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE2MzMxNCwiZXhwIjoyMDc3NzM5MzE0fQ.sR6o9PVKYtQlthqjx5JA8gAEb0FqJxO3uwxpR9uOQFo"

print("🚀 Configuration automatique du Storage...\n")

# SQL pour configurer les politiques
sql = """
-- 1. Activer RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer anciennes politiques
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- 3. Créer les politiques
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read their own files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
"""

# Envoyer la requête
try:
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec",
        headers={
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
            "Content-Type": "application/json"
        },
        json={"query": sql}
    )
    
    if response.status_code == 200:
        print("✅ Politiques RLS configurées avec succès!")
    else:
        print(f"⚠️  Erreur HTTP {response.status_code}")
        print(f"Response: {response.text}")
        print("\n📝 Vous devez configurer manuellement via l'interface graphique")
        print("   Voir: CONFIGURE_STORAGE_GUI.md")
        
except Exception as e:
    print(f"❌ Erreur: {e}")
    print("\n📝 Vous devez configurer manuellement via l'interface graphique")
    print("   Voir: CONFIGURE_STORAGE_GUI.md")

print("\n✅ Configuration terminée!")
print(f"🔗 Vérifiez sur: https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/storage/policies")
