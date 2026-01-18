import https from 'https';
import fs from 'fs';
import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGO_URL = 'https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Nouveau%20logo%20Neira.png';
const PUBLIC_DIR = path.join(__dirname, '../public');

// Télécharger l'image
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
  });
}

// Générer un favicon de taille spécifique
async function generateFavicon(image, size, outputPath) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Fond transparent
  ctx.clearRect(0, 0, size, size);
  
  // Dessiner l'image redimensionnée
  ctx.drawImage(image, 0, 0, size, size);
  
  // Sauvegarder
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Généré: ${path.basename(outputPath)} (${size}x${size})`);
}

// Générer un ICO (on utilise le PNG 32x32 comme base)
async function generateIco(image, outputPath) {
  const canvas = createCanvas(32, 32);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, 32, 32);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Généré: ${path.basename(outputPath)} (32x32 as .ico)`);
}

async function main() {
  console.log('📥 Téléchargement du nouveau logo...');
  const imageBuffer = await downloadImage(LOGO_URL);
  
  console.log('🖼️  Chargement de l\'image...');
  const image = await loadImage(imageBuffer);
  
  console.log('🎨 Génération des favicons...\n');
  
  // Générer les différentes tailles
  await generateFavicon(image, 16, path.join(PUBLIC_DIR, 'favicon-16x16.png'));
  await generateFavicon(image, 32, path.join(PUBLIC_DIR, 'favicon-32x32.png'));
  await generateFavicon(image, 180, path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  await generateFavicon(image, 192, path.join(PUBLIC_DIR, 'favicon.png'));
  await generateIco(image, path.join(PUBLIC_DIR, 'favicon.ico'));
  
  console.log('\n✨ Tous les favicons ont été générés avec succès !');
}

main().catch(console.error);
