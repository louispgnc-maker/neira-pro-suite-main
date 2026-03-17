import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjMzMTQsImV4cCI6MjA3NzczOTMxNH0.ItqpqcgP_FFqvmx-FunQv0RmCI9EATJlUWuYmw0zPvA';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Application de la migration signed_count...\n');

const sql = `
-- Ajouter la colonne signed_count pour compter les signataires qui ont effectivement signé
ALTER TABLE signatures 
ADD COLUMN IF NOT EXISTS signed_count INTEGER DEFAULT 0;

-- Ajouter la colonne closed_at pour tracker la fermeture manuelle de transaction
ALTER TABLE signatures 
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Mettre à jour les signatures existantes qui sont cancelled ou closed
UPDATE signatures 
SET signed_count = 0 
WHERE status IN ('cancelled', 'closed') 
  AND signed_count IS NULL;

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN signatures.signed_count IS 'Nombre de signataires ayant effectivement signé avant fermeture/annulation de la transaction';
COMMENT ON COLUMN signatures.closed_at IS 'Date de fermeture manuelle de la transaction';
`;

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.error('❌ Erreur:', error);
} else {
  console.log('✅ Migration appliquée avec succès !');
  console.log('✅ Colonnes signed_count et closed_at ajoutées à la table signatures');
}
