#!/usr/bin/env node

/**
 * Synchronise Google Drive → Base de connaissances IA Supabase
 * 
 * Configuration:
 * 1. Créer un projet Google Cloud
 * 2. Activer Google Drive API
 * 3. Créer des credentials OAuth 2.0
 * 4. Télécharger le JSON et le renommer en google-credentials.json
 * 5. Créer un dossier "Neira Knowledge Base" dans Google Drive
 * 
 * Usage:
 *   node sync-google-drive.mjs             # Sync une fois
 *   node sync-google-drive.mjs --watch     # Sync en continu (toutes les 5min)
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createReadStream } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables Supabase requises');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuration Google Drive
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const TOKEN_PATH = 'google-token.json';
const CREDENTIALS_PATH = 'google-credentials.json';

// Mapping des dossiers Google Drive → Catégories Supabase
const FOLDER_MAPPING = {
  'Général': 'general',
  'Clauses': 'clauses',
  'Jurisprudence': 'jurisprudence',
  'Procédures': 'procedure',
  'Fiscal': 'fiscal',
  'Social': 'social',
  'Immobilier': 'immobilier',
  'Commercial': 'commercial',
  'Famille': 'famille',
  'Pénal': 'penal',
};

/**
 * Charge ou crée les credentials Google
 */
async function authorize() {
  if (!existsSync(CREDENTIALS_PATH)) {
    console.error(`
❌ Fichier ${CREDENTIALS_PATH} introuvable!

📋 Instructions de configuration:

1. Aller sur: https://console.cloud.google.com
2. Créer un projet ou sélectionner un projet existant
3. Activer l'API Google Drive:
   - Menu > APIs & Services > Enable APIs and Services
   - Rechercher "Google Drive API" et l'activer
4. Créer des credentials OAuth 2.0:
   - APIs & Services > Credentials
   - Create Credentials > OAuth client ID
   - Application type: Desktop app
   - Télécharger le JSON
5. Renommer le fichier téléchargé en "google-credentials.json"
6. Placer le fichier dans ce dossier: ${process.cwd()}

Puis relancer: node sync-google-drive.mjs
    `);
    process.exit(1);
  }

  const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Vérifier si on a déjà un token
  if (existsSync(TOKEN_PATH)) {
    const token = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  // Sinon, demander l'autorisation
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log(`
🔐 Autorisation Google Drive requise

1. Ouvre ce lien dans ton navigateur:
${authUrl}

2. Autorise l'accès à ton Google Drive
3. Copie le code d'autorisation
  `);

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Colle le code ici: ', async (code) => {
      rl.close();
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log('✅ Token sauvegardé dans', TOKEN_PATH);
        resolve(oAuth2Client);
      } catch (error) {
        console.error('❌ Erreur récupération token:', error);
        process.exit(1);
      }
    });
  });
}

/**
 * Liste tous les fichiers d'un dossier Google Drive
 */
async function listDriveFiles(drive, folderId) {
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType, size)',
    pageSize: 100,
  });
  return response.data.files || [];
}

/**
 * Télécharge un fichier depuis Google Drive
 */
async function downloadDriveFile(drive, fileId, fileName) {
  const dest = join('/tmp', fileName);
  const destStream = require('fs').createWriteStream(dest);

  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  return new Promise((resolve, reject) => {
    response.data
      .pipe(destStream)
      .on('finish', () => resolve(dest))
      .on('error', reject);
  });
}

/**
 * Upload vers Supabase Storage
 */
async function uploadToSupabase(filePath, category, fileName) {
  const fileContent = readFileSync(filePath);
  const storagePath = `${category}/${fileName}`;

  const { error } = await supabase.storage
    .from('ai-knowledge-base')
    .upload(storagePath, fileContent, {
      contentType: 'text/plain',
      upsert: true,
    });

  if (error) {
    throw error;
  }
}

/**
 * Trouve le dossier "Neira Knowledge Base" dans Drive
 */
async function findRootFolder(drive) {
  const response = await drive.files.list({
    q: "name='Neira Knowledge Base' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (!response.data.files || response.data.files.length === 0) {
    console.error(`
❌ Dossier "Neira Knowledge Base" introuvable dans Google Drive!

📋 Création du dossier:
1. Ouvre Google Drive: https://drive.google.com
2. Clique sur "Nouveau" > "Dossier"
3. Nomme-le exactement: "Neira Knowledge Base"
4. À l'intérieur, crée des sous-dossiers avec ces noms EXACTS:
   - Général
   - Clauses
   - Jurisprudence
   - Procédures
   - Fiscal
   - Social
   - Immobilier
   - Commercial
   - Famille
   - Pénal

5. Glisse tes documents dans les sous-dossiers appropriés
6. Relance: node sync-google-drive.mjs
    `);
    process.exit(1);
  }

  return response.data.files[0].id;
}

/**
 * Synchronise un dossier Google Drive vers Supabase
 */
async function syncFolder(drive, folderId, category) {
  console.log(`\n📁 Sync du dossier: ${category}`);

  const files = await listDriveFiles(drive, folderId);

  if (files.length === 0) {
    console.log(`   Aucun fichier`);
    return { synced: 0, skipped: 0 };
  }

  let synced = 0;
  let skipped = 0;

  for (const file of files) {
    // Vérifier le type de fichier
    if (!file.name.match(/\.(txt|md|pdf)$/i)) {
      console.log(`   ⏭️  ${file.name} (format non supporté)`);
      skipped++;
      continue;
    }

    try {
      console.log(`   📥 ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

      // Télécharger depuis Drive
      const localPath = await downloadDriveFile(drive, file.id, file.name);

      // Upload vers Supabase
      await uploadToSupabase(localPath, category, file.name);

      console.log(`   ✅ Synchronisé`);
      synced++;

      // Nettoyer le fichier temporaire
      require('fs').unlinkSync(localPath);
    } catch (error) {
      console.error(`   ❌ Erreur: ${error.message}`);
      skipped++;
    }
  }

  return { synced, skipped };
}

/**
 * Synchronisation complète
 */
async function sync() {
  console.log('🔄 Démarrage de la synchronisation Google Drive → Supabase\n');

  const auth = await authorize();
  const drive = google.drive({ version: 'v3', auth });

  // Trouver le dossier racine
  const rootFolderId = await findRootFolder(drive);
  console.log('✅ Dossier "Neira Knowledge Base" trouvé');

  // Lister les sous-dossiers
  const subfolders = await listDriveFiles(drive, rootFolderId);

  let totalSynced = 0;
  let totalSkipped = 0;

  for (const folder of subfolders) {
    if (folder.mimeType === 'application/vnd.google-apps.folder') {
      const category = FOLDER_MAPPING[folder.name];

      if (!category) {
        console.log(`\n⚠️  Dossier "${folder.name}" ignoré (nom non reconnu)`);
        continue;
      }

      const result = await syncFolder(drive, folder.id, category);
      totalSynced += result.synced;
      totalSkipped += result.skipped;
    }
  }

  console.log(`\n✅ Synchronisation terminée: ${totalSynced} fichiers, ${totalSkipped} ignorés`);
  return { totalSynced, totalSkipped };
}

/**
 * Mode watch (sync toutes les 5 minutes)
 */
async function watch() {
  console.log('👀 Mode watch activé - Sync toutes les 5 minutes\n');
  console.log('Appuie sur Ctrl+C pour arrêter\n');

  await sync(); // Premier sync immédiat

  setInterval(async () => {
    console.log('\n🔄 Sync automatique...\n');
    await sync();
  }, 5 * 60 * 1000); // 5 minutes
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--watch') || args.includes('-w')) {
    await watch();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📚 Synchronisation Google Drive → Base de connaissances IA

Usage:
  node sync-google-drive.mjs              # Sync une fois
  node sync-google-drive.mjs --watch      # Sync automatique (5min)
  node sync-google-drive.mjs --help       # Aide

Structure Google Drive requise:
  Neira Knowledge Base/
  ├── Général/
  ├── Clauses/
  ├── Jurisprudence/
  ├── Procédures/
  ├── Fiscal/
  ├── Social/
  ├── Immobilier/
  ├── Commercial/
  ├── Famille/
  └── Pénal/

Formats acceptés: .txt, .md, .pdf
    `);
  } else {
    await sync();
  }
}

main().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
