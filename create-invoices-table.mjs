import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const createInvoicesTable = async () => {
  console.log('📝 Creating invoices table...');
  
  const { error } = await supabase.rpc('exec_sql', {
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
  });

  if (error) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  }

  console.log('✅ Invoices table created successfully!');
};

createInvoicesTable();
