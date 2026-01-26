# Système de Notifications Client

## Vue d'ensemble

Le système de notifications permet aux clients de recevoir des alertes en temps réel sur leur espace client pour toutes les actions importantes effectuées par leur professionnel.

## Fonctionnalités

### Types de notifications

1. **`dossier_created`** - Création d'un nouveau dossier
2. **`dossier_updated`** - Modification d'un dossier (statut ou titre)
3. **`document_added`** - Ajout d'un nouveau document partagé
4. **`contrat_shared`** - Partage d'un nouveau contrat
5. **`profile_updated`** - Modification des informations du profil
6. **`new_message`** - Réception d'un nouveau message

### Composants

#### NotificationsCard
**Emplacement:** `src/components/client/NotificationsCard.tsx`

Affiche les 10 dernières notifications avec :
- Badge du nombre de notifications non lues
- Icônes différentes par type de notification
- Navigation automatique vers la ressource concernée au clic
- Mise à jour en temps réel via Supabase Realtime
- Bouton "Tout marquer comme lu"
- Horodatage relatif (Il y a 5 min, Il y a 2h, etc.)

**Props:**
```typescript
interface NotificationsCardProps {
  clientId: string;
  professionType?: 'avocat' | 'notaire';
}
```

### Base de données

#### Table `client_notifications`

```sql
CREATE TABLE client_notifications (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  reference_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

#### Fonction RPC

```sql
create_client_notification(
  p_client_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_reference_id UUID DEFAULT NULL
)
```

### Triggers automatiques

Les triggers suivants créent automatiquement des notifications :

1. **`trigger_notify_dossier_created`** 
   - Déclenché : AFTER INSERT sur `client_dossiers_new`
   - Crée une notification de type `dossier_created`

2. **`trigger_notify_dossier_updated`**
   - Déclenché : AFTER UPDATE sur `client_dossiers_new`
   - Crée une notification de type `dossier_updated` si le statut ou titre change

3. **`trigger_notify_document_added`**
   - Déclenché : AFTER INSERT sur `client_shared_documents`
   - Crée une notification de type `document_added`

4. **`trigger_notify_contrat_shared`**
   - Déclenché : AFTER INSERT/UPDATE sur `contrats`
   - Crée une notification de type `contrat_shared` quand un contrat est assigné à un client

5. **`trigger_notify_profile_updated`**
   - Déclenché : AFTER UPDATE sur `clients`
   - Crée une notification de type `profile_updated` si les infos changent

### Notifications manuelles

Pour les messages, la notification est créée manuellement dans le code :

**Fichier:** `src/pages/ClientSpaceDetail.tsx`

```typescript
await supabase.rpc('create_client_notification', {
  p_client_id: client.id,
  p_title: 'Nouveau message',
  p_message: 'Vous avez reçu un nouveau message de votre professionnel',
  p_type: 'new_message',
  p_reference_id: null,
});
```

## Intégration

### Dans le Dashboard Client

**Fichier:** `src/pages/client/ClientDashboard.tsx`

```tsx
import NotificationsCard from '@/components/client/NotificationsCard';

// Dans le composant
{clientId && (
  <NotificationsCard clientId={clientId} professionType={professionType} />
)}
```

### Navigation automatique

Lorsqu'un client clique sur une notification, il est automatiquement redirigé vers :
- **Dossiers** → `/client-space/dossiers` ou `/client-space/dossiers/:id`
- **Documents** → `/client-space/documents`
- **Contrats** → `/client-space/contrats`
- **Messages** → `/client-space/discussion`
- **Profil** → `/client-space/profile`

## Temps réel

Les notifications utilisent Supabase Realtime pour les mises à jour en direct :

```typescript
const channel = supabase
  .channel('client-notifications')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'client_notifications',
      filter: `client_id=eq.${clientId}`,
    },
    () => {
      loadNotifications();
    }
  )
  .subscribe();
```

## Installation

1. Appliquer la migration :
```bash
./apply-notifications-migration.sh
```

2. Le composant est déjà intégré dans le dashboard client

## Permissions (RLS)

- **Clients** : Peuvent voir et mettre à jour (marquer comme lu) leurs propres notifications
- **Professionnels** : Peuvent créer des notifications pour leurs clients
- Toutes les opérations sont sécurisées via Row Level Security

## Personnalisation

### Couleurs par type de professionnel

Le composant s'adapte automatiquement :
- **Avocat** : Bleu (`blue-600`)
- **Notaire** : Orange (`orange-600`)

### Limites

- Maximum 10 notifications affichées dans la carte
- Les notifications plus anciennes restent accessibles mais pas affichées
- Pas de suppression de notifications (uniquement marquer comme lu)

## Améliorations futures

- [ ] Pagination pour voir toutes les notifications
- [ ] Filtres par type de notification
- [ ] Notifications push (email, SMS)
- [ ] Paramètres de notification (activer/désactiver par type)
- [ ] Suppression de notifications
- [ ] Notifications groupées (ex: "3 nouveaux documents")
