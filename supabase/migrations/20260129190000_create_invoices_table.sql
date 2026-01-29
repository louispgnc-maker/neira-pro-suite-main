-- Création de la table invoices pour stocker les factures Stripe

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cabinet_id uuid NOT NULL REFERENCES public.cabinets(id) ON DELETE CASCADE,
  stripe_invoice_id text UNIQUE NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'eur',
  status text NOT NULL,
  invoice_pdf text,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour recherche rapide par cabinet
CREATE INDEX IF NOT EXISTS idx_invoices_cabinet_id ON public.invoices(cabinet_id);

-- Index pour recherche par Stripe invoice ID
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON public.invoices(stripe_invoice_id);

-- RLS policies
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Policy : Les membres d'un cabinet peuvent voir les factures de leur cabinet
CREATE POLICY "Members can view cabinet invoices"
  ON public.invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cabinet_members
      WHERE cabinet_members.cabinet_id = invoices.cabinet_id
      AND cabinet_members.user_id = auth.uid()
    )
  );

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Commentaires
COMMENT ON TABLE public.invoices IS 'Factures Stripe pour les abonnements';
COMMENT ON COLUMN public.invoices.stripe_invoice_id IS 'ID de la facture dans Stripe';
COMMENT ON COLUMN public.invoices.invoice_pdf IS 'URL du PDF de la facture';
