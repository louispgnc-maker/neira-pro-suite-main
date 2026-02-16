# 🎯 Roadmap Finalisation - Neira

## ✅ FAIT
- ✅ Sécurité RLS activée sur toutes les tables
- ✅ Migration des contrats (dossier_contrats)
- ✅ Architecture de base complète
- ✅ Pipeline création contrats IA

---

## 🔴 CRITIQUE (avant mise en prod)

### 1. Stripe - Gestion d'abonnement (2-3h)

**Fonctionnalités manquantes essentielles :**

#### A. Changement d'abonnement (1h)
- [ ] Edge Function `update-subscription-plan`
- [ ] UI dans Subscription.tsx pour changer de plan
- [ ] Gestion du prorata automatique
- [ ] Validation des contraintes (membres vs plan)

**Fichier :** `supabase/functions/update-subscription-plan/index.ts`

#### B. Annulation d'abonnement (45 min)
- [ ] Edge Function `cancel-subscription` 
- [ ] UI de confirmation dans Subscription.tsx
- [ ] Option : annulation immédiate vs fin de période
- [ ] Email de confirmation d'annulation

**Fichier :** `supabase/functions/cancel-subscription/index.ts`

#### C. Réactivation d'abonnement (30 min)
- [ ] Bouton "Réactiver" dans Subscription.tsx
- [ ] Appel à Stripe pour réactiver
- [ ] Mise à jour du statut cabinet

**Code inline dans Subscription.tsx**

---

## 🟡 IMPORTANT (court terme)

### 2. Tests fonctionnels complets (1-2h)

- [ ] Tester création compte Avocat/Notaire
- [ ] Tester souscription Essentiel/Pro/Cabinet+
- [ ] Tester création client, dossier, contrat
- [ ] Tester partage cabinet
- [ ] Tester formulaire public client
- [ ] Tester signatures électroniques
- [ ] Tester limite stockage/quotas

### 3. Vérifications sécurité (30 min)

- [ ] Relancer `mcp_supabase_get_advisors` après RLS
- [ ] Vérifier aucun warning CRITIQUE
- [ ] Tester accès non autorisé (autre user)
- [ ] Vérifier Storage RLS

### 4. Performance (30 min)

- [ ] Vérifier index sur tables principales
- [ ] Tester requêtes lentes (EXPLAIN ANALYZE)
- [ ] Optimiser les JOINs si nécessaire

---

## 🟢 BON À AVOIR (moyen terme)

### 5. Stripe - Fonctionnalités avancées (2-3h)

- [ ] Codes promo/réductions
- [ ] Gestion échecs de paiement (retry logic)
- [ ] Emails transactionnels personnalisés
- [ ] Dashboard analytics paiements

### 6. Pipeline contrats - Déploiement complet

Suivre `TODO_MISE_EN_PRODUCTION.md` :
- [ ] Tests Edge Functions pipeline
- [ ] Tests UI ContractPipelineFlow
- [ ] Tests bout en bout création contrat

### 7. Documentation (1h)

- [ ] README.md utilisateur final
- [ ] Guide déploiement production
- [ ] Guide backup/restore

---

## 📊 Estimation temps total

- **Critique** : 3-4h
- **Important** : 2-3h  
- **Bon à avoir** : 3-4h

**TOTAL AVANT PROD** : ~6-8h de travail

---

## 🚀 Ordre d'exécution recommandé

1. **Maintenant** → Stripe annulation/changement plan (critique user)
2. **Après** → Tests fonctionnels complets
3. **Après** → Vérifications sécurité finales
4. **Optionnel** → Reste selon priorité business
