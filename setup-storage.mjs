import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE2MzMxNCwiZXhwIjoyMDc3NzM5MzE0fQ.sR6o9PVKYtQlthqjx5JA8gAEb0FqJxO3uwxpR9uOQFo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  console.log('🚀 Configuration du Storage...\n');

  // 1. Créer le bucket s'il n'existe pas
  console.log('1️⃣ Vérification/Création du bucket documents...');
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === 'documents');
  
  if (!bucketExists) {
    const { data, error } = await supabase.storage.createBucket('documents', {
      public: false,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ]
    });
    
    if (error) {
      console.error('❌ Erreur création bucket:', error);
    } else {
      console.log('✅ Bucket "documents" créé');
    }
  } else {
    console.log('✅ Bucket "documents" existe déjà');
  }

  // 2. Configurer les politiques RLS via SQL  
  console.log('\n2️⃣ Configuration des politiques RLS...');
  
  const fullSQL = `
    -- Activer RLS
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    
    -- Supprimer anciennes politiques
    DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
    DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
    
    -- INSERT policy
    CREATE POLICY "Users can upload to their own folder"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'documents' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
    
    -- SELECT policy
    CREATE POLICY "Users can read their own files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'documents'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
    
    -- UPDATE policy
    CREATE POLICY "Users can update their own files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'documents'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
    
    -- DELETE policy
    CREATE POLICY "Users can delete their own files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'documents'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  `;
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: fullSQL })
    });
    
    // Comme exec n'existe pas, on va essayer autrement
    // Utilisons l'API SQL directement
    const sqlResponse = await fetch(`https://elysrdqujzlbvnjfilvh.supabase.co/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ sql_query: fullSQL })
    });
    
    if (sqlResponse.ok) {
      console.log('✅ Politiques RLS configurées');
    } else {
      console.log('⚠️  Impossible de créer les politiques via API');
      console.log('📝 Utilisez l\'interface graphique (voir CONFIGURE_STORAGE_GUI.md)');
    }
  } catch (e) {
    console.log('⚠️  Impossible de créer les politiques via API');
    console.log('📝 Utilisez l\'interface graphique (voir CONFIGURE_STORAGE_GUI.md)');
  }

  console.log('\n✨ Configuration terminée !');
  console.log('\n📝 Si les politiques RLS n\'ont pas pu être créées via script,');
  console.log('utilisez l\'interface graphique comme indiqué dans CONFIGURE_STORAGE_GUI.md');
}

setupStorage().catch(console.error);
