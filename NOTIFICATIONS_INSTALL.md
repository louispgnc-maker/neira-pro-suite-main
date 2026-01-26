# 🔔 Guide d'installation - Système de Notifications Client

## Installation rapide

### 1. Appliquer la migration SQL

```bash
./apply-notifications-migration.sh
```

Cette commande va :
- Créer la table `client_notifications`
- Créer les triggers automatiques pour les dossiers, documents, contrats
- Créer la fonction RPC `create_client_notification`
- Configurer les permissions RLS

### 2. Vérifier l'intégration

Le système est déjà intégré dans :
- ✅ Dashboard client (`src/pages/client/ClientDashboard.tsx`)
- ✅ Messages professionnels (`src/pages/ClientSpaceDetail.tsx`)
- ✅ Composant NotificationsCard (`src/components/client/NotificationsCard.tsx`)

### 3. Tester

1. Connectez-vous en tant que client
2. Allez sur le dashboard
3. Vous verrez la carte "Notifications"
4. En tant que professionnel :
   - Créez un dossier pour un client
   - Ajoutez un document
   - Envoyez un message
5. Le client verra les notifications en temps réel !

## Notifications automatiques

### Déjà configurées (via triggers SQL) ✅

- **Création de dossier** → Notification automatique
- **Modification de dossier** → Notification automatique (si statut ou titre change)
- **Ajout de document** → Notification automatique
- **Partage de contrat** → Notification automatique
- **Modification de profil** → Notification automatique

### Configurées manuellement ✅

- **Nouveau message** → Notification lors de l'envoi par le professionnel

## Fonctionnalités

### Carte de notifications

- 📊 Badge avec nombre de notifications non lues
- 🔔 Icônes colorées par type d'événement
- ⏰ Horodatage relatif ("Il y a 5 min")
- 👆 Clic pour naviguer vers la ressource
- ✅ Bouton "Tout marquer comme lu"
- ⚡ Mise à jour en temps réel

### Navigation intelligente

Cliquer sur une notification redirige vers :
- Dossier → Page détail du dossier
- Document → Liste des documents
- Contrat → Liste des contrats
- Message → Discussion
- Profil → Page profil

## Personnalisation

### Couleurs

Les notifications s'adaptent au type de professionnel :
- **Avocat** : Thème bleu
- **Notaire** : Thème orange

### Textes

Pour modifier les messages de notification, éditez :
- **Triggers SQL** : `supabase/migrations/20260126_create_client_notifications.sql`
- **Messages manuels** : `src/pages/ClientSpaceDetail.tsx`

## Dépannage

### Les notifications n'apparaissent pas

1. Vérifier que la migration est appliquée :
```bash
psql "$SUPABASE_DB_URL" -c "SELECT * FROM client_notifications LIMIT 1;"
```

2. Vérifier les triggers :
```bash
psql "$SUPABASE_DB_URL" -c "SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'client_dossiers_new';"
```

3. Vérifier les permissions RLS :
```bash
psql "$SUPABASE_DB_URL" -c "SELECT * FROM pg_policies WHERE tablename = 'client_notifications';"
```

### Les notifications ne se mettent pas à jour en temps réel

Vérifier que Supabase Realtime est activé pour la table `client_notifications` dans le dashboard Supabase.

## Structure des fichiers

```
neira-pro-suite-main/
├── supabase/
│   └── migrations/
│       └── 20260126_create_client_notifications.sql  # Migration SQL
├── src/
│   ├── components/
│   │   └── client/
│   │       └── NotificationsCard.tsx                 # Composant principal
│   └── pages/
│       ├── client/
│       │   └── ClientDashboard.tsx                   # Intégration dashboard
│       └── ClientSpaceDetail.tsx                     # Messages pro
├── apply-notifications-migration.sh                   # Script d'installation
└── NOTIFICATIONS_CLIENT.md                           # Documentation complète
```

## Support

Pour plus de détails, consultez [NOTIFICATIONS_CLIENT.md](./NOTIFICATIONS_CLIENT.md)
