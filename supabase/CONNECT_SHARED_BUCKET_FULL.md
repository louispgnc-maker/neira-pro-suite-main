# Connect / Migrate shared documents bucket (détails et procédure)

Ce document décrit, étape par étape, comment arrêter les erreurs « Partagé (fallback) ... Bucket not found » affichées par l'application en :

- utilisant un bucket `shared-documents` existant et en copiant les objets nécessaires dedans, ou
- en corrigeant les champs `file_url` dans la base de données pour pointer vers des chemins accessibles.

Important : les scripts de migration nécessitent une clé de service (SERVICE ROLE) Supabase. Ne partagez jamais cette clé publiquement.

## Résumé de la stratégie recommandée

1) Diagnostiquer : vérifier s'il existe des références à `shared-documents` / `shared_documents` dans la BDD.
2) Dry-run : exécuter les scripts de migration en mode lecture seule / simulation pour revoir les actions prévues.
3) Exécution sécurisée : lancer la migration réelle depuis un environnement sûr (votre poste ou un runner CI sécurisé) avec la clé service-role exportée.
4) Vérifier et valider : contrôler que les objets ont été copiés et que l'app n'affiche plus d'erreurs.

## 1) Diagnostic (exemples de requêtes)

Exécutez ces requêtes en local via psql ou directement dans le SQL editor de Supabase :

### Liste basique (cabinet_documents)

```sql
SELECT id, cabinet_id, document_id, file_url
FROM public.cabinet_documents
WHERE file_url ILIKE '%shared-documents/%' OR file_url ILIKE '%shared_documents/%';
```

### Scan exhaustif (suggestion)

Copiez/collez le script `tools/run_shared_scan.sql` dans l'éditeur SQL Supabase et exécutez-le ; il renverra un échantillon (read-only, non destructif) des colonnes text/json/jsonb contenant les motifs.

Si vous ne pouvez pas exécuter le SQL ci-dessus, utilisez le script Node fourni :

```bash
# nécessite SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
node tools/run_shared_scan.cjs
```

Résultat attendu : liste des lignes (table/colonne/id) contenant `shared-documents/` ou `shared_documents/` avec un extrait de la valeur.

## 2) Dry-run de la migration (recommandé)

Le dépôt contient un wrapper safe `tools/migrate-shared-bucket.*` qui supporte `--dry-run`.

Depuis la racine du repo :

```bash
# affiche ce que ferait la migration, sans modifier la BDD ni le storage
node tools/migrate-shared-bucket.cjs --dry-run
```

Note : le mode `--dry-run` n'a pas besoin de la clé service-role si le script est bien écrit pour simuler localement ; s'il réclame la clé pour certaines vérifications, exportez la clé dans votre shell (voir section suivante) mais gardez-la secrète.

## 3) Exécution sécurisée (run)

Si le dry-run est satisfaisant, exécutez la migration réelle depuis un poste sécurisé :

```bash
export SUPABASE_URL="https://<PROJECT_REF>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="svc_..."
node tools/migrate-shared-bucket.cjs --run
```

Ce wrapper lance les scripts qui :
- lisent les lignes candidates dans la BDD,
- copient les objets depuis `documents` vers `shared-documents` (ou l'inverse selon la stratégie),
- mettent à jour les colonnes `file_url` / `storage_path` dans la BDD (en utilisant le rôle service pour bypasser RLS lorsque nécessaire).

Gardez une sauvegarde DB avant d'exécuter la migration (export SQL ou snapshot Supabase).

## 4) Vérifications post-migration

- Vérifiez que le bucket `shared-documents` existe et contient les objets copiés.
- Lancer un contrôle aléatoire : dans l'app, ouvrir quelques documents partagés et vérifier qu'ils s'affichent.
- Relancer le scan `tools/run_shared_scan.cjs` pour s'assurer qu'il n'y a plus de références cassées.

## Option : ne pas copier les objets, corriger les URLs

Si vous préférez ne pas copier les fichiers, vous pouvez corriger les URL en base (opération data-only). Exemple :

```sql
UPDATE public.cabinet_documents
SET file_url = replace(file_url, 'shared-documents/', 'documents/')
WHERE file_url ILIKE '%shared-documents/%';
```

Attention : assurez-vous que les objets sont bien présents dans `documents/` et que les policies RLS/autorisations permettent l'accès.

## RLS / Permissions — points importants

- Les clés client (anon/public) sont limitées par les Row-Level Security (RLS). Les écritures côté client vers des tables protégées retournent souvent `new row violates row-level security policy` (403). Pour créer des lignes `cabinet_*` ou copier des métadonnées, utilisez une RPC serveur ou la clé service-role.
- La migration que nous fournissons doit être exécutée avec la clé service-role (ou via un service backend) pour effectuer des INSERT/UPDATE qui nécessitent des privilèges élevés.

## Vérifier et lister les buckets Storage

Si vous voulez vérifier les buckets directement depuis le shell (avec la clé service-role exportée) :

```bash
# petit script Node (utilise supabase-js) -> tools/list-buckets.cjs
node tools/list-buckets.cjs
```

Le script retournera la liste des buckets et vous permettra de vérifier l'existence de `shared-documents`.

## Rollback & sauvegarde

- Avant d'exécuter la migration réelle, faites une sauvegarde de la BDD (export SQL) et, si possible, un dump du storage.
- Si la migration modifie des rows, gardez la liste des modifications (le wrapper peut stocker un plan) pour pouvoir annuler avec un script inverse si nécessaire.

## Comment ré-activer le partage côté client (si souhaité)

1) Recréez le bucket `shared-documents` si nécessaire.
2) Exécutez la migration pour copier les objets et mettre à jour les `file_url`.
3) Assurez-vous que la fonction Edge `get-signed-url` (si utilisée) est active et que sa logique d'auth est correcte.
4) Si vous voulez autoriser certains uploads directs dans le bucket partagé, adaptez les policies RLS / Storage pour restreindre l'accès.

## Sécurité — rappel

- Ne mettez jamais la clé service-role dans le dépôt.
- Utilisez les variables d'environnement dans un shell sécurisé et supprimez-les après usage :

```bash
unset SUPABASE_SERVICE_ROLE_KEY
unset SUPABASE_URL
```

---

Si vous voulez, je peux :
- exécuter la liste des buckets maintenant (j'ai la clé exportée dans votre terminal),
- générer un playbook de rollback basé sur le dry-run,
- ou simplifier les messages UI supplémentaires pour masquer complètement les fallbacks client.
