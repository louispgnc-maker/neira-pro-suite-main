# Système de Dossiers et Contrats - Espace Collaboratif

## Vue d'ensemble

Ce document décrit le système complet de gestion des dossiers et contrats dans l'espace collaboratif client/professionnel.

## Fonctionnalités implémentées

### 1. Gestion des Dossiers (`DossierManager`)

**Emplacement:** `src/components/client-space/DossierManager.tsx`

**Fonctionnalités:**
- ✅ Créer un dossier (titre, description, statut)
- ✅ Lister tous les dossiers d'un client
- ✅ Supprimer un dossier (professionnel uniquement)
- ✅ Visualiser les documents d'un dossier
- ✅ Statuts: `en_cours`, `en_attente`, `termine`

**Permissions:**
- Professionnel: Création, modification, suppression
- Client: Lecture seule

### 2. Gestion des Documents de Dossier (`DossierDocumentsManager`)

**Emplacement:** `src/components/client-space/DossierDocumentsManager.tsx`

**Fonctionnalités:**
- ✅ Afficher tous les documents d'un dossier
- ✅ Ajouter des documents depuis différentes sources
- ✅ Retirer un document du dossier (professionnel uniquement)
- ✅ Badges de source (Personnel, Client, Cabinet)
- ✅ Informations détaillées (type, taille, date d'ajout)

**Permissions:**
- Professionnel: Ajout, suppression de documents
- Client: Lecture seule

### 3. Sélection Multi-Sources (`MultiSourceDocumentSelector`)

**Emplacement:** `src/components/client-space/MultiSourceDocumentSelector.tsx`

**Fonctionnalités:**
- ✅ Sélectionner des documents depuis 3 sources:
  - 📁 **Personnel:** Documents de l'espace personnel du professionnel
  - 👥 **Client:** Documents de l'espace collaboratif avec le client
  - 🏢 **Cabinet:** Documents de l'espace collaboratif du cabinet
- ✅ Interface avec onglets pour chaque source
- ✅ Sélection multiple avec checkboxes
- ✅ Compteur de documents sélectionnés
- ✅ Filtrage et recherche par source

**Workflow:**
1. Professionnel ouvre un dossier
2. Clique sur "Ajouter" des documents
3. Sélectionne la source (Personnel/Client/Cabinet)
4. Coche les documents à ajouter
5. Confirme l'ajout
6. Documents apparaissent dans le dossier avec leur badge source

### 4. Gestion des Contrats (`ContratManager`)

**Emplacement:** `src/components/client-space/ContratManager.tsx`

**Fonctionnalités:**
- ✅ Lister tous les contrats partagés avec le client
- ✅ Créer un nouveau contrat (redirection vers `/contrats/create`)
- ✅ Visualiser le contenu d'un contrat
- ✅ Éditer un contrat (professionnel uniquement)
- ✅ Supprimer un contrat (professionnel uniquement)
- ✅ Statuts: `brouillon`, `en_attente`, `valide`, `signe`

**Permissions:**
- Professionnel: Création, modification, suppression
- Client: Lecture seule

**Workflow de création:**
1. Professionnel clique sur "Créer un contrat"
2. Redirection vers `/avocats/contrats/create?client_id={clientId}`
3. Utilise le système de création de contrat existant
4. Le contrat est automatiquement lié au client
5. Apparaît dans l'onglet "Contrats" de l'espace collaboratif

### 5. Intégration dans ClientSpaceDetail

**Emplacement:** `src/pages/ClientSpaceDetail.tsx`

**Onglets implémentés:**
1. **Dossiers:** DossierManager avec gestion complète
2. **Documents:** DocumentManager (existant)
3. **Contrats:** ContratManager avec création/import
4. **Profil:** Fiche client + suggestions (existant)
5. **Signatures:** À implémenter

## Architecture Base de Données

### Table: `dossiers`

```sql
CREATE TABLE dossiers (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  cabinet_id UUID REFERENCES cabinets(id),
  titre TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('en_cours', 'en_attente', 'termine')),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Table: `dossier_documents`

```sql
CREATE TABLE dossier_documents (
  id UUID PRIMARY KEY,
  dossier_id UUID REFERENCES dossiers(id),
  document_id UUID NOT NULL,
  document_nom TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_taille INTEGER NOT NULL,
  source TEXT CHECK (source IN ('personal', 'client_shared', 'cabinet_shared')),
  added_at TIMESTAMP,
  UNIQUE(dossier_id, document_id)
);
```

### Table: `contrats` (existante)

Utilisée pour stocker les contrats partagés avec les clients.

## Politiques RLS (Row Level Security)

### Dossiers
- **Professionnels:** Accès complet aux dossiers de leurs clients
- **Clients:** Lecture seule de leurs propres dossiers

### Documents de Dossier
- **Accès:** Basé sur l'accès au dossier parent
- **Cascade:** Suppression du dossier = suppression des liens documents

## Migration SQL

**Fichier:** `supabase/migrations/20260117_create_dossiers_tables.sql`

Pour appliquer la migration en production:

```bash
# Via Supabase CLI
supabase db push

# Ou via l'outil apply-migration.mjs
node apply-migration.mjs
```

## Composants UI Utilisés

- `Card`, `CardHeader`, `CardContent`, `CardTitle`, `CardDescription`
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter`
- `Button` avec variants (ghost, outline, default)
- `Badge` avec couleurs personnalisées
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Checkbox` pour sélection multiple
- `Input`, `Textarea`, `Label` pour formulaires

## Icônes Lucide

- `Folder` - Dossiers
- `FileSignature` - Contrats
- `FileText` - Documents
- `Plus` - Création
- `Trash2` - Suppression
- `Eye` - Visualisation
- `Edit` - Édition
- `User` - Personnel
- `Building2` - Cabinet
- `Loader2` - Chargement

## Thème de Couleurs

- **Bleu** (`bg-blue-50`, `text-blue-700`): Actions principales, badges personnel
- **Rouge** (`bg-red-50`, `text-red-700`): Actions destructives
- **Vert** (`bg-green-100`, `text-green-800`): Badges client, statut validé
- **Violet** (`bg-purple-100`, `text-purple-800`): Badges cabinet
- **Jaune** (`bg-yellow-100`, `text-yellow-800`): Statut en attente
- **Gris** (`bg-gray-100`, `text-gray-800`): Statut brouillon

## Tests à Effectuer

### 1. Dossiers
- [ ] Créer un dossier avec titre/description
- [ ] Afficher la liste des dossiers
- [ ] Ouvrir un dossier pour voir ses documents
- [ ] Supprimer un dossier (professionnel)
- [ ] Vérifier que le client voit les dossiers en lecture seule

### 2. Documents de Dossier
- [ ] Ajouter des documents depuis l'espace personnel
- [ ] Ajouter des documents depuis l'espace client
- [ ] Ajouter des documents depuis l'espace cabinet
- [ ] Vérifier les badges de source (couleurs)
- [ ] Retirer un document du dossier
- [ ] Sélectionner plusieurs documents en une fois

### 3. Contrats
- [ ] Créer un contrat depuis l'espace collaboratif
- [ ] Vérifier la redirection vers /contrats/create
- [ ] Le contrat apparaît dans l'onglet Contrats
- [ ] Visualiser le contenu d'un contrat
- [ ] Éditer un contrat (professionnel)
- [ ] Client peut voir mais pas modifier

### 4. Permissions
- [ ] Professionnel peut créer/modifier/supprimer
- [ ] Client voit tout en lecture seule
- [ ] RLS empêche l'accès non autorisé

## Prochaines Étapes

1. **Signatures:**
   - Intégrer le système de signature électronique
   - Lier les contrats aux signatures

2. **Notifications:**
   - Notifier le client quand un dossier est créé
   - Notifier le client quand un contrat est partagé

3. **Historique:**
   - Tracker les modifications de dossiers
   - Historique des ajouts/suppressions de documents

4. **Recherche:**
   - Recherche de documents dans tous les dossiers
   - Filtrage par statut, date, type

## Notes Importantes

- **Pas de commit automatique:** Les modifications sont à tester en local avant commit
- **Architecture cohérente:** Utilise get_user_cabinets RPC pour les vérifications
- **Single Source of Truth:** Table `clients` comme référence unique
- **Propagation:** Toutes les modifications se propagent via foreign keys
- **Responsive:** UI adaptée mobile/desktop avec Tailwind CSS
