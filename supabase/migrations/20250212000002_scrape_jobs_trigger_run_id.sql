-- Store Trigger.dev run id so we can link to the run and fetch status
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS trigger_run_id TEXT;
