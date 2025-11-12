Titre: Secure shared storage + RPC-only writes for collaborative space

Résumé
-------
Cette PR implémente le flux sécurisé pour le partage collaboratif :

- Le frontend téléverse/copier les fichiers dans le bucket `shared-documents` sous le préfixe `<cabinetId>/...`.
- Les helpers client (`src/lib/sharedCopy.ts`) ne créent plus de lignes `cabinet_*` ; ils renvoient uniquement `{ uploadedBucket, publicUrl }`.
- Les écritures en base (création/maj des `cabinet_documents`, `cabinet_clients`, `cabinet_dossiers`, `cabinet_contrats`) sont effectuées par des RPC SECURITY DEFINER (ex : `share_document_to_cabinet_with_url`, `share_client_to_cabinet_with_url`, ...), appelées depuis le frontend après upload.
- Ajout d'un script `supabase/scripts/backfill_shared_docs.js` pour migrer les objets existants vers la convention `<cabinetId>/...` et mettre à jour les lignes `cabinet_documents` (doit être exécuté avec la clé service-role).
- Ajout d'un fichier de migration commenté `supabase/migrations/2025-11-13_storage_objects_rls_owner_required.sql` contenant les policies RLS à appliquer sur `storage.objects` (doit être exécuté par le propriétaire DB).

Actions demandées au propriétaire / reviewer
------------------------------------------
1. Exécuter en tant que propriétaire les statements RLS dans `supabase/migrations/2025-11-13_storage_objects_rls_owner_required.sql` (ou coller le SQL depuis `supabase/OWNER_ACTIONS.md`) pour activer RLS sur `storage.objects`.
2. Vérifier que les fonctions RPC existent et que `GRANT EXECUTE` a été accordé à `authenticated` (les migrations existantes incluent déjà certains GRANT, merci de vérifier).
3. (Optionnel) Lancer le script de backfill :

   Pré-requis :
   - Node.js installé
   - Installer la dépendance : `npm install @supabase/supabase-js`
   - Exporter les variables d'environnement :

```
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
node supabase/scripts/backfill_shared_docs.js --dry-run
```

   Puis sans `--dry-run` quand prêt.

4. Tester le flux complet : partager un document et vérifier qu'il est accessible par les membres du cabinet.

Notes
-----
- Le propriétaire doit appliquer les policies RLS sur `storage.objects` — une étape manuelle / owner-only. J'ai documenté ceci dans `supabase/OWNER_ACTIONS.md`.
- Si vous préférez que je crée le PR (ou complète la description sur GitHub), dites-moi et je l'ouvre avec le contenu ci-dessus.
