# Édition de Dossiers

## Vue d'ensemble

Les utilisateurs peuvent maintenant modifier les dossiers après leur création dans l'espace personnel. Cette fonctionnalité permet de mettre à jour :
- Le titre du dossier
- La description
- Le statut (Prospect, Nouveau, En cours, etc.)
- Les clients associés
- Les contrats associés
- Les documents associés

## Interface utilisateur

### Accès à la modification

Dans la liste des dossiers, chaque ligne possède un menu contextuel (⋮) avec les options :
- **Voir** : Ouvre la page de détail du dossier
- **Modifier** : Ouvre le dialogue d'édition (disponible uniquement pour les dossiers créés par l'utilisateur, pas les dossiers partagés)
- **Supprimer** : Supprime le dossier (selon les permissions)

### Dialogue de modification

Le dialogue d'édition reprend la même structure que le dialogue de création :

```tsx
<Dialog open={editMode} onOpenChange={...}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Modifier le dossier</DialogTitle>
    </DialogHeader>
    
    {/* Champs de modification */}
    - Titre (Input)
    - Statut (Select)
    - Description (Textarea)
    - Clients (Checkboxes)
    - Contrats (Checkboxes)
    - Documents (Checkboxes)
    
    {/* Boutons d'action */}
    - Annuler : Ferme le dialogue sans sauvegarder
    - Enregistrer : Sauvegarde les modifications
  </DialogContent>
</Dialog>
```

## Fonctionnalités techniques

### États de gestion

```tsx
const [editMode, setEditMode] = useState(false);
const [editingDossierId, setEditingDossierId] = useState<string | null>(null);
const [editTitle, setEditTitle] = useState('');
const [editDescription, setEditDescription] = useState('');
const [editStatus, setEditStatus] = useState('En cours');
const [editSelectedClients, setEditSelectedClients] = useState<string[]>([]);
const [editSelectedContrats, setEditSelectedContrats] = useState<string[]>([]);
const [editSelectedDocuments, setEditSelectedDocuments] = useState<string[]>([]);
```

### Fonction handleEdit()

Charge les données du dossier à modifier :

```tsx
const handleEdit = async (dossier: DossierRow) => {
  // 1. Initialiser les états avec les données du dossier
  setEditingDossierId(dossier.id);
  setEditTitle(dossier.title);
  setEditStatus(dossier.status);
  
  // 2. Charger la description complète depuis la DB
  const { data: details } = await supabase
    .from('dossiers')
    .select('description')
    .eq('id', dossier.id)
    .single();
  
  // 3. Charger les associations (clients, contrats, documents)
  const [clientsRes, contratsRes, documentsRes] = await Promise.all([
    supabase.from('dossier_clients').select('client_id').eq('dossier_id', dossier.id),
    supabase.from('dossier_contrats').select('contrat_id').eq('dossier_id', dossier.id),
    supabase.from('dossier_documents').select('document_id').eq('dossier_id', dossier.id),
  ]);
  
  // 4. Mettre à jour les états et ouvrir le dialogue
  setEditMode(true);
}
```

### Fonction saveEdit()

Sauvegarde les modifications du dossier :

```tsx
const saveEdit = async () => {
  // 1. Validation
  if (!editTitle.trim()) {
    toast.error('Titre requis');
    return;
  }
  
  // 2. Mise à jour du dossier
  await supabase
    .from('dossiers')
    .update({ title: editTitle, description: editDescription, status: editStatus })
    .eq('id', editingDossierId)
    .eq('owner_id', user.id);
  
  // 3. Mise à jour des associations
  // Stratégie : Supprimer toutes les associations puis réinsérer
  await supabase.from('dossier_clients').delete().eq('dossier_id', editingDossierId);
  await supabase.from('dossier_contrats').delete().eq('dossier_id', editingDossierId);
  await supabase.from('dossier_documents').delete().eq('dossier_id', editingDossierId);
  
  // Réinsérer les nouvelles associations
  if (editSelectedClients.length > 0) {
    const rows = editSelectedClients.map((client_id) => ({ ... }));
    await supabase.from('dossier_clients').insert(rows);
  }
  // Idem pour contrats et documents
  
  // 4. Synchronisation clients <-> contrats
  // Même logique que lors de la création
  
  // 5. Rafraîchir la liste et fermer le dialogue
  setEditMode(false);
  setRefreshTrigger((prev) => prev + 1);
}
```

### Fonction cancelEdit()

Réinitialise tous les états d'édition :

```tsx
const cancelEdit = () => {
  setEditMode(false);
  setEditingDossierId(null);
  setEditTitle('');
  setEditDescription('');
  setEditStatus('En cours');
  setEditSelectedClients([]);
  setEditSelectedContrats([]);
  setEditSelectedDocuments([]);
};
```

## Restrictions de sécurité

1. **Ownership** : Seul le propriétaire du dossier (`owner_id = user.id`) peut le modifier
2. **Dossiers partagés** : Le bouton "Modifier" n'apparaît pas pour les dossiers partagés depuis l'espace collaboratif (`_shared !== true`)
3. **Validation** : Le titre est obligatoire (vérification côté client et base de données)

## Base de données

### Table dossiers

```sql
UPDATE dossiers
SET 
  title = 'nouveau_titre',
  description = 'nouvelle_description',
  status = 'nouveau_status'
WHERE id = 'dossier_id' AND owner_id = 'user_id';
```

### Tables d'association

Les associations sont mises à jour via une stratégie de suppression/réinsertion :

```sql
-- Suppression
DELETE FROM dossier_clients WHERE dossier_id = 'dossier_id';
DELETE FROM dossier_contrats WHERE dossier_id = 'dossier_id';
DELETE FROM dossier_documents WHERE dossier_id = 'dossier_id';

-- Réinsertion
INSERT INTO dossier_clients (owner_id, dossier_id, client_id, role)
VALUES ('user_id', 'dossier_id', 'client_id_1', 'avocat'),
       ('user_id', 'dossier_id', 'client_id_2', 'avocat');
-- Idem pour dossier_contrats et dossier_documents
```

## Synchronisation automatique

Comme lors de la création, lorsque des clients ET des contrats sont associés à un dossier, le système crée automatiquement les liens dans la table `client_contrats` :

```tsx
if (editSelectedClients.length > 0 && editSelectedContrats.length > 0) {
  // Récupérer les liens existants
  const { data: existing } = await supabase
    .from('client_contrats')
    .select('client_id,contrat_id')
    .in('client_id', editSelectedClients)
    .in('contrat_id', editSelectedContrats);
  
  // Calculer les nouveaux liens à créer
  const toInsert = [];
  for (const clientId of editSelectedClients) {
    for (const contratId of editSelectedContrats) {
      if (!existingSet.has(`${clientId}|${contratId}`)) {
        toInsert.push({ owner_id, client_id: clientId, contrat_id: contratId, role });
      }
    }
  }
  
  // Insérer les nouveaux liens
  if (toInsert.length > 0) {
    await supabase.from('client_contrats').insert(toInsert);
  }
}
```

## Notifications utilisateur

- ✅ **Succès** : "Dossier mis à jour"
- ❌ **Erreur** : "Titre requis" (si le titre est vide)
- ❌ **Erreur** : "Erreur mise à jour" (si la sauvegarde échoue)

## Rafraîchissement des données

Après la sauvegarde :
1. La liste des dossiers est rechargée depuis la base de données
2. Le compteur d'associations est recalculé
3. Le trigger `refreshTrigger` est incrémenté pour forcer le rechargement des composants enfants

## Tests recommandés

1. **Modification basique** :
   - Ouvrir un dossier en édition
   - Modifier le titre, la description, le statut
   - Sauvegarder et vérifier les changements

2. **Modification des associations** :
   - Ajouter/retirer des clients, contrats, documents
   - Vérifier que les compteurs sont mis à jour
   - Vérifier la synchronisation client-contrat

3. **Annulation** :
   - Ouvrir un dossier en édition
   - Modifier des champs
   - Cliquer sur "Annuler"
   - Vérifier que rien n'a été sauvegardé

4. **Validation** :
   - Essayer de sauvegarder avec un titre vide
   - Vérifier que l'erreur est affichée

5. **Permissions** :
   - Vérifier que le bouton "Modifier" n'apparaît pas pour les dossiers partagés
   - Vérifier que seul le propriétaire peut modifier

## Différences avec la création

| Aspect | Création | Édition |
|--------|----------|---------|
| Dialogue | "Nouveau dossier" | "Modifier le dossier" |
| Bouton | "Créer" | "Enregistrer" |
| États | `title`, `description`, etc. | `editTitle`, `editDescription`, etc. |
| Fonction | `createDossier()` | `saveEdit()` |
| Ouverture | Bouton "Nouveau dossier" | Menu contextuel > "Modifier" |
| Fermeture | `resetForm()` | `cancelEdit()` |
| Chargement | Pas de chargement | Charge depuis la DB |
| Associations | INSERT uniquement | DELETE + INSERT |
| Visibilité | Toujours visible | Caché pour dossiers partagés |

## Fichiers modifiés

- `src/pages/Dossiers.tsx` : Ajout des états d'édition, fonctions handleEdit/saveEdit/cancelEdit, dialogue d'édition, bouton "Modifier"

## Compatibilité

Cette fonctionnalité est compatible avec :
- ✅ Espace personnel (avocats et notaires)
- ✅ Dossiers créés par l'utilisateur
- ❌ Dossiers partagés depuis l'espace collaboratif (lecture seule)

## Évolutions futures possibles

1. **Historique des modifications** : Enregistrer qui a modifié quoi et quand
2. **Permissions granulaires** : Permettre de partager avec droit de modification
3. **Validation avancée** : Vérifier les conflits de statut ou de dates
4. **Notification aux membres** : Notifier les membres d'un cabinet quand un dossier partagé est modifié
5. **Édition inline** : Permettre de modifier certains champs directement dans la table
