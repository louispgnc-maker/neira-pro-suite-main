-- Vérifier pourquoi louis.poignonec@essca.eu ne voit rien

-- 1. Trouver le user_id
SELECT id, email FROM auth.users WHERE email = 'louis.poignonec@essca.eu';

-- 2. Voir ses cabinet_members
SELECT cm.*, c.nom as cabinet_nom, c.code_acces
FROM cabinet_members cm
LEFT JOIN cabinets c ON cm.cabinet_id = c.id
WHERE cm.email = 'louis.poignonec@essca.eu';

-- 3. Voir tous les cabinets "poignonec"
SELECT * FROM cabinets WHERE nom ILIKE '%poignonec%';

-- 4. Comparer avec le cabinet "Cabinet test"
SELECT * FROM cabinets WHERE code_acces = 'D8771447';

-- 5. Voir tous les membres du cabinet avec code D8771447
SELECT cm.email, cm.role_cabinet, c.nom
FROM cabinet_members cm
JOIN cabinets c ON cm.cabinet_id = c.id
WHERE c.code_acces = 'D8771447';
