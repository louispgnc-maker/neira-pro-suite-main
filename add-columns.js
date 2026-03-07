#!/usr/bin/env node

const https = require('https');

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

console.log('🔧 Ajout des colonnes à la table signatures via SQL Editor...\n');
console.log('📋 Voici le SQL à exécuter:\n');
console.log('─'.repeat(80));
console.log(sql);
console.log('─'.repeat(80));
console.log('\n👉 Ouvre ce lien et colle le SQL ci-dessus:');
console.log('https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/sql/new\n');
console.log('Une fois exécuté, tape "oui" pour continuer...\n');

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('As-tu exécuté le SQL? (oui/non): ', (answer) => {
  if (answer.toLowerCase() === 'oui' || answer.toLowerCase() === 'yes') {
    console.log('✅ Parfait! Je redéploie la fonction avec toutes les colonnes...');
    readline.close();
    process.exit(0);
  } else {
    console.log('⏸️  En attente... Exécute le SQL puis relance ce script.');
    readline.close();
    process.exit(1);
  }
});
