import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjMzMTQsImV4cCI6MjA3NzczOTMxNH0.ItqpqcgP_FFqvmx-FunQv0RmCI9EATJlUWuYmw0zPvA';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Application de la migration parties_clients...\n');

const sql = `
alter table public.contrats add column if not exists parties_clients jsonb default '{}'::jsonb;
create index if not exists contrats_parties_clients_idx on public.contrats using gin (parties_clients);
comment on column public.contrats.parties_clients is 'Mapping des parties du contrat vers les IDs clients';
`;

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.error('❌ Erreur:', error);
} else {
  console.log('✅ Migration appliquée avec succès !');
}
