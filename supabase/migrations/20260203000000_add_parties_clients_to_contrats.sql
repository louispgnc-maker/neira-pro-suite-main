-- Ajouter un champ JSON pour stocker les clients par partie
-- Format: { "Le franchiseur": "uuid-client-1", "Le franchisé": "uuid-client-2" }

alter table public.contrats add column if not exists parties_clients jsonb default '{}'::jsonb;

-- Index pour améliorer les requêtes JSON
create index if not exists contrats_parties_clients_idx on public.contrats using gin (parties_clients);

-- Commentaire
comment on column public.contrats.parties_clients is 'Mapping des parties du contrat vers les IDs clients: {"Partie 1": "uuid", "Partie 2": "uuid"}';
