# ✅ TODO - Mise en Production du Pipeline

## 📋 Checklist complète de déploiement

### Phase 1: Préparation (1h)

- [ ] **Lire la documentation**
  - [ ] README_PIPELINE.md (vue d'ensemble)
  - [ ] QUICK_START_PIPELINE.md (guide rapide)
  - [ ] PIPELINE_CREATION_CONTRATS.md (documentation complète)

- [ ] **Vérifier les prérequis**
  - [ ] Supabase CLI installé (`supabase --version`)
  - [ ] Node.js installé (`node --version`)
  - [ ] Connecté à Supabase (`supabase login`)
  - [ ] Accès au Dashboard Supabase

- [ ] **Backup actuel**
  - [ ] Exporter la BDD actuelle
  - [ ] Backup des Edge Functions existantes
  - [ ] Backup du code frontend actuel

---

### Phase 2: Déploiement Backend (30 min)

- [ ] **Edge Functions**
  - [ ] Exécuter `./deploy-contract-pipeline-functions.sh`
  - [ ] Vérifier le déploiement: `supabase functions list`
  - [ ] Tester clarify-contract-request via Dashboard
  - [ ] Tester audit-form-schema via Dashboard

- [ ] **Base de données**
  - [ ] Exécuter `supabase db push` ou appliquer manuellement
  - [ ] Vérifier que la table `contract_pipeline_states` existe
  - [ ] Vérifier les RLS policies activées
  - [ ] Tester un INSERT/SELECT sur la table

- [ ] **Configuration**
  - [ ] Vérifier `OPENAI_API_KEY` dans Dashboard → Edge Functions
  - [ ] Si manquante, l'ajouter
  - [ ] Tester avec une requête simple via Dashboard

---

### Phase 3: Intégration Frontend (1-2h)

- [ ] **Copier les fichiers**
  - [ ] `src/types/contractPipeline.ts`
  - [ ] `src/lib/contractPipelineManager.ts`
  - [ ] `src/lib/contractValidation.ts`
  - [ ] `src/components/contract/ContractPipelineFlow.tsx`

- [ ] **Mettre à jour ContractCreationDialog**
  - [ ] Importer `ContractPipelineFlow`
  - [ ] Ajouter l'état `showPipeline`
  - [ ] Modifier `handleGenerate` (voir EXEMPLE_INTEGRATION_PIPELINE.tsx)
  - [ ] Ajouter le callback `handlePipelineComplete`
  - [ ] Ajouter le composant `<ContractPipelineFlow />`

- [ ] **Mettre à jour Contrats.tsx**
  - [ ] Ajouter la récupération du schéma depuis sessionStorage
  - [ ] Gérer le flag `usePipeline=true` dans l'URL
  - [ ] Pré-remplir `dynamicFormData` avec le brief
  - [ ] Tester la récupération du schéma validé

- [ ] **Vérifier les imports**
  - [ ] Pas d'erreurs TypeScript
  - [ ] Pas de chemins cassés
  - [ ] Toutes les dépendances installées

---

### Phase 4: Tests (1-2h)

#### Tests unitaires

- [ ] **Validation**
  - [ ] Tester `validateFormData` avec données valides
  - [ ] Tester avec champs manquants
  - [ ] Tester avec incohérences dates
  - [ ] Tester avec montants négatifs
  - [ ] Tester les cohérences parties

- [ ] **Pipeline Manager**
  - [ ] Tester création du pipeline
  - [ ] Tester progression des étapes
  - [ ] Tester sauvegarde/chargement d'état

#### Tests d'intégration

- [ ] **Flow complet - Demande complète**
  - [ ] Type: Contrat de développement web
  - [ ] Description détaillée avec tous les champs
  - [ ] Vérifier: Pas de questions posées
  - [ ] Vérifier: Formulaire généré directement
  - [ ] Vérifier: Audit OK au premier coup
  - [ ] Vérifier: Formulaire validé

- [ ] **Flow complet - Demande incomplète**
  - [ ] Type: Compromis de vente
  - [ ] Description minimale ("Vente d'un appartement")
  - [ ] Vérifier: Questions affichées (5-10)
  - [ ] Répondre aux questions
  - [ ] Vérifier: Brief mis à jour
  - [ ] Vérifier: Formulaire généré
  - [ ] Vérifier: Audit avec corrections
  - [ ] Vérifier: Formulaire validé après corrections

- [ ] **Flow complet - Audit avec corrections**
  - [ ] Type: Contrat de travail CDI
  - [ ] Description moyenne
  - [ ] Vérifier: Audit détecte des problèmes
  - [ ] Vérifier: Corrections automatiques appliquées
  - [ ] Vérifier: Ré-audit réussit
  - [ ] Vérifier: Max 3 itérations respecté

#### Tests UI/UX

- [ ] **Barre de progression**
  - [ ] Vérifier les pourcentages corrects
  - [ ] Vérifier les icônes (✓ ⏳ ○)
  - [ ] Vérifier les labels

- [ ] **Messages**
  - [ ] Vérifier les toasts à chaque étape
  - [ ] Vérifier les messages d'erreur clairs
  - [ ] Vérifier le feedback visuel (spinners)

- [ ] **Questions dynamiques**
  - [ ] Vérifier l'affichage des badges (⚠️ ℹ️)
  - [ ] Vérifier les types d'inputs corrects
  - [ ] Vérifier les hints affichés

- [ ] **Rapport d'audit**
  - [ ] Vérifier l'affichage des problèmes
  - [ ] Vérifier les sévérités (bloquant/important/mineur)
  - [ ] Vérifier les suggestions

---

### Phase 5: Monitoring et Logs (30 min)

- [ ] **Logs client**
  - [ ] Ouvrir la console (F12)
  - [ ] Vérifier les logs à chaque étape
  - [ ] Vérifier pas d'erreurs en rouge

- [ ] **Logs serveur**
  - [ ] `supabase functions logs clarify-contract-request --tail`
  - [ ] `supabase functions logs audit-form-schema --tail`
  - [ ] Créer un contrat et observer les logs
  - [ ] Vérifier pas d'erreurs

- [ ] **BDD**
  - [ ] Vérifier que les états sont sauvegardés
  - [ ] SELECT sur `contract_pipeline_states`
  - [ ] Vérifier le format JSONB correct

---

### Phase 6: Documentation utilisateur (1h)

- [ ] **Guide utilisateur**
  - [ ] Lire GUIDE_UTILISATEUR_PIPELINE.md
  - [ ] Adapter si besoin pour votre contexte
  - [ ] Créer des captures d'écran si possible

- [ ] **Formation équipe**
  - [ ] Présentation du nouveau flow (15 min)
  - [ ] Démonstration live (15 min)
  - [ ] Q&A (15 min)
  - [ ] Documentation partagée (15 min)

- [ ] **Communication clients**
  - [ ] Email d'annonce de la nouvelle fonctionnalité
  - [ ] Guide rapide pour les clients
  - [ ] FAQ mise à jour

---

### Phase 7: Mise en production (30 min)

- [ ] **Dernière vérification**
  - [ ] Tous les tests passent
  - [ ] Pas d'erreurs dans les logs
  - [ ] Documentation à jour
  - [ ] Équipe formée

- [ ] **Déploiement**
  - [ ] Merge dans la branche principale
  - [ ] Build de production
  - [ ] Déploiement frontend
  - [ ] Vérification post-déploiement

- [ ] **Monitoring post-déploiement**
  - [ ] Observer les premiers utilisateurs
  - [ ] Monitorer les logs (1h)
  - [ ] Vérifier les performances
  - [ ] Collecter les premiers feedbacks

---

### Phase 8: Optimisation (1-2 semaines)

- [ ] **Analytics**
  - [ ] Configurer le tracking des étapes
  - [ ] Mesurer le temps moyen par étape
  - [ ] Compter les questions posées en moyenne
  - [ ] Compter les itérations d'audit

- [ ] **Ajustements**
  - [ ] Analyser les logs pour problèmes récurrents
  - [ ] Ajuster les prompts IA si besoin
  - [ ] Améliorer les messages utilisateur
  - [ ] Optimiser les règles de validation

- [ ] **Métriques de succès**
  - [ ] Taux de champs incomplets (objectif: <5%)
  - [ ] Temps de correction (objectif: <5 min)
  - [ ] Satisfaction client (objectif: 5/5)
  - [ ] Taux d'erreur juridique (objectif: <5%)

---

## 📊 Critères de validation

### Avant mise en production

✅ **Technique:**
- Tous les tests passent
- Pas d'erreurs dans les logs
- Performance acceptable (<60 sec par contrat)
- Edge Functions répondent correctement

✅ **Fonctionnel:**
- Flow complet testé sur 5+ types de contrats
- Questions pertinentes générées
- Audit détecte bien les problèmes
- Corrections automatiques fonctionnent

✅ **UX:**
- Interface claire et intuitive
- Messages compréhensibles
- Progression visible
- Erreurs explicites

✅ **Documentation:**
- Documentation technique complète
- Guide utilisateur rédigé
- Équipe formée
- FAQ disponible

---

## 🚨 Critères de rollback

Si l'un de ces problèmes survient:

❌ Taux d'erreur >20% dans les logs  
❌ Temps de réponse >120 secondes  
❌ Plus de 50% des utilisateurs bloqués  
❌ Erreurs critiques de génération de contrats  

→ Revenir à l'ancienne version et analyser

---

## 📞 Points de contact

### Technique
- **Logs:** Console navigateur + Supabase Dashboard
- **Debug:** SYNTHESE_TECHNIQUE_PIPELINE.md
- **Code:** Commentaires inline + PIPELINE_CREATION_CONTRATS.md

### Fonctionnel
- **Guide utilisateur:** GUIDE_UTILISATEUR_PIPELINE.md
- **FAQ:** À créer selon les retours

### Support
- **Urgence:** Vérifier logs + historique pipeline
- **Non-urgent:** Collecte feedback + amélioration continue

---

## 🎯 Timeline suggérée

| Jour | Phase | Durée |
|------|-------|-------|
| J1 | Préparation + Backend | 3h |
| J2 | Frontend + Tests | 4h |
| J3 | Tests complets + Doc | 3h |
| J4 | Formation équipe | 2h |
| J5 | Mise en production | 2h |
| J6-J20 | Monitoring + Optimisation | 1h/jour |

**Total:** ~2-3 jours de développement + 2 semaines de suivi

---

## ✅ Checklist finale avant GO

- [ ] Tous les tests passent ✅
- [ ] Documentation complète ✅
- [ ] Équipe formée ✅
- [ ] Logs monitoring configurés ✅
- [ ] Plan de rollback prêt ✅
- [ ] Communication clients préparée ✅

**→ GO pour production ! 🚀**

---

**Date de création:** 2 février 2026  
**Dernière mise à jour:** 2 février 2026  
**Status:** ✅ Prêt pour déploiement
