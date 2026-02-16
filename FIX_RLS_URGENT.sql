-- ==========================================
-- FIX URGENT: Activer RLS sur toutes les tables
-- ==========================================

-- Tables cabinet_*
ALTER TABLE public.cabinet_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cabinet_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cabinet_contrats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cabinet_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cabinet_dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cabinet_tasks ENABLE ROW LEVEL SECURITY;

-- Tables principales
ALTER TABLE public.cabinets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tables dossier_*
ALTER TABLE public.dossier_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossier_contrats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossier_documents ENABLE ROW LEVEL SECURITY;

-- Table de liaison contrats
ALTER TABLE public.client_dossier_contrats ENABLE ROW LEVEL SECURITY;
