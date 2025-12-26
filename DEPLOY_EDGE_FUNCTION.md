# 🚀 Déploiement de l'Edge Function de génération IA

## ⚠️ Problème actuel

L'erreur `Failed to send a request to the Edge Function` signifie que la fonction `generate-contract-ai` n'est pas déployée sur Supabase ou que la configuration est manquante.

## 📋 Prérequis

1. **Compte Supabase** avec accès au projet
2. **Supabase CLI** installé ([installation](https://supabase.com/docs/guides/cli))
3. **Clé API OpenAI** ([obtenir une clé](https://platform.openai.com/api-keys))

## 🔧 Installation Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Vérifier l'installation
supabase --version
```

## 🔑 Configuration

### 1. Se connecter à Supabase

```bash
# Login à Supabase
supabase login

# Lier au projet
supabase link --project-ref VOTRE_PROJECT_REF
```

Trouvez votre `project-ref` dans : Supabase Dashboard → Settings → General → Reference ID

### 2. Configurer la clé API OpenAI

Dans le dashboard Supabase :
1. Allez dans **Settings** → **Edge Functions**
2. Cliquez sur **Manage secrets**
3. Ajoutez une nouvelle variable :
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Votre clé API OpenAI (commence par `sk-...`)

Ou via CLI :

```bash
supabase secrets set OPENAI_API_KEY=sk-votre-cle-openai
```

## 🚀 Déploiement de l'Edge Function

### Option 1 : Déployer via CLI (Recommandé)

```bash
# Depuis la racine du projet
cd /Users/louispgnc/Desktop/neira-pro-suite-main

# Déployer la fonction
supabase functions deploy generate-contract-ai
```

### Option 2 : Déployer toutes les fonctions

```bash
# Déployer toutes les Edge Functions
supabase functions deploy
```

### Option 3 : Utiliser le script de déploiement

```bash
# Rendre le script exécutable
chmod +x deploy-edge-function.sh

# Exécuter
./deploy-edge-function.sh
```

## ✅ Vérification du déploiement

### 1. Via le Dashboard

1. Allez dans **Edge Functions** dans Supabase
2. Vérifiez que `generate-contract-ai` apparaît dans la liste
3. Status doit être **Active** (vert)

### 2. Via CLI

```bash
# Lister les fonctions déployées
supabase functions list
```

### 3. Tester la fonction

```bash
# Test basique
curl -i --location --request POST \
  'https://VOTRE_PROJECT_REF.supabase.co/functions/v1/generate-contract-ai' \
  --header 'Authorization: Bearer VOTRE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "contractType": "Test",
    "formData": {"test": "data"},
    "clientInfo": {}
  }'
```

## 🔍 Dépannage

### Erreur : "OPENAI_API_KEY non configurée"

```bash
# Vérifier les secrets
supabase secrets list

# Redéfinir la clé si nécessaire
supabase secrets set OPENAI_API_KEY=sk-votre-nouvelle-cle
```

### Erreur : "Function not found"

```bash
# Redéployer la fonction
supabase functions deploy generate-contract-ai --no-verify-jwt
```

### Erreur de permissions

Vérifiez que votre utilisateur a les droits nécessaires sur le projet Supabase.

### Logs de débogage

```bash
# Voir les logs en temps réel
supabase functions logs generate-contract-ai --follow
```

## 📊 Monitoring

### Voir les logs d'exécution

Dans le Dashboard Supabase :
1. **Edge Functions** → `generate-contract-ai`
2. Cliquez sur **Logs**
3. Consultez les erreurs et les appels réussis

### Métriques

Supabase fournit automatiquement :
- Nombre d'invocations
- Temps de réponse moyen
- Taux d'erreur

## 💰 Coûts

### Edge Functions (Supabase)
- **Plan gratuit** : 500 000 invocations/mois
- **Plan Pro** : 2 millions d'invocations incluses

### OpenAI API
- **GPT-4o** : ~$2.50/million de tokens d'entrée, ~$10/million de tokens de sortie
- **Estimation** : ~$0.02-0.05 par génération de contrat

## 🔄 Mise à jour de la fonction

```bash
# Après modification du code
supabase functions deploy generate-contract-ai
```

Les changements sont déployés instantanément sans downtime.

## 📚 Ressources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Deno Deploy](https://deno.com/deploy)

## 🆘 Support

En cas de problème :
1. Vérifier les logs : `supabase functions logs generate-contract-ai`
2. Tester localement : `supabase functions serve generate-contract-ai`
3. Vérifier la configuration des secrets
4. Contacter le support Supabase si nécessaire
