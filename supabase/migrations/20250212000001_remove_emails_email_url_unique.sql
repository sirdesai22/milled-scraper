-- Remove unique constraint on emails.email_url so the same URL can be stored for different jobs
ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_email_url_key;
