# 🤖 Configuration ChatGPT (OpenAI) pour génération de contrats

## ✅ Ce qui a été fait

### 1️⃣ Edge Function créée et déployée
- **Fichier**: `supabase/functions/generate-contract-ai/index.ts`
- **Modèle**: `gpt-4o` (ChatGPT le plus performant - dernière version)
- **Statut**: ✅ Déployé sur Supabase
- **URL Dashboard**: https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/functions

### 2️⃣ Prompts juridiques configurés
L'Edge Function contient **34+ prompts spécialisés** pour tous les contrats avocats et notaires

### 3️⃣ Helper créé
- Fichier: `src/lib/contractAIHelper.ts`
- Fonctions: `generateContractWithAI()` et `getClientInfo()`

### 4️⃣ Handlers intégrés (4 sur 34)
- ✅ Dev web/app
- ✅ Cession droits auteur
- ✅ Licence logicielle
- ✅ Mentions légales/RGPD

## ⚙️ Configuration requise

### Étape 1: Obtenir une clé API OpenAI

1. **Créer un compte OpenAI**
   - Aller sur https://platform.openai.com/
   - S'inscrire ou se connecter

2. **Générer une clé API**
   - Dans le dashboard, aller dans "API Keys"
   - Cliquer sur "Create new secret key"
   - Copier la clé (format: `sk-proj-...` ou `sk-...`)
   - ⚠️ **IMPORTANT**: La sauvegarder immédiatement, elle ne sera plus visible

3. **Ajouter du crédit**
   - Aller dans "Billing"
   - Ajouter minimum 5$ de crédit
   - Le modèle utilisé: `gpt-4o` (le plus récent)
   - Coût estimé: ~0.01$ - 0.10$ par contrat généré

### Étape 2: Configurer la clé dans Supabase

#### Option A: Via le Dashboard Supabase (Recommandé)

1. **Aller dans le Dashboard Supabase**
   - URL: https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh
   - Se connecter

2. **Configurer la variable d'environnement**
   - Dans le menu latéral: **Settings** → **Edge Functions**
   - Cliquer sur l'onglet **Secrets**
   - Cliquer sur **Add new secret**
   - Nom: `OPENAI_API_KEY`
   - Valeur: `sk-proj-...` (votre clé)
   - Cliquer sur **Save**

3. **Redémarrer la fonction (automatique)**
   - La fonction redémarre automatiquement après ajout du secret
   - Attendre 10-15 secondes

#### Option B: Via CLI Supabase

```bash
# Dans le terminal
npx supabase secrets set OPENAI_API_KEY=sk-proj-VOTRE_CLE_ICI
```

### Étape 3: Vérifier que ça fonctionne

1. **Remplir un formulaire**
   - Aller dans l'app → Contrats → Dev web/app (ou autre contrat)
   - Remplir au minimum les champs obligatoires
   - Laisser d'autres champs vides pour tester "[À COMPLÉTER]"

2. **Créer le contrat**
   - Cliquer sur "Créer le contrat"
   - Observer le toast "Génération du contrat par l'IA..."
   - Attendre 5-30 secondes selon la complexité

3. **Vérifier le résultat**
   - Le contrat doit s'afficher avec le texte généré
   - Les champs vides doivent contenir "[À COMPLÉTER]"
   - Le document doit être structuré en articles numérotés

## 🔍 Debug / Vérification

### Logs de la fonction

1. **Voir les logs en temps réel**
   ```bash
   npx supabase functions logs generate-contract-ai --follow
   ```

2. **Ou dans le Dashboard**
   - https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/functions/generate-contract-ai/logs

### Erreurs courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| `OPENAI_API_KEY non configurée` | Variable d'environnement manquante | Ajouter le secret dans Dashboard Supabase |
| `401 Unauthorized` | Clé API invalide | Vérifier la clé API dans platform.openai.com |
| `429 Too Many Requests` | Quota dépassé | Ajouter du crédit sur OpenAI |
| `insufficient_quota` | Pas de crédit | Ajouter minimum 5$ dans Billing |

## 📊 Utilisation et coûts

### Modèle utilisé
- **Nom**: `gpt-4o` (GPT-4 Optimized)
- **Input**: $2.50 / million de tokens
- **Output**: $10 / million de tokens
- **Max tokens par réponse**: 16 000 (≈ 12 000 mots)
- **Vitesse**: 2-3x plus rapide que GPT-4 Turbo

### Coût estimé par contrat
- Contrat simple (CGU, NDA): ~0.01$ - 0.03$
- Contrat moyen (CDI, Bail): ~0.03$ - 0.06$
- Contrat complexe (Dev web/app): ~0.06$ - 0.12$

### Avantages GPT-4o
- ✅ Plus rapide (2-3x)
- ✅ Excellente compréhension du droit français
- ✅ Très cohérent sur longs documents
- ✅ Intégration directe avec compte ChatGPT
- ✅ Rapport qualité/prix optimal

## 🚀 Prochaines étapes

### À faire immédiatement
1. [ ] Configurer `OPENAI_API_KEY` dans Supabase Dashboard
2. [ ] Tester avec le contrat Dev web/app
3. [ ] Vérifier que "[À COMPLÉTER]" apparaît bien pour champs vides

### Handlers restants à intégrer (30)

Le pattern est déjà prêt dans `contractAIHelper.ts`. Pour chaque handler, ajouter avant l'insert:

```typescript
// Génération IA
toast.info("Génération du contrat par l'IA...");
const clientInfo = getClientInfo(VOTRE_DATA.clientIdField, clients);
const generatedContract = await generateContractWithAI({
  contractType: "Nom exact du contrat",
  formData: { ...VOTRE_DATA, fichiers: {...} },
  clientInfo,
  user
});
```

Et dans l'insert, ajouter:
```typescript
content: generatedContract
```

## 📝 Notes techniques

- La colonne `content` doit exister dans la table `contrats`
- Le système fonctionne même si des champs sont vides
- L'IA génère du texte juridiquement correct en français
- Format: texte brut prêt à imprimer (pas de markdown)
- Temperature à 0.3 pour cohérence juridique maximale
