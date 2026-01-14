-- Add access_code column to client_invitations table
-- This is a 6-character alphanumeric code that clients use to access their space

alter table client_invitations 
add column if not exists access_code text unique;

-- Create index for faster lookups by access_code
create index if not exists idx_client_invitations_access_code on client_invitations(access_code);

-- Update existing invitations with a random 6-char code if they don't have one
update client_invitations
set access_code = upper(substr(md5(random()::text), 1, 6))
where access_code is null;

-- Make access_code required for new invitations
alter table client_invitations 
alter column access_code set not null;
