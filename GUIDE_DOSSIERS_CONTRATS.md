# Guide Rapide - Système Dossiers & Contrats

## 🚀 Démarrage

Le système de dossiers et contrats est maintenant disponible dans l'espace collaboratif client/professionnel.

### Accès
```
/avocats/client-spaces/{client_id}
/notaires/client-spaces/{client_id}
```

## 📁 Gestion des Dossiers

### Créer un Dossier
1. Onglet "Dossiers"
2. Cliquer "Créer un dossier"
3. Remplir:
   - Titre (requis)
   - Description (optionnel)
   - Statut: En cours / En attente / Terminé
4. Cliquer "Créer le dossier"

### Ajouter des Documents à un Dossier
1. Cliquer sur l'icône 👁️ (Eye) du dossier
2. Cliquer "Ajouter"
3. Choisir la source:
   - **Personnel:** Vos documents privés
   - **Client:** Documents de l'espace partagé client
   - **Cabinet:** Documents de l'espace cabinet
4. Cocher les documents à ajouter
5. Cliquer "Ajouter (X)" pour confirmer

### Retirer un Document
1. Ouvrir le dossier
2. Cliquer sur l'icône 🗑️ (Trash) du document
3. Confirmer la suppression

## 📄 Gestion des Contrats

### Créer un Contrat
1. Onglet "Contrats"
2. Cliquer "Créer un contrat"
3. Vous serez redirigé vers `/avocats/contrats/create`
4. Le contrat sera automatiquement lié au client
5. Il apparaîtra dans l'espace collaboratif

### Visualiser un Contrat
1. Onglet "Contrats"
2. Cliquer sur l'icône 👁️ (Eye)
3. Le contenu s'affiche dans une modale

### Éditer un Contrat
1. Dans la liste ou dans la modale
2. Cliquer sur l'icône ✏️ (Edit)
3. Redirection vers l'éditeur

## 🎨 Badges et Statuts

### Statuts de Dossier
- 🔵 **En cours** - Dossier actif
- 🟡 **En attente** - En pause
- 🟢 **Terminé** - Finalisé

### Sources de Documents
- 🔵 **Personnel** - Votre espace privé
- 🟢 **Client** - Espace partagé client
- 🟣 **Cabinet** - Espace cabinet

### Statuts de Contrat
- ⚫ **Brouillon** - En préparation
- 🟡 **En attente** - Attend validation
- 🟢 **Validé** - Approuvé
- 🔵 **Signé** - Signature finalisée

## 🔐 Permissions

### Professionnel (Avocat/Notaire)
- ✅ Créer des dossiers
- ✅ Ajouter/retirer des documents
- ✅ Supprimer des dossiers
- ✅ Créer des contrats
- ✅ Éditer/supprimer des contrats

### Client
- ✅ Voir les dossiers
- ✅ Voir les documents
- ✅ Voir les contrats
- ❌ Modifier/supprimer

## 🗄️ Migration Base de Données

Pour activer le système en production :

```bash
# Appliquer la migration
cd /Users/louispgnc/Desktop/neira-pro-suite-main
node apply-migration.mjs

# Ou via Supabase CLI
supabase db push
```

**Fichier de migration:** `supabase/migrations/20260117_create_dossiers_tables.sql`

## ✅ Checklist de Test

Avant de déployer en production, testez sur localhost :

### Dossiers
- [ ] Créer un dossier
- [ ] Ajouter des documents depuis Personnel
- [ ] Ajouter des documents depuis Client
- [ ] Ajouter des documents depuis Cabinet
- [ ] Retirer un document
- [ ] Supprimer un dossier
- [ ] Vérifier les permissions client (lecture seule)

### Contrats
- [ ] Créer un contrat
- [ ] Visualiser le contrat
- [ ] Éditer le contrat
- [ ] Supprimer le contrat
- [ ] Vérifier les permissions client (lecture seule)

### Général
- [ ] Tous les badges s'affichent correctement
- [ ] Les couleurs de hover fonctionnent (bleu/rouge)
- [ ] Aucune erreur dans la console
- [ ] Responsive (mobile/tablet/desktop)

## 🐛 Dépannage

### Le dossier ne se crée pas
- Vérifier que la migration est appliquée
- Vérifier les permissions RLS dans Supabase
- Vérifier la console pour les erreurs

### Les documents ne s'ajoutent pas
- Vérifier que `dossier_documents` existe
- Vérifier les permissions sur les tables source
- Vérifier que le document existe dans la source

### Le contrat ne s'affiche pas
- Vérifier que `client_id` est bien défini
- Vérifier les permissions sur la table `contrats`
- Vérifier le champ `contenu` (JSONB avec sections)

## 📞 Support

Si vous rencontrez un problème :
1. Vérifier la console du navigateur (F12)
2. Vérifier les logs Supabase
3. Vérifier que toutes les migrations sont appliquées
4. Vérifier les permissions RLS

## 🎯 Prochaines Fonctionnalités

- [ ] Système de signatures électroniques
- [ ] Notifications temps réel
- [ ] Historique des modifications
- [ ] Recherche globale de documents
- [ ] Export de dossiers complets
- [ ] Modèles de contrats pré-configurés
