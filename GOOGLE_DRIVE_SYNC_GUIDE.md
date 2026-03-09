# 📚 Guide de synchronisation Google Drive → Base de connaissances IA

## Vue d'ensemble

Ce système synchronise automatiquement tes documents Google Drive vers la base de connaissances IA de Supabase. Tu peux simplement glisser des documents dans Google Drive et ils seront automatiquement utilisés par l'IA pour générer des contrats.

## ⚙️ Configuration initiale (une seule fois)

### Étape 1: Créer le projet Google Cloud

1. Va sur [Google Cloud Console](https://console.cloud.google.com)
2. Crée un nouveau projet ou sélectionne un projet existant
3. Note le nom du projet

### Étape 2: Activer l'API Google Drive

1. Dans le menu, va sur **APIs & Services** → **Enable APIs and Services**
2. Recherche "**Google Drive API**"
3. Clique sur le résultat et active l'API

### Étape 3: Créer les credentials OAuth 2.0

1. Dans **APIs & Services** → **Credentials**
2. Clique sur **Create Credentials** → **OAuth client ID**
3. Si demandé, configure l'écran de consentement OAuth:
   - User Type: **External**
   - Nom de l'application: "Neira Knowledge Sync"
   - Email: ton email
   - Sauvegarde et continue
   - Scopes: laisse vide, continue
   - Test users: ajoute ton email
   - Sauvegarde

4. Retourne sur **Credentials** → **Create Credentials** → **OAuth client ID**
5. Application type: **Desktop app**
6. Nom: "Neira Desktop Sync"
7. Clique sur **Create**
8. Télécharge le JSON (bouton download à droite)
9. Renomme le fichier téléchargé en `google-credentials.json`
10. Place ce fichier dans le dossier `neira-pro-suite-main/`

### Étape 4: Créer la structure Google Drive

1. Ouvre [Google Drive](https://drive.google.com)
2. Crée un nouveau dossier nommé **exactement**: `Neira Knowledge Base`
3. À l'intérieur, crée ces 10 sous-dossiers (noms exacts):
   - `Général`
   - `Clauses`
   - `Jurisprudence`
   - `Procédures`
   - `Fiscal`
   - `Social`
   - `Immobilier`
   - `Commercial`
   - `Famille`
   - `Pénal`

Structure finale:
```
📁 Neira Knowledge Base/
├── 📁 Général/
├── 📁 Clauses/
├── 📁 Jurisprudence/
├── 📁 Procédures/
├── 📁 Fiscal/
├── 📁 Social/
├── 📁 Immobilier/
├── 📁 Commercial/
├── 📁 Famille/
└── 📁 Pénal/
```

### Étape 5: Première autorisation

1. Ouvre un terminal dans le dossier du projet
2. Lance: `node sync-google-drive.mjs`
3. Un lien s'affichera → ouvre-le dans ton navigateur
4. Connecte-toi avec ton compte Google
5. Autorise l'accès (il dira que l'app n'est pas vérifiée, clique sur "Continuer")
6. Copie le code d'autorisation
7. Colle-le dans le terminal

✅ C'est fait! Le script est maintenant autorisé.

## 📥 Utilisation

### Sync manuel (une fois)

```bash
node sync-google-drive.mjs
```

Télécharge tous les fichiers de Google Drive vers Supabase.

### Sync automatique (toutes les 5 minutes)

```bash
node sync-google-drive.mjs --watch
```

Le script tourne en continu et synchronise automatiquement toutes les 5 minutes. Laisse-le tourner en arrière-plan.

### Aide

```bash
node sync-google-drive.mjs --help
```

## 📝 Ajouter des documents

1. Ouvre Google Drive
2. Va dans le dossier `Neira Knowledge Base`
3. Choisis le sous-dossier approprié (ex: `Clauses` pour des clauses contractuelles)
4. Glisse tes fichiers (.txt, .md, ou .pdf)
5. Si le script `--watch` tourne, ils seront synchronisés automatiquement dans 5min max
6. Sinon, lance `node sync-google-drive.mjs`

✅ L'IA utilisera automatiquement ces documents pour générer des contrats!

## 🔄 Partager avec l'équipe

Tu peux partager le dossier `Neira Knowledge Base` avec ton équipe:

1. Clic droit sur le dossier dans Google Drive
2. Partager → Ajouter des personnes
3. Entre les emails de ton équipe
4. Rôle: **Éditeur** (pour qu'ils puissent ajouter des fichiers)

Toute l'équipe peut maintenant glisser des documents directement!

## 📊 Formats supportés

- **`.txt`** - Fichiers texte simple (recommandé)
- **`.md`** - Markdown
- **`.pdf`** - PDF (sera extrait en texte)

Tous les autres formats sont ignorés.

## 🗂️ Mapping des catégories

| Dossier Google Drive | Catégorie Supabase | Utilisé pour |
|---------------------|-------------------|-------------|
| Général | `general` | Tous types de contrats |
| Clauses | `clauses` | Clauses spécifiques réutilisables |
| Jurisprudence | `jurisprudence` | Références juridiques |
| Procédures | `procedure` | Procédures et formalités |
| Fiscal | `fiscal` | Contrats fiscaux |
| Social | `social` | CDI, CDD, etc. |
| Immobilier | `immobilier` | Baux, ventes immobilières |
| Commercial | `commercial` | Contrats commerciaux |
| Famille | `famille` | Droit de la famille |
| Pénal | `penal` | Droit pénal |

L'IA choisit automatiquement les documents pertinents selon le type de contrat.

## 🚀 Automatisation complète

Pour que le script tourne en permanence en arrière-plan:

### Sur macOS:

Crée un fichier `~/Library/LaunchAgents/com.neira.sync.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.neira.sync</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/louispgnc/Desktop/neira-pro-suite-main/sync-google-drive.mjs</string>
        <string>--watch</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/neira-sync.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/neira-sync.error.log</string>
</dict>
</plist>
```

Puis:
```bash
launchctl load ~/Library/LaunchAgents/com.neira.sync.plist
```

Le script démarrera automatiquement au démarrage de ton Mac!

## 🔧 Dépannage

### "Fichier google-credentials.json introuvable"

→ Tu n'as pas placé le fichier de credentials. Refais l'Étape 3.

### "Dossier Neira Knowledge Base introuvable"

→ Vérifie que le dossier existe dans Google Drive avec ce nom exact (majuscules/minuscules comptent). Refais l'Étape 4.

### "Token expired"

→ Supprime `google-token.json` et relance. Il te demandera de te reconnecter.

### "Format non supporté"

→ Seuls .txt, .md et .pdf sont acceptés. Convertis tes documents.

### "Erreur upload Supabase"

→ Vérifie que `SUPABASE_SERVICE_ROLE_KEY` est bien configurée dans `.env.local`.

## 📈 Vérifier les fichiers synchronisés

Tu peux vérifier les fichiers dans Supabase:

```bash
node upload-knowledge.mjs list
```

Ou dans le dashboard Supabase:
1. Storage → ai-knowledge-base
2. Explore les dossiers par catégorie

## 🎯 Exemple de workflow

1. **Matin**: Lance `node sync-google-drive.mjs --watch` dans un terminal
2. **Pendant la journée**: Ton équipe glisse des documents dans Google Drive
3. **Automatique**: Tous les 5min, les nouveaux documents sont synchronisés
4. **Génération IA**: Quand tu génères un contrat, l'IA utilise tous ces documents
5. **Soir**: Arrête le script (Ctrl+C) ou laisse-le tourner

## 💡 Conseils

- **Nomme bien tes fichiers**: `clause-non-concurrence-tech.txt` plutôt que `doc1.txt`
- **Un fichier = un concept**: Plutôt que tout mettre dans un gros fichier
- **Mets à jour régulièrement**: Remplace les anciens fichiers avec les nouvelles versions
- **Utilise Markdown**: Pour du texte structuré avec titres et listes
- **Commente**: Ajoute des notes explicatives dans tes documents

---

✅ **Prêt!** Tu peux maintenant gérer ta base de connaissances IA avec la simplicité de Google Drive.
