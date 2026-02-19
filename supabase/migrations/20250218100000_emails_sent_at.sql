-- Add sent_at to emails (when the campaign was sent, from Milled time element)
ALTER TABLE emails ADD COLUMN IF NOT EXISTS sent_at timestamptz;
