#!/bin/bash

# Télécharger le nouveau logo
echo "📥 Téléchargement du nouveau logo..."
curl -o /tmp/nouveau-logo-neira.png "https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Nouveau%20logo%20Neira.png"

# Utiliser sips (outil macOS) pour redimensionner
echo "🎨 Génération des favicons..."

# 16x16
sips -z 16 16 /tmp/nouveau-logo-neira.png --out public/favicon-16x16.png > /dev/null 2>&1
echo "✅ favicon-16x16.png"

# 32x32
sips -z 32 32 /tmp/nouveau-logo-neira.png --out public/favicon-32x32.png > /dev/null 2>&1
echo "✅ favicon-32x32.png"

# 32x32 as .ico
sips -z 32 32 /tmp/nouveau-logo-neira.png --out public/favicon.ico > /dev/null 2>&1
echo "✅ favicon.ico"

# 180x180 pour Apple
sips -z 180 180 /tmp/nouveau-logo-neira.png --out public/apple-touch-icon.png > /dev/null 2>&1
echo "✅ apple-touch-icon.png"

# 192x192 pour le favicon principal
sips -z 192 192 /tmp/nouveau-logo-neira.png --out public/favicon.png > /dev/null 2>&1
echo "✅ favicon.png"

echo ""
echo "✨ Tous les favicons ont été générés avec succès !"

# Nettoyage
rm /tmp/nouveau-logo-neira.png
