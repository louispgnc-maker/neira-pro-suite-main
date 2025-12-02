-- Add folder column to emails table for organizing emails
ALTER TABLE public.emails
ADD COLUMN folder VARCHAR(50) DEFAULT 'inbox';

-- Create index for faster folder queries
CREATE INDEX IF NOT EXISTS idx_emails_folder ON emails(folder);

-- Update existing emails to have inbox as default folder
UPDATE public.emails SET folder = 'inbox' WHERE folder IS NULL;
