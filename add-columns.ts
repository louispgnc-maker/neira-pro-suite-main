import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Ajout des colonnes à la table signatures...');

const sql = `
ALTER TABLE signatures 
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS universign_url TEXT,
ADD COLUMN IF NOT EXISTS signatories JSONB,
ADD COLUMN IF NOT EXISTS item_type TEXT,
ADD COLUMN IF NOT EXISTS item_id UUID;

CREATE INDEX IF NOT EXISTS idx_signatures_transaction_id ON signatures(transaction_id);
CREATE INDEX IF NOT EXISTS idx_signatures_item_id ON signatures(item_id);
`;

const { data, error } = await supabase.rpc('exec', { sql });

if (error) {
  console.error('❌ Erreur:', error);
  Deno.exit(1);
} else {
  console.log('✅ Colonnes ajoutées avec succès!');
}
