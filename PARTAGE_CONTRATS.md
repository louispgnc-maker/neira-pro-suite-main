# Partage de Contrats - Espace Collaboratif

## 📋 Vue d'ensemble

Les contrats peuvent être partagés sur l'espace collaboratif du cabinet avec des **permissions en lecture seule** pour les membres. Seul le créateur du contrat peut le modifier.

## 🔐 Système de Permissions

### Pour les Contrats Partagés (`cabinet_contrats`)

| Action | Qui peut le faire | Policy SQL |
|--------|------------------|------------|
| **📖 Lire** | Tous les membres actifs du cabinet | `cabinet_members_read_contrats` |
| **➕ Partager** | Tous les membres actifs du cabinet | `cabinet_members_insert_contrats` |
| **✏️ Modifier** | **Uniquement le créateur** (`shared_by`) | `cabinet_sharer_update_contrats` |
| **🗑️ Supprimer** | Créateur OU propriétaire du cabinet | `cabinet_owner_or_sharer_delete_contrats` |

## 🚀 Comment Partager un Contrat

### Depuis la page Contrats

1. Allez dans **Contrats** (menu principal)
2. Trouvez le contrat à partager
3. Cliquez sur le bouton **Partager** (icône Share2)
4. Le contrat sera automatiquement partagé avec votre cabinet

### Interface de Partage

```tsx
<ShareToCollaborativeDialog
  itemId={contrat.id}
  itemName={contrat.name}
  itemType="contrat"
  role={role}
  onSuccess={() => {
    toast.success('Contrat partagé');
  }}
/>
```

## 👥 Comportement pour les Membres

### Créateur du Contrat
- ✅ Peut voir le contrat dans l'espace collaboratif
- ✅ Peut modifier le contrat
- ✅ Peut supprimer le contrat
- ✅ Son nom apparaît comme "Partagé par [Nom Prénom]"

### Autres Membres du Cabinet
- ✅ Peuvent voir le contrat dans l'espace collaboratif
- ✅ Peuvent lire toutes les informations
- ❌ **Ne peuvent PAS modifier** le contrat
- ❌ **Ne peuvent PAS supprimer** le contrat (sauf owner du cabinet)

### Propriétaire du Cabinet
- ✅ Peut voir tous les contrats partagés
- ✅ Peut lire toutes les informations
- ⚠️ **Ne peut PAS modifier** (même en tant qu'owner)
- ✅ Peut supprimer n'importe quel contrat partagé

## 📊 Affichage dans l'Espace Collaboratif

### Localisation
- **Page** : Espace Collaboratif (`/avocats/espace-collaboratif` ou `/notaires/espace-collaboratif`)
- **Onglet** : "Activité récente" ou "Contrats"

### Informations Affichées
```tsx
<div className="p-3 border rounded-lg">
  <p className="font-medium">{contrat.title}</p>
  <p className="text-sm">{contrat.description}</p>
  <p className="text-xs">Partagé par {sharer_name}</p>
  <p className="text-xs">Type: {contrat.contrat_type}</p>
  <p className="text-xs">Partagé le {date}</p>
  
  {/* Bouton supprimer visible uniquement pour créateur/owner */}
  {(shared_by === user.id || isCabinetOwner) && (
    <button onClick={deleteSharedItem}>
      <Trash2 />
    </button>
  )}
</div>
```

## 🗄️ Structure de la Base de Données

### Table `cabinet_contrats`

```sql
CREATE TABLE public.cabinet_contrats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_id UUID NOT NULL REFERENCES public.cabinets(id) ON DELETE CASCADE,
  
  -- Référence au contrat original
  contrat_id UUID REFERENCES public.contrats(id) ON DELETE CASCADE,
  
  -- Infos du contrat
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  contrat_type TEXT,
  
  -- Métadonnées de partage
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Index
```sql
CREATE INDEX cabinet_contrats_cabinet_idx ON cabinet_contrats(cabinet_id);
CREATE INDEX cabinet_contrats_shared_by_idx ON cabinet_contrats(shared_by);
```

## 🔒 Policies RLS (Row Level Security)

### 1. SELECT - Lecture par tous les membres
```sql
CREATE POLICY "cabinet_members_read_contrats" ON public.cabinet_contrats
  FOR SELECT USING (
    cabinet_id IN (
      SELECT cm.cabinet_id FROM cabinet_members cm
      WHERE cm.user_id = auth.uid() AND cm.status = 'active'
    )
  );
```

### 2. INSERT - Partage par tous les membres
```sql
CREATE POLICY "cabinet_members_insert_contrats" ON public.cabinet_contrats
  FOR INSERT WITH CHECK (
    cabinet_id IN (
      SELECT cm.cabinet_id FROM cabinet_members cm
      WHERE cm.user_id = auth.uid() AND cm.status = 'active'
    )
  );
```

### 3. UPDATE - Modification par le créateur uniquement ⭐
```sql
CREATE POLICY "cabinet_sharer_update_contrats" ON public.cabinet_contrats
  FOR UPDATE USING (
    shared_by = auth.uid()
  )
  WITH CHECK (
    shared_by = auth.uid()
  );
```

### 4. DELETE - Suppression par créateur ou owner
```sql
CREATE POLICY "cabinet_owner_or_sharer_delete_contrats" ON public.cabinet_contrats
  FOR DELETE USING (
    shared_by = auth.uid() OR public.is_cabinet_owner(cabinet_id, auth.uid())
  );
```

## 📝 Migrations

### Migration Principale
**Fichier** : `supabase/migrations/2025-12-31_cabinet_contrats_update_policy.sql`

Cette migration :
- ✅ Supprime les policies obsolètes permettant à tous de modifier/supprimer
- ✅ Crée la policy UPDATE restrictive (créateur uniquement)
- ✅ Garantit la lecture seule pour les autres membres

## 🧪 Tests de Vérification

### Vérifier les Policies Actives
```sql
SELECT 
  policyname, 
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '✓ Lecture par tous'
    WHEN cmd = 'INSERT' THEN '✓ Partage par tous'
    WHEN cmd = 'UPDATE' THEN '✓ Modification par créateur uniquement'
    WHEN cmd = 'DELETE' THEN '✓ Suppression par créateur/owner'
  END as permission
FROM pg_policies 
WHERE tablename = 'cabinet_contrats'
ORDER BY cmd;
```

### Test de Partage
1. **Utilisateur A** partage un contrat
2. **Utilisateur B** (membre du cabinet) peut voir le contrat
3. **Utilisateur B** ne peut PAS modifier le contrat (erreur RLS)
4. **Utilisateur A** peut modifier son contrat
5. **Owner du cabinet** peut supprimer le contrat

## 💡 Cas d'Usage

### Scénario 1 : Partage de Modèle de Contrat
Un avocat senior partage un modèle de contrat avec son équipe. Les autres membres peuvent le consulter comme référence mais ne peuvent pas le modifier accidentellement.

### Scénario 2 : Contrat en Cours
Un membre partage un contrat client en cours de rédaction. Il garde le contrôle total tout en permettant à l'équipe de le consulter.

### Scénario 3 : Supervision par l'Owner
Le propriétaire du cabinet peut voir tous les contrats partagés et supprimer ceux qui ne sont plus pertinents, sans pouvoir les modifier.

## 🔄 Synchronisation avec Contrat Original

Si le contrat partagé a un `contrat_id` :
- Les modifications du contrat original ne sont **pas** automatiquement synchronisées
- Le contrat partagé est une **copie indépendante** au moment du partage
- Pour mettre à jour, le créateur doit le faire manuellement

## 🚨 Limitations Actuelles

1. **Pas d'interface d'édition dans l'espace collaboratif** : Les contrats ne sont affichés qu'en lecture seule
2. **Pas de notifications** : Les membres ne sont pas notifiés quand un nouveau contrat est partagé
3. **Pas de versioning** : Les modifications ne sont pas historisées

## 📌 Prochaines Étapes Potentielles

- [ ] Ajouter une interface d'édition (avec vérification des permissions)
- [ ] Notifier les membres lors d'un nouveau partage
- [ ] Ajouter un système de commentaires sur les contrats partagés
- [ ] Permettre au créateur de transférer la propriété à un autre membre
- [ ] Ajouter un historique des modifications

---

**Date de création** : 31 décembre 2025
**Version** : 1.0
**Status** : ✅ En production
