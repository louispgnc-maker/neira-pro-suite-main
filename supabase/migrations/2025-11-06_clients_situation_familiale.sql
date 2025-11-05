-- Migration: add situation_familiale (jsonb) for notaire multi-select family flags
-- Date: 2025-11-06
alter table public.clients add column if not exists situation_familiale jsonb; -- e.g. ['Contrat de mariage','Séparation de biens']
