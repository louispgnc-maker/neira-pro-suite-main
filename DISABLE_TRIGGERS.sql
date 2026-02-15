-- SOLUTION TEMPORAIRE: Désactiver tous les triggers sur cabinet_members

-- 1. Désactiver tous les triggers
ALTER TABLE cabinet_members DISABLE TRIGGER ALL;

-- 2. Vérifier qu'ils sont désactivés
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'cabinet_members';

-- 3. Pour les réactiver plus tard (NE PAS LANCER MAINTENANT):
-- ALTER TABLE cabinet_members ENABLE TRIGGER ALL;
