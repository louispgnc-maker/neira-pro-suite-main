-- Vérifier les cabinet_members directement

-- 1. Tous les membres du cabinet avec code D8771447
SELECT 
  cm.*,
  c.nom as cabinet_nom,
  c.code_acces
FROM cabinet_members cm
JOIN cabinets c ON cm.cabinet_id = c.id
WHERE c.code_acces = 'D8771447';

-- 2. Avec les profiles
SELECT 
  cm.id,
  cm.email,
  cm.user_id,
  cm.cabinet_id,
  c.nom as cabinet_nom,
  p.first_name,
  p.last_name
FROM cabinet_members cm
JOIN cabinets c ON cm.cabinet_id = c.id
LEFT JOIN profiles p ON cm.user_id = p.id
WHERE c.code_acces = 'D8771447';
