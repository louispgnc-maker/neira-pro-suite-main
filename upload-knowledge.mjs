#!/usr/bin/env node

/**
 * Script pour alimenter la base de connaissances IA
 * Usage: node upload-knowledge.mjs <fichier_ou_dossier> [catégorie]
 * 
 * Exemples:
 *   node upload-knowledge.mjs ./mes-guides/
 *   node upload-knowledge.mjs guide-redaction.txt general
 *   node upload-knowledge.mjs ./clauses-types/ clauses
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, basename, extname } from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables requises:');
  console.error('   - VITE_SUPABASE_URL ou SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Catégories disponibles
const CATEGORIES = {
  'general': 'Connaissances générales',
  'clauses': 'Clauses types et modèles',
  'jurisprudence': 'Jurisprudence et références',
  'procedure': 'Procédures et formalités',
  'fiscal': 'Droit fiscal',
  'social': 'Droit social',
  'immobilier': 'Droit immobilier',
  'commercial': 'Droit commercial',
  'famille': 'Droit de la famille',
  'penal': 'Droit pénal',
};

async function uploadFile(filePath, category = 'general') {
  try {
    const fileName = basename(filePath);
    const ext = extname(filePath).toLowerCase();
    
    // Vérifier l'extension
    if (!['.txt', '.md', '.pdf'].includes(ext)) {
      console.log(`⏭️  Ignoré: ${fileName} (format non supporté)`);
      return false;
    }

    console.log(`📤 Upload: ${fileName} → [${category}]`);

    // Lire le fichier
    const fileContent = readFileSync(filePath);
    
    // Construire le chemin de stockage
    const storagePath = `${category}/${fileName}`;

    // Upload vers Storage
    const { error } = await supabase.storage
      .from('ai-knowledge-base')
      .upload(storagePath, fileContent, {
        contentType: ext === '.pdf' ? 'application/pdf' : 'text/plain',
        upsert: true // Remplace si existe déjà
      });

    if (error) {
      console.error(`❌ Erreur: ${error.message}`);
      return false;
    }

    console.log(`✅ ${fileName} uploadé avec succès`);
    return true;

  } catch (error) {
    console.error(`❌ Erreur upload ${filePath}:`, error.message);
    return false;
  }
}

async function uploadDirectory(dirPath, category = 'general') {
  console.log(`\n📁 Scan du dossier: ${dirPath}\n`);
  
  const files = readdirSync(dirPath);
  let uploaded = 0;
  let skipped = 0;

  for (const file of files) {
    const fullPath = join(dirPath, file);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      // Récursif sur sous-dossiers
      const subResult = await uploadDirectory(fullPath, category);
      uploaded += subResult.uploaded;
      skipped += subResult.skipped;
    } else {
      const success = await uploadFile(fullPath, category);
      if (success) uploaded++;
      else skipped++;
    }
  }

  return { uploaded, skipped };
}

async function listKnowledge() {
  console.log('\n📚 Base de connaissances actuelle:\n');

  for (const [key, label] of Object.entries(CATEGORIES)) {
    const { data, error } = await supabase.storage
      .from('ai-knowledge-base')
      .list(key);

    if (!error && data && data.length > 0) {
      console.log(`\n${label} (${data.length} fichiers):`);
      data.forEach(file => {
        const sizeKB = (file.metadata?.size || 0) / 1024;
        console.log(`  • ${file.name} (${sizeKB.toFixed(2)} KB)`);
      });
    }
  }
  console.log('');
}

async function main() {
  const args = process.argv.slice(2);

  // Commande: list
  if (args[0] === 'list' || args[0] === '-l') {
    await listKnowledge();
    return;
  }

  // Commande: help
  if (!args[0] || args[0] === 'help' || args[0] === '-h') {
    console.log(`
📚 Upload dans la base de connaissances IA

Usage:
  node upload-knowledge.mjs <fichier_ou_dossier> [catégorie]
  node upload-knowledge.mjs list

Catégories disponibles:
${Object.entries(CATEGORIES).map(([key, label]) => `  • ${key.padEnd(15)} - ${label}`).join('\n')}

Exemples:
  node upload-knowledge.mjs ./mes-guides/
  node upload-knowledge.mjs guide-cdi.txt social
  node upload-knowledge.mjs ./clauses/ clauses
  node upload-knowledge.mjs list
    `);
    return;
  }

  const path = args[0];
  const category = args[1] || 'general';

  // Vérifier la catégorie
  if (!CATEGORIES[category]) {
    console.error(`❌ Catégorie invalide: ${category}`);
    console.error(`Catégories disponibles: ${Object.keys(CATEGORIES).join(', ')}`);
    process.exit(1);
  }

  // Vérifier si c'est un fichier ou dossier
  try {
    const stats = statSync(path);

    if (stats.isDirectory()) {
      const result = await uploadDirectory(path, category);
      console.log(`\n✅ Upload terminé: ${result.uploaded} fichiers uploadés, ${result.skipped} ignorés`);
    } else {
      const success = await uploadFile(path, category);
      if (success) {
        console.log('\n✅ Upload terminé');
      } else {
        console.log('\n❌ Upload échoué');
        process.exit(1);
      }
    }

  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
