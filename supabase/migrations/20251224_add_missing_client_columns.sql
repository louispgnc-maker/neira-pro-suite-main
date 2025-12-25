-- Migration: Ajout des colonnes manquantes dans la table clients
-- Date: 2024-12-24
-- Fix: Erreur "Could not find the 'acceptation_conservation' column" lors de la création de clients
-- Update: Ajout code_postal, ville, pays, prenom

BEGIN;

-- Colonnes d'adresse
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS code_postal text,
  ADD COLUMN IF NOT EXISTS ville text,
  ADD COLUMN IF NOT EXISTS pays text DEFAULT 'France',
  ADD COLUMN IF NOT EXISTS prenom text;

-- Colonnes de consentement RGPD
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS acceptation_conservation boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS autorisation_contact boolean DEFAULT false;

-- Informations professionnelles supplémentaires
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS statut_professionnel text,
  ADD COLUMN IF NOT EXISTS telephone_professionnel text,
  ADD COLUMN IF NOT EXISTS email_professionnel text;

-- Informations financières
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS patrimoine_immobilier text,
  ADD COLUMN IF NOT EXISTS credits_en_cours text;

-- Informations de facturation
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS adresse_facturation_identique boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS adresse_facturation text,
  ADD COLUMN IF NOT EXISTS numero_tva text;

-- Informations de représentation
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS agit_nom_propre boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS nom_representant text;

-- Informations du dossier
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS objet_dossier text,
  ADD COLUMN IF NOT EXISTS description_besoin text,
  ADD COLUMN IF NOT EXISTS urgence text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS date_limite date;

-- Préférences et notes
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS preference_communication text DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS notes text;

-- Commentaires
COMMENT ON COLUMN public.clients.code_postal IS 
'Code postal de l''adresse principale';

COMMENT ON COLUMN public.clients.ville IS 
'Ville de l''adresse principale';

COMMENT ON COLUMN public.clients.pays IS 
'Pays de l''adresse principale';

COMMENT ON COLUMN public.clients.prenom IS 
'Prénom du client (séparé du nom)';

COMMENT ON COLUMN public.clients.acceptation_conservation IS 
'Consentement du client pour la conservation de ses données personnelles';

COMMENT ON COLUMN public.clients.autorisation_contact IS 
'Autorisation du client pour être contacté par le professionnel';

COMMENT ON COLUMN public.clients.statut_professionnel IS 
'Statut professionnel du client (salarié, indépendant, etc.)';

COMMENT ON COLUMN public.clients.telephone_professionnel IS 
'Téléphone professionnel du client';

COMMENT ON COLUMN public.clients.email_professionnel IS 
'Email professionnel du client';

COMMENT ON COLUMN public.clients.patrimoine_immobilier IS 
'Description du patrimoine immobilier';

COMMENT ON COLUMN public.clients.credits_en_cours IS 
'Crédits en cours du client';

COMMENT ON COLUMN public.clients.adresse_facturation_identique IS 
'Indique si l''adresse de facturation est identique à l''adresse principale';

COMMENT ON COLUMN public.clients.adresse_facturation IS 
'Adresse de facturation si différente';

COMMENT ON COLUMN public.clients.numero_tva IS 
'Numéro de TVA intracommunautaire';

COMMENT ON COLUMN public.clients.agit_nom_propre IS 
'Indique si le client agit en son nom propre ou via un représentant';

COMMENT ON COLUMN public.clients.nom_representant IS 
'Nom du représentant légal si applicable';

COMMENT ON COLUMN public.clients.objet_dossier IS 
'Objet précis du dossier';

COMMENT ON COLUMN public.clients.description_besoin IS 
'Description détaillée du besoin du client';

COMMENT ON COLUMN public.clients.urgence IS 
'Niveau d''urgence du dossier (normal, urgent, très urgent)';

COMMENT ON COLUMN public.clients.date_limite IS 
'Date limite pour traiter le dossier';

COMMENT ON COLUMN public.clients.preference_communication IS 
'Mode de communication préféré (email, téléphone, courrier)';

COMMENT ON COLUMN public.clients.notes IS 
'Notes internes sur le client';

COMMIT;
