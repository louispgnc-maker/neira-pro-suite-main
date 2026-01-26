# 🔔 Activer le temps réel pour les notifications

## Problème
Les clients ne voient pas les nouvelles notifications sans rafraîchir la page.

## Solution
Il faut activer Realtime sur la table `client_notifications` dans Supabase.

## Méthode 1 : Via le Dashboard Supabase (Recommandé)

1. Allez sur https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/database/publications
2. Cliquez sur **"supabase_realtime"**
3. Trouvez la table **"client_notifications"** dans la liste
4. **Cochez la case** à côté de `client_notifications`
5. Cliquez sur **"Save"**

## Méthode 2 : Via SQL Editor

1. Ouvrez https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/sql
2. Copiez et exécutez le contenu du fichier `enable_notifications_realtime.sql`

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE client_notifications;
```

## Vérification

Une fois activé, testez :
1. Ouvrez l'application en tant que **client** (avec les devtools ouverts pour voir la console)
2. Dans un autre onglet/navigateur, connectez-vous en tant que **professionnel**
3. Créez un nouveau dossier ou ajoutez un document pour ce client
4. **Sans rafraîchir**, la notification devrait apparaître instantanément sur le dashboard client !

Dans la console, vous devriez voir :
```
SUBSCRIBED to supabase_realtime
```

## Le code est déjà prêt !

Le composant `NotificationsCard.tsx` a déjà la configuration Realtime :
```typescript
const channel = supabase
  .channel('client-notifications')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'client_notifications',
    filter: `client_id=eq.${clientId}`,
  }, () => {
    loadNotifications();
  })
  .subscribe();
```

Il suffit juste d'activer la table dans Supabase ! ✨
