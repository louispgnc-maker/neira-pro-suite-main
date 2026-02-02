# 🚀 Quick Start - Pipeline de Création de Contrats

## ⚡ Mise en route en 5 minutes

### Étape 1: Déployer les Edge Functions (2 min)

```bash
# Assurez-vous d'être connecté à Supabase
supabase login

# Déployer toutes les fonctions du pipeline
./deploy-contract-pipeline-functions.sh
```

✅ **Attendez:** `✅ Toutes les fonctions ont été déployées avec succès!`

---

### Étape 2: Créer la table de stockage (30 sec)

```bash
# Appliquer la migration
supabase db push
```

Ou manuellement dans le Dashboard Supabase → SQL Editor:
```sql
-- Copier/coller le contenu de:
supabase/migrations/create_pipeline_states_table.sql
```

✅ **Vérifiez:** Table `contract_pipeline_states` créée

---

### Étape 3: Vérifier OPENAI_API_KEY (30 sec)

1. Aller sur: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/functions
2. Vérifier que `OPENAI_API_KEY` est configurée
3. Si manquante, l'ajouter:
   ```
   OPENAI_API_KEY = sk-proj-...
   ```

✅ **Attendez:** Clé configurée et visible

---

### Étape 4: Intégrer dans votre code (2 min)

Ouvrir `src/components/dashboard/ContractCreationDialog.tsx` et copier le contenu de `EXEMPLE_INTEGRATION_PIPELINE.tsx`:

**Points clés à modifier:**

1. **Importer le composant:**
```tsx
import { ContractPipelineFlow } from '@/components/contract/ContractPipelineFlow';
```

2. **Ajouter l'état:**
```tsx
const [showPipeline, setShowPipeline] = useState(false);
```

3. **Modifier handleGenerate:**
```tsx
const handleGenerate = () => {
  if (!contractType) {
    toast.error("Veuillez sélectionner un type de contrat");
    return;
  }
  onOpenChange(false);
  setShowPipeline(true);  // ← Au lieu de navigate()
};
```

4. **Ajouter le callback:**
```tsx
const handlePipelineComplete = (schema: any, brief: any) => {
  sessionStorage.setItem('pipelineSchema', JSON.stringify(schema));
  sessionStorage.setItem('pipelineBrief', JSON.stringify(brief));
  navigate(`${basePath}/contrats?create=true&type=${contractType}&usePipeline=true`);
};
```

5. **Ajouter le composant:**
```tsx
<ContractPipelineFlow
  open={showPipeline}
  onOpenChange={setShowPipeline}
  contractType={contractType}
  description={description}
  role={detectedRole}
  onComplete={handlePipelineComplete}
/>
```

---

### Étape 5: Tester (1 min)

1. **Ouvrir l'application**
2. **Cliquer** sur "Créer un contrat"
3. **Sélectionner** un type (ex: "Compromis de vente")
4. **Décrire** votre besoin (ex: "Vente d'un appartement à Paris")
5. **Cliquer** "Démarrer le processus guidé"

**Vous devriez voir:**
```
[====================    ] 20%
Analyse → Questions → Formulaire → Audit → Prêt
  ⏳        ○            ○          ○      ○

🔍 Analyse de votre demande...
```

---

## 🎯 Test complet

### Scénario 1: Demande complète (pas de questions)

```
Input:
Type: Contrat de développement web
Description: "Développement d'un site e-commerce pour une boutique de vêtements.
Budget: 15000€. Durée: 3 mois. Client: Boutique Mode Paris.
Livrables: Site responsive, back-office, paiement Stripe."

Résultat attendu:
✅ Analyse → Formulaire → Audit → Prêt
(Pas de questions car infos complètes)
```

### Scénario 2: Demande incomplète (avec questions)

```
Input:
Type: Compromis de vente
Description: "Vente d'un appartement à Paris"

Résultat attendu:
✅ Analyse → ❓ Questions:
  - Quelle est l'adresse exacte du bien ?
  - Quel est le prix de vente ?
  - Quelle est la surface du bien ?
  - Nom complet du vendeur ?
  - Nom complet de l'acquéreur ?
  
→ Après réponses → Formulaire → Audit → Prêt
```

### Scénario 3: Audit avec corrections

```
Input:
Type: Contrat de travail CDI
Description: "Embauche d'un développeur"

Résultat attendu:
✅ Analyse → Formulaire → 🔍 Audit 1/3
⚠️ Problèmes détectés - correction automatique...
→ 🔍 Audit 2/3
✅ Formulaire validé !
```

---

## 🐛 Dépannage rapide

### Erreur: "OPENAI_API_KEY non configurée"

**Solution:**
1. Dashboard Supabase → Settings → Edge Functions
2. Ajouter `OPENAI_API_KEY = sk-...`
3. Redéployer: `./deploy-contract-pipeline-functions.sh`

---

### Erreur: "Edge Function not found"

**Solution:**
```bash
# Vérifier que les fonctions sont déployées
supabase functions list

# Si manquantes, redéployer
./deploy-contract-pipeline-functions.sh
```

---

### Le pipeline se bloque à "Analyse..."

**Solution:**
1. Ouvrir la console (F12)
2. Chercher les erreurs en rouge
3. Vérifier les logs:
   ```
   📋 ÉTAPE 1: Clarification...
   🤖 Appel OpenAI pour clarification...
   ```
4. Si timeout → Vérifier OPENAI_API_KEY et quota

---

### Les questions ne s'affichent pas

**Solution:**
1. Vérifier dans la console:
   ```
   needsMoreInfo: true
   questions: [...]
   ```
2. Si `questions: []` → La description était trop complète
3. Essayer avec moins d'infos pour tester

---

## 📊 Voir les logs détaillés

### Côté client (navigateur)

```typescript
// Ouvrir la console (F12) et taper:
localStorage.setItem('debug', 'true');
location.reload();
```

### Côté serveur (Edge Functions)

```bash
# Voir les logs en temps réel
supabase functions logs clarify-contract-request --tail
supabase functions logs audit-form-schema --tail
```

---

## ✅ Checklist de validation

Après l'installation, vérifiez:

- [ ] ✅ Edge Functions déployées (2)
- [ ] ✅ Table `contract_pipeline_states` créée
- [ ] ✅ `OPENAI_API_KEY` configurée
- [ ] ✅ Composant `ContractPipelineFlow` intégré
- [ ] ✅ Test avec demande complète → Pas de questions
- [ ] ✅ Test avec demande incomplète → Questions affichées
- [ ] ✅ Test complet jusqu'au formulaire validé

---

## 🎓 Prochaines étapes

Une fois que tout fonctionne:

1. **Lire la doc complète:** `PIPELINE_CREATION_CONTRATS.md`
2. **Personnaliser les règles de validation:** `src/lib/contractValidation.ts`
3. **Ajuster les prompts IA:** 
   - `supabase/functions/clarify-contract-request/index.ts`
   - `supabase/functions/audit-form-schema/index.ts`
4. **Monitorer les performances:** Dashboard Supabase → Functions

---

## 🆘 Besoin d'aide ?

1. **Console navigateur:** Erreurs côté client
2. **Logs Supabase:** Erreurs côté serveur
3. **Historique du pipeline:** `state.history` dans la console
4. **Documentation:** `PIPELINE_CREATION_CONTRATS.md`

---

**🎉 Félicitations - Votre pipeline de création de contrats est opérationnel !**
