-- Vérifier tous les triggers sur cabinet_members

-- 1. Liste des triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'cabinet_members';

-- 2. Définition complète des triggers (si existe)
SELECT 
    n.nspname as schema_name,
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'cabinet_members'
AND NOT t.tgisinternal;

-- 3. Désactiver temporairement tous les triggers (DÉCOMMENTER si besoin)
-- ALTER TABLE cabinet_members DISABLE TRIGGER ALL;
