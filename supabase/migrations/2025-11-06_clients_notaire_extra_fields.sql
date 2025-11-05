-- Migration: add extra notaire-specific client fields (idempotent)
-- Date: 2025-11-06
-- Adds civil status, family, financial and dossier document fields.

alter table public.clients add column if not exists etat_civil text; -- Célibataire, Marié, Pacsé, Divorcé, etc.
alter table public.clients add column if not exists situation_matrimoniale text; -- Détails supplémentaires (contrat de mariage, régime)
alter table public.clients add column if not exists enfants jsonb; -- Array of { nom: text, date_naissance: date }
alter table public.clients add column if not exists revenus text; -- Informations revenus (brut/approx.)
alter table public.clients add column if not exists comptes_bancaires jsonb; -- Optionnel: liste IBAN ou références
alter table public.clients add column if not exists documents_objet jsonb; -- Liste de documents liés à l'acte (ex: compromis, titre propriété)
alter table public.clients add column if not exists justificatifs_financiers text; -- Text summary if needed

-- KYC recalculation can later consider presence of identification + consentement_rgpd + etat_civil.
