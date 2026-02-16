-- Add Universign-specific columns to signatures table

-- Add column for Universign transaction ID (replaces yousign_signature_request_id)
ALTER TABLE public.signatures 
ADD COLUMN IF NOT EXISTS universign_transaction_id TEXT;

-- Add column for signed document URL
ALTER TABLE public.signatures 
ADD COLUMN IF NOT EXISTS signed_document_url TEXT;

-- Add column for document ID reference
ALTER TABLE public.signatures 
ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE;

-- Add index for transaction lookups
CREATE INDEX IF NOT EXISTS signatures_universign_transaction_idx 
ON public.signatures(universign_transaction_id);

-- Add index for document lookups
CREATE INDEX IF NOT EXISTS signatures_document_idx 
ON public.signatures(document_id);

-- Update status column comment to reflect Universign statuses
COMMENT ON COLUMN public.signatures.status IS 
'Signature status: pending, completed, expired, cancelled, failed';
