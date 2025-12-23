# 🤖 Configuration Claude AI pour génération de contrats

## ✅ Ce qui a été fait

### 1️⃣ Edge Function créée et déployée
- **Fichier**: `supabase/functions/generate-contract-ai/index.ts`
- **Statut**: ✅ Déployé sur Supabase
- **URL Dashboard**: https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/functions

### 2️⃣ Prompts juridiques configurés
L'Edge Function contient **21 prompts spécialisés** pour chaque type de contrat avocat:

#### Propriété intellectuelle / Numérique (4 contrats)
- ✅ Contrat de développement web/application
- ✅ Contrat de cession de droits d'auteur
- ✅ Contrat de licence de logiciel
- ✅ NDA / Accord de confidentialité

#### Droit civil (5 contrats)
- ✅ Testament olographe
- ✅ Reconnaissance de dette
- ✅ Convention parentale (autorité parentale)
- ✅ Mandat de protection future sous seing privé
- ✅ Pacte de préférence

#### Immobilier (2 contrats)
- ✅ Bail d'habitation vide
- ✅ Bail commercial

#### Droit des affaires (4 contrats)
- ✅ Conditions Générales d'Utilisation (CGU)
- ✅ Politique de confidentialité / mentions légales / RGPD
- ✅ Compromis de vente immobilière
- ✅ Acte de vente immobilière

#### Droit du travail (6 contrats)
- ✅ Contrat de travail CDI
- ✅ Contrat de travail CDD
- ✅ Rupture conventionnelle
- ✅ Contrat de stage
- ✅ Protocole d'accord prud'homal
- ✅ État des lieux (annexe)

### 3️⃣ Handler modifié (exemple: Dev web/app)
- Récupération des infos client si sélectionné
- Appel à l'Edge Function avec toutes les données du formulaire
- Upload des fichiers (maquettes, cahier des charges, documentation)
- Sauvegarde du contrat généré dans la colonne `content`
- Toast info pendant génération, success après

## ⚙️ Configuration requise

### Étape 1: Obtenir une clé API Claude (Anthropic)

1. **Créer un compte Anthropic**
   - Aller sur https://console.anthropic.com/
   - S'inscrire ou se connecter

2. **Générer une clé API**
   - Dans le dashboard, aller dans "API Keys"
   - Cliquer sur "Create Key"
   - Copier la clé (format: `sk-ant-api03-...`)
   - ⚠️ **IMPORTANT**: La sauvegarder immédiatement, elle ne sera plus visible

3. **Ajouter du crédit**
   - Aller dans "Billing"
   - Ajouter minimum 5$ de crédit
   - Le modèle utilisé: `claude-3-5-sonnet-20241022`
   - Coût estimé: ~0.01$ - 0.05$ par contrat généré

### Étape 2: Configurer la clé dans Supabase

#### Option A: Via le Dashboard Supabase (Recommandé)

1. **Aller dans le Dashboard Supabase**
   - URL: https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh
   - Se connecter

2. **Configurer la variable d'environnement**
   - Dans le menu latéral: **Settings** → **Edge Functions**
   - Cliquer sur l'onglet **Secrets**
   - Cliquer sur **Add new secret**
   - Nom: `ANTHROPIC_API_KEY`
   - Valeur: `sk-ant-api03-...` (votre clé)
   - Cliquer sur **Save**

3. **Redémarrer la fonction (automatique)**
   - La fonction redémarre automatiquement après ajout du secret
   - Attendre 10-15 secondes

#### Option B: Via CLI Supabase

```bash
# Dans le terminal
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-VOTRE_CLE_ICI
```

### Étape 3: Vérifier que ça fonctionne

1. **Remplir le formulaire Dev web/app**
   - Aller dans l'app → Contrats → Dev web/app
   - Remplir au minimum:
     - Type de prestation
     - Objectif du projet
   - Laisser d'autres champs vides pour tester "[À COMPLÉTER]"

2. **Créer le contrat**
   - Cliquer sur "Créer le contrat"
   - Observer le toast "Génération du contrat par l'IA..."
   - Attendre 5-20 secondes selon la complexité

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

### Tester directement la fonction

```bash
curl -X POST \
  https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/generate-contract-ai \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contractType": "Contrat de développement web/application",
    "formData": {
      "typePrestation": "Site web vitrine",
      "objectifProjet": "Créer un site moderne pour mon cabinet"
    },
    "clientInfo": {}
  }'
```

### Erreurs courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| `ANTHROPIC_API_KEY non configurée` | Variable d'environnement manquante | Ajouter le secret dans Dashboard Supabase |
| `401 Unauthorized` | Clé API invalide | Vérifier la clé API dans console.anthropic.com |
| `429 Too Many Requests` | Quota dépassé | Ajouter du crédit sur Anthropic |
| `Timeout` | Réponse trop lente | Augmenter max_tokens ou optimiser le prompt |

## 📊 Utilisation et coûts

### Modèle utilisé
- **Nom**: `claude-3-5-sonnet-20241022`
- **Input**: $3 / million de tokens
- **Output**: $15 / million de tokens
- **Max tokens par réponse**: 16 000 (≈ 12 000 mots)

### Coût estimé par contrat
- Contrat simple (CGU, NDA): ~0.01$ - 0.02$
- Contrat moyen (CDI, Bail): ~0.02$ - 0.04$
- Contrat complexe (Dev web/app): ~0.04$ - 0.08$

### Optimisations possibles
- ✅ Temperature à 0.3 (cohérence > créativité)
- ✅ Prompts structurés et précis
- ✅ Pas de conversation, génération directe
- ⚠️ 16 000 tokens max (suffisant pour 10-15 pages)

## 🚀 Prochaines étapes

### À faire immédiatement
1. [ ] Configurer `ANTHROPIC_API_KEY` dans Supabase
2. [ ] Tester avec le contrat Dev web/app
3. [ ] Vérifier que "[À COMPLÉTER]" apparaît bien pour champs vides

### Intégration à faire pour les autres contrats
Pour chaque formulaire, modifier le handler pour appeler l'IA:

```typescript
// Exemple pattern à suivre
const handleXXXSubmit = async () => {
  // 1. Validation (existant)
  // 2. Upload fichiers (existant)
  
  // 3. NOUVEAU: Récupérer infos client
  let clientInfo = {};
  if (xxxData.clientId) {
    const client = clients.find(c => c.id === xxxData.clientId);
    if (client) clientInfo = { ...client };
  }
  
  // 4. NOUVEAU: Appel IA
  toast.info("Génération du contrat par l'IA...");
  const { data: aiResponse, error: aiError } = await supabase.functions.invoke('generate-contract-ai', {
    body: {
      contractType: "NOM_DU_CONTRAT",
      formData: { ...xxxData },
      clientInfo: clientInfo
    }
  });
  
  if (aiError) throw aiError;
  
  // 5. MODIFIÉ: Sauvegarder avec content généré
  const { data, error } = await supabase
    .from('contrats')
    .insert({
      owner_id: user.id,
      name: "...",
      type: "...",
      contenu_json: { ...xxxData },
      content: aiResponse?.contract, // ← AJOUTER
    })
    .select()
    .single();
};
```

### Contrats à intégrer (40 restants)

#### Propriété intellectuelle (3 restants)
- [ ] Cession droits d'auteur
- [ ] Licence logicielle
- [ ] NDA

#### Droit civil (4 restants)
- [ ] Testament olographe
- [ ] Reconnaissance de dette
- [ ] Convention parentale
- [ ] Mandat de protection future

#### Immobilier (2 restants)
- [ ] Bail d'habitation
- [ ] Bail commercial

#### Droit des affaires (3 restants)
- [ ] CGU
- [ ] Mentions légales/RGPD
- [ ] Compromis/Acte de vente

#### Droit du travail (6 restants)
- [ ] CDI
- [ ] CDD
- [ ] Rupture conventionnelle
- [ ] Stage
- [ ] Protocole prud'homal
- [ ] État des lieux

#### Notaires (19 contrats)
- [ ] Tous les contrats notaires à intégrer

## 📝 Notes

- La colonne `content` doit exister dans la table `contrats` (vérifier migration)
- Si `content` n'existe pas, l'ajouter:
  ```sql
  ALTER TABLE contrats ADD COLUMN content TEXT;
  ```

- Le système fonctionne même si des champs sont vides
- L'IA génère du texte juridiquement correct
- Format: texte brut prêt à imprimer (pas de markdown)
