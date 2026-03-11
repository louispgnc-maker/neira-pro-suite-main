import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eztcbvqhyhoexcqidapo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dGNidnFoeWhvZXhjcWlkYXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzNzc0MTAsImV4cCI6MjA0OTk1MzQxMH0.eVnBpWgxOKOXyG-PQMZY_rFH3uGYaWvNdXkiYMQ0KnQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testClientLoading() {
  console.log('\n=== TEST 1: Tous les clients (sans auth) ===');
  const { data: allClients, error: allError } = await supabase
    .from('clients')
    .select('id, nom, prenom, email, owner_id, role, siret');
  
  if (allError) {
    console.error('Erreur:', allError);
  } else {
    console.log('Nombre de clients:', allClients.length);
    allClients.forEach(c => {
      console.log(`- ${c.prenom || ''} ${c.nom} (${c.email}) [owner: ${c.owner_id.substring(0, 8)}...] [role: ${c.role}] [siret: ${c.siret || 'NON'}]`);
    });
  }

  console.log('\n=== TEST 2: Clients avec role=avocat ===');
  const { data: avocatClients, error: avocatError } = await supabase
    .from('clients')
    .select('id, nom, prenom, email, owner_id, role, siret')
    .eq('role', 'avocat');
  
  if (avocatError) {
    console.error('Erreur:', avocatError);
  } else {
    console.log('Nombre de clients avocat:', avocatClients.length);
    avocatClients.forEach(c => {
      console.log(`- ${c.prenom || ''} ${c.nom} (${c.email}) [owner: ${c.owner_id.substring(0, 8)}...] [siret: ${c.siret || 'NON'}]`);
    });
  }

  console.log('\n=== TEST 3: Check RLS policies ===');
  const { data: policies } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'clients');
  
  if (policies) {
    console.log('Policies trouvées:', policies.length);
  }
}

testClientLoading();
