import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // Créer la table invoices
    const { error } = await supabase.rpc('query', {
      query: `
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
          created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_invoices_cabinet_id ON public.invoices(cabinet_id);
        CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON public.invoices(stripe_invoice_id);

        ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Members can view cabinet invoices" ON public.invoices;
        CREATE POLICY "Members can view cabinet invoices" ON public.invoices
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.cabinet_members
              WHERE cabinet_members.cabinet_id = invoices.cabinet_id
              AND cabinet_members.user_id = auth.uid()
            )
          );
      `
    })

    if (error) throw error

    return new Response(JSON.stringify({ success: true, message: 'Table invoices créée !' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
