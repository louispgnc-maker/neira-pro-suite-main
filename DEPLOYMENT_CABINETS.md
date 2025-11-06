# Guide de déploiement - Cabinets

## Migration SQL à appliquer

Pour activer la fonctionnalité de gestion des cabinets, vous devez exécuter la migration SQL sur votre projet Supabase.

### Étapes :

1. **Ouvrir le SQL Editor dans Supabase**
   - Aller sur [app.supabase.com](https://app.supabase.com)
   - Sélectionner votre projet
   - Cliquer sur "SQL Editor" dans le menu de gauche

2. **Exécuter la migration**
   - Copier tout le contenu du fichier `supabase/migrations/2025-11-06_cabinets.sql`
   - Coller dans le SQL Editor
   - Cliquer sur "Run" pour exécuter

3. **Vérification**
   - Aller dans "Table Editor"
   - Vérifier que les tables suivantes existent :
     - `cabinets`
     - `cabinet_members`
   - Vérifier que la colonne `cabinet_id` a été ajoutée à la table `profiles`

## Fonctionnalités

### Pour les utilisateurs :

1. **Rejoindre un cabinet**
   - Aller dans "Mon profil"
   - Saisir le code d'invitation fourni par le cabinet
   - Cliquer sur "Rejoindre"

2. **Créer un cabinet**
   - Aller dans "Mon profil"
   - Cliquer sur "Créer un cabinet"
   - Remplir le formulaire avec les informations légales
   - Un email de vérification sera envoyé (à implémenter)
   - Une fois vérifié, le cabinet est actif

3. **Gérer un cabinet** (propriétaire uniquement)
   - Code d'accès : partageable avec les employés
   - Régénérer le code si nécessaire
   - Inviter des membres par email
   - Voir la liste des membres
   - Retirer des membres

### Séparation Avocat/Notaire

- Les cabinets d'avocats et de notaires sont **complètement séparés**
- Un utilisateur avocat ne peut rejoindre qu'un cabinet d'avocat
- Un utilisateur notaire ne peut rejoindre qu'un cabinet de notaire
- Le rôle est vérifié lors de la création et de l'adhésion

## TODO - Fonctionnalités à implémenter

1. **Email de vérification**
   - Créer une Edge Function Supabase pour envoyer les emails
   - Route de vérification : `/verify-cabinet?token=xxx`
   - Mettre à jour `email_verified` après validation

2. **Email d'invitation**
   - Envoyer automatiquement un email quand un membre est invité
   - Lien d'inscription avec pré-remplissage du code cabinet

3. **Notifications**
   - Notifier les membres quand ils sont ajoutés à un cabinet
   - Notifier le propriétaire quand un nouveau membre rejoint

4. **Permissions et rôles avancés**
   - Admin : peut inviter et retirer des membres
   - Membre : accès lecture seule
   - Partage des clients/documents entre membres d'un même cabinet (future feature)

## Notes de sécurité

- Les RLS (Row Level Security) sont activées sur toutes les tables
- Seul le propriétaire peut modifier les informations du cabinet
- Les membres peuvent voir les autres membres du même cabinet
- Le code d'accès est unique et peut être régénéré à tout moment
