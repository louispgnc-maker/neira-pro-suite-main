# Workflow de gestion du profil client

## Vue d'ensemble

Le système permet aux clients de suggérer des modifications à leur profil, que les professionnels peuvent ensuite approuver ou rejeter. Les modifications approuvées se propagent automatiquement partout dans l'application.

## Fonctionnement

### 1. Affichage du profil

**Côté Client** (`/client-space/profile`)
- Affiche la fiche client depuis la table `clients`
- Le client peut éditer les champs et proposer des modifications
- Les modifications ne sont PAS appliquées directement

**Côté Professionnel** (`/avocats/client-spaces/{id}` - onglet Profil)
- Affiche la fiche client complète depuis la table `clients`
- Affiche les suggestions de modifications en attente
- Permet d'approuver ou rejeter les suggestions

### 2. Suggestion de modifications (Client)

1. Le client clique sur "Suggérer des modifications"
2. Modifie les champs qu'il souhaite
3. Ajoute une raison pour les modifications
4. Clique sur "Envoyer les suggestions"

**Ce qui se passe** :
```sql
INSERT INTO client_profile_suggestions (
  client_id,
  cabinet_id,
  suggested_changes,  -- Array JSON des changements
  reason,
  status -- 'pending'
)
```

### 3. Traitement des suggestions (Professionnel)

**Affichage** :
- Les suggestions en attente apparaissent en haut de l'onglet Profil
- Comparaison visuelle : ancienne valeur → nouvelle valeur
- Affiche la raison du client

**Actions possibles** :
- **Rejeter** : Change le status à 'rejected', aucune modification appliquée
- **Approuver et appliquer** : Change le status à 'approved' ET applique les modifications

**Quand approuvé** :
```sql
-- 1. Mettre à jour le statut de la suggestion
UPDATE client_profile_suggestions
SET status = 'approved',
    reviewed_by = {pro_user_id},
    reviewed_at = NOW()
WHERE id = {suggestion_id};

-- 2. Appliquer les modifications au client
UPDATE clients
SET {field1} = {new_value1},
    {field2} = {new_value2},
    ...
WHERE id = {client_id};
```

### 4. Propagation des modifications

**Une seule mise à jour dans `clients` se propage automatiquement à** :

1. **✅ Espace client partagé** (`/avocats/client-spaces/{id}`)
   - Lit directement depuis `clients`
   - Affiche instantanément les nouvelles valeurs

2. **✅ Page liste des clients** (`/avocats/clients`)
   - Lit directement depuis `clients`
   - Le client apparaît avec ses nouvelles informations

3. **✅ Espace collaboratif du cabinet** (`/avocats/espace-collaboratif`)
   - La table `cabinet_clients` contient seulement une référence (`client_id`)
   - Les requêtes font un JOIN avec `clients` pour récupérer les données
   - Donc les nouvelles valeurs sont visibles automatiquement

4. **✅ Profil du client** (`/client-space/profile`)
   - Lit directement depuis `clients`
   - Le client voit ses modifications approuvées

## Architecture des données

```
clients (table principale)
├── id (UUID)
├── owner_id (UUID) → cabinet qui possède le client
├── nom, prenom, email, etc.
└── ... autres champs du profil

cabinet_clients (table de liaison pour le partage)
├── id (UUID)
├── cabinet_id (UUID) → cabinet avec qui c'est partagé
├── client_id (UUID) → REFERENCE vers clients.id
└── shared_by, shared_at

client_profile_suggestions
├── id (UUID)
├── client_id (UUID) → REFERENCE vers clients.id
├── cabinet_id (UUID) → cabinet propriétaire
├── suggested_changes (JSONB) → [{field, current_value, suggested_value}]
├── reason (TEXT)
├── status ('pending' | 'approved' | 'rejected')
├── reviewed_by (UUID)
└── reviewed_at (TIMESTAMP)
```

## Avantages de cette architecture

1. **Source unique de vérité** : Les données du client sont dans `clients` uniquement
2. **Pas de duplication** : `cabinet_clients` ne duplique pas les données, juste la référence
3. **Mise à jour simple** : Une seule requête UPDATE propage partout
4. **Historique** : Les suggestions gardent une trace des modifications demandées
5. **Contrôle** : Le professionnel valide toutes les modifications avant application

## Workflow visuel

```
[Client]                    [Professionnel]
    |                              |
    | 1. Édite son profil          |
    | 2. Envoie suggestions -----> | 3. Reçoit notification
    |                              | 4. Consulte suggestions
    |                              | 5. Approuve/Rejette
    | 7. Voit modifications <----- | 6. UPDATE clients
    |     appliquées               |    (si approuvé)
    |                              |
    
Propagation automatique:
- /avocats/clients
- /avocats/client-spaces/{id}
- /avocats/espace-collaboratif
- /client-space/profile
```

## Notes importantes

- Les modifications sont **toujours validées** par le professionnel
- Le client **ne peut jamais** modifier directement sa fiche
- L'historique des suggestions (approuvées/rejetées) est conservé
- Les modifications se propagent **instantanément** partout après approbation
