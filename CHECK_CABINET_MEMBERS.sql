-- Voir tous les membres du cabinet avec code D8771447
SELECT 
  cm.id,
  cm.cabinet_id,
  cm.user_id,
  cm.email,
  cm.nom,
  cm.status,
  cm.joined_at,
  c.nom as cabinet_nom,
  c.code_acces
FROM cabinet_members cm
JOIN cabinets c ON c.id = cm.cabinet_id
WHERE c.code_acces = 'D8771447'
ORDER BY cm.created_at DESC;
