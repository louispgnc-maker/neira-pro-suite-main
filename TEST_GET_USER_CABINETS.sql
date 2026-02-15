-- Tester get_user_cabinets pour louis.poignonec@essca.eu

-- Se connecter en tant que cet utilisateur (simuler)
SET LOCAL "request.jwt.claims" = '{"sub": "7aa5fa13-9c3c-4aba-ad88-f9ceef06a9c"}';

-- Tester la fonction
SELECT * FROM get_user_cabinets();

-- Reset
RESET ALL;
