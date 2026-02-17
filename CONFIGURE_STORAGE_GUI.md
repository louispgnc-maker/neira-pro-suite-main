# Configuration du Storage - Interface Graphique

## ⚠️ Le SQL ne fonctionne pas directement - utilisez l'interface graphique

### Étape 1: Créer le bucket (si nécessaire)

1. Allez sur: https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/storage/buckets
2. Si le bucket "documents" n'existe pas, cliquez sur "New bucket"
   - Name: `documents`
   - Public bucket: **DÉCOCHÉ** (privé)
   - Cliquez sur "Create bucket"

### Étape 2: Configurer les politiques RLS

1. Allez sur: https://supabase.com/dashboard/project/elysrdqujzlbvnjfilvh/storage/policies
2. Sélectionnez le bucket "documents"
3. Cliquez sur "New Policy"

**Créez 4 politiques :**

#### Politique 1: Upload (INSERT)
- Policy name: `Users can upload to their own folder`
- Allowed operation: `INSERT`
- Policy definition:
```sql
(bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
```

#### Politique 2: Read (SELECT)
- Policy name: `Users can read their own files`
- Allowed operation: `SELECT`
- Policy definition:
```sql
(bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
```

#### Politique 3: Update
- Policy name: `Users can update their own files`
- Allowed operation: `UPDATE`
- Policy definition:
```sql
(bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
```

#### Politique 4: Delete
- Policy name: `Users can delete their own files`
- Allowed operation: `DELETE`
- Policy definition:
```sql
(bucket_id = 'documents'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
```

### ✅ C'est tout !

Après avoir créé ces 4 politiques, le téléchargement PDF fonctionnera correctement.
