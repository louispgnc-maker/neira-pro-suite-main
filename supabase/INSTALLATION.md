# Guide d'installation de la migration Cabinets

## 📋 Pré-requis
- Accès au Dashboard Supabase
- Base de données avec table `profiles` existante
- Fonction `set_updated_at()` existante (pour le trigger)

## 🔧 Installation

### Étape 1: Nettoyage (si migration précédente existe)
Si tu as déjà essayé d'installer cette migration :

1. Ouvre **Supabase Dashboard** → **SQL Editor**
2. Copie tout le contenu de `supabase/rollback-cabinets.sql`
3. Colle et exécute
4. Attends le message de succès ✅

### Étape 2: Installation de la migration
1. Ouvre **Supabase Dashboard** → **SQL Editor**
2. Copie tout le contenu de `supabase/migrations/2025-11-06_cabinets.sql`
3. Colle et exécute
4. Si erreur, lis le message et corrige

### Étape 3: Vérification
1. Copie tout le contenu de `supabase/test-migration.sql`
2. Colle et exécute
3. Vérifie que toutes les sections retournent des données:
   - ✅ Tables: `cabinets`, `cabinet_members`
   - ✅ Fonctions: 8 fonctions
   - ✅ Policies: 2 policies
   - ✅ Index: plusieurs index
   - ✅ Colonne `cabinet_id` dans `profiles`

## 🧪 Test dans l'application

### Test 1: Créer un cabinet
1. Connecte-toi comme avocat ou notaire
2. Va sur "Mon Profil"
3. Clique "Créer un cabinet"
4. Remplis le formulaire
5. Clique "Créer"
6. ✅ Tu dois voir ton cabinet avec un code d'accès

### Test 2: Gérer les membres
1. Copie le code d'accès
2. Clique "Inviter par email"
3. Saisis un email
4. ✅ Le membre apparaît dans la liste

### Test 3: Rejoindre un cabinet
1. Déconnecte-toi
2. Connecte-toi avec un autre compte (même rôle)
3. Va sur "Mon Profil"
4. Colle le code dans "Rejoindre un cabinet"
5. ✅ Tu dois rejoindre le cabinet

## 🐛 Dépannage

### Erreur: "cannot change name of input parameter"
➡️ Exécute le rollback puis réinstalle

### Erreur: "relation does not exist"
➡️ Vérifie que la table `profiles` existe

### Erreur: "function set_updated_at does not exist"
➡️ Crée d'abord cette fonction trigger :
```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

### Erreur: "infinite recursion detected"
➡️ C'est résolu! Utilise la dernière version du fichier migration

## 📊 Architecture de la solution

### Stratégie RLS
- **Policies simples** : Pas de récursion entre tables
  - `cabinets`: `owner_id = auth.uid()`
  - `cabinet_members`: `user_id = auth.uid()`

- **Fonctions SECURITY DEFINER** : Bypassent RLS
  - `create_cabinet()` - Création
  - `get_user_cabinets()` - Lecture
  - `get_cabinet_members()` - Lecture membres
  - `invite_cabinet_member()` - Invitation
  - `remove_cabinet_member()` - Suppression
  - `join_cabinet_by_code()` - Rejoindre
  - `regenerate_cabinet_code()` - Régénérer code

### Sécurité
- Toutes les fonctions vérifient l'authentification (`auth.uid()`)
- Vérification des permissions (owner uniquement pour gestion)
- Séparation avocat/notaire stricte
- Code d'accès unique et sécurisé

## 🎉 Fonctionnalités disponibles
- ✅ Création de cabinet avec infos légales complètes
- ✅ Code d'accès unique pour rejoindre
- ✅ Invitation de membres par email
- ✅ Gestion des membres (ajout/suppression)
- ✅ Régénération du code d'accès
- ✅ Séparation avocat/notaire
- ✅ Système de rôles (owner/admin/membre)
- ✅ Statuts d'invitation (pending/active/inactive)
