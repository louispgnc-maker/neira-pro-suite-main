-- Add signed_at column to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_signed_at ON documents(signed_at);

COMMENT ON COLUMN documents.signed_at IS 'Date when the document was signed';
