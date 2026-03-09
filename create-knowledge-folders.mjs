#!/usr/bin/env node

/**
 * Crée tous les dossiers dans ai-knowledge-base par type de contrat
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE2MzMxNCwiZXhwIjoyMDc3NzM5MzE0fQ.ferf8sE3M2vdYPjPHchrJF8XhL01xAODSRRQ9wmTJE4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Types de contrats AVOCATS
const AVOCAT_TYPES = [
  'CDI',
  'CDD',
  'Convention de stage',
  'Rupture conventionnelle',
  'Avenants au contrat de travail',
  'Accords de confidentialite employe',
  'Politique RGPD interne',
  'Contrat de prestation de services',
  'Contrat de vente B2B Distribution',
  'Conditions Generales de Ventes CGV',
  'Condition Generales d Utilisation CGU',
  'Contrat d agence commerciale',
  'Contrat de franchise',
  'Contrat de partenariat cooperation',
  'Contrat de sous-traitance',
  'NDA accord de confidentialite',
  'Cession de marque Cession de droits de propriete intellectuelle',
  'Bail d habitation vide',
  'Bail d habitation meuble',
  'Bail commercial',
  'Etat des lieux',
  'Mise en demeure de payer le loyer autres obligations',
  'Pacte de concubinage',
  'Convention parentale',
  'Reconnaissance de dettes',
  'Mandat de protection future sous seing prive',
  'Testament olographe accompagnement au depot',
  'Licence logiciel',
  'Contrat de developpement web Application',
  'Politique de confidentialite mentions legales RGPD',
];

// Types de contrats NOTAIRES
const NOTAIRE_TYPES = [
  'Compromis Promesse unilaterale',
  'Acte de vente immobilier',
  'Bail vide meuble',
  'Bail commercial professionnel',
  'Convention d indivision',
  'Acte de mainlevee d hypotheque',
  'Contrats de mariages regimes matrimoniaux',
  'PACS convention enregistrement',
  'Donation entre epoux',
  'Donation simple parent enfant etc',
  'Testament authentique ou mystique',
  'Changement de regime matrimonial',
  'Declaration de succession',
  'Acte de notoriete',
  'Partage successoral',
  'Procuration notariee liee a la succession',
  'Procuration authentique',
  'Mandat de protection future',
  'Attestation de propriete immobiliere',
  'Quitus Reconnaissance de dette',
  'Acte de cession de parts sociales',
];

async function createFolder(folderName) {
  try {
    // Upload un fichier .gitkeep pour créer le dossier
    const { error } = await supabase.storage
      .from('ai-knowledge-base')
      .upload(`${folderName}/.gitkeep`, new Blob([''], { type: 'text/plain' }), {
        contentType: 'text/plain',
        upsert: false,
      });

    if (error) {
      // Si le dossier existe déjà, c'est ok
      if (error.message.includes('already exists')) {
        console.log(`   ⏭️  ${folderName} (existe déjà)`);
      } else {
        throw error;
      }
    } else {
      console.log(`   ✅ ${folderName}`);
    }
  } catch (error) {
    console.error(`   ❌ ${folderName}: ${error.message}`);
  }
}

async function main() {
  console.log('📁 Création des dossiers dans ai-knowledge-base\n');

  console.log('👔 AVOCATS:');
  for (const type of AVOCAT_TYPES) {
    await createFolder(type);
  }

  console.log('\n📜 NOTAIRES:');
  for (const type of NOTAIRE_TYPES) {
    await createFolder(type);
  }

  console.log('\n✅ Terminé!');
  console.log('\nTu peux maintenant uploader des fichiers dans chaque dossier via:');
  console.log('- Dashboard Supabase: Storage > ai-knowledge-base');
  console.log('- CLI: node upload-knowledge.mjs fichier.txt "Nom du dossier"');
}

main().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
