import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjMzMTQsImV4cCI6MjA3NzczOTMxNH0.ItqpqcgP_FFqvmx-FunQv0RmCI9EATJlUWuYmw0zPvA';

const supabase = createClient(supabaseUrl, supabaseKey);

// Vérifier les colonnes de la table contrats
const { data, error } = await supabase
  .from('contrats')
  .select('*')
  .limit(1)
  .single();

if (error) {
  console.error('❌ Erreur:', error);
} else {
  console.log('✅ Colonnes disponibles:', Object.keys(data));
  console.log('\n🔍 parties_clients existe ?', 'parties_clients' in data);
}
