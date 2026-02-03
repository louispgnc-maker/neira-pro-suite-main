import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1NDE4MzAsImV4cCI6MjA1MjExNzgzMH0.DfS58DmgLJo8UgEtcS6jVBr1JoRZO5q_nv0AlNwcKJ4';

const supabase = createClient(supabaseUrl, supabaseKey);

// Récupérer le dernier contrat de franchise
const { data, error } = await supabase
  .from('contrats')
  .select('id, name, contenu_json, content')
  .ilike('name', '%franchise%')
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

if (error) {
  console.error('Erreur:', error);
} else {
  console.log('\n🔍 CONTRAT:', data.name);
  console.log('\n📋 CONTENU_JSON:');
  console.log(JSON.stringify(data.contenu_json, null, 2));
  
  console.log('\n📄 DÉBUT DU CONTENU (200 premiers caractères):');
  console.log(data.content?.substring(0, 200) || 'Pas de contenu');
}
