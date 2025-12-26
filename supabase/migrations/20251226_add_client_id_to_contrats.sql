-- Migration pour ajouter la colonne client_id à la table contrats
-- Cette colonne permet d'assigner un client à un contrat

-- Ajout de la colonne client_id avec référence à la table clients
ALTER TABLE public.contrats 
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Index pour améliorer les performances des requêtes sur client_id
CREATE INDEX IF NOT EXISTS contrats_client_id_idx ON public.contrats(client_id);

-- Commentaire explicatif
COMMENT ON COLUMN public.contrats.client_id IS 'ID du client assigné à ce contrat (optionnel)';
