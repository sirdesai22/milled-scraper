-- Milled Email Scraper - Final Supabase Schema
-- Run: supabase db push (or apply via Supabase SQL Editor)

-- =============================================================================
-- scrape_jobs
-- =============================================================================
CREATE TABLE IF NOT EXISTS scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_emails INTEGER DEFAULT 0,
  scraped_emails INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  trigger_run_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created_at ON scrape_jobs(created_at DESC);

-- =============================================================================
-- emails
-- =============================================================================
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  email_url TEXT NOT NULL,
  email_subject TEXT,
  email_html TEXT,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_emails_job_id ON emails(job_id);
CREATE INDEX IF NOT EXISTS idx_emails_brand_name ON emails(brand_name);
CREATE INDEX IF NOT EXISTS idx_emails_scraped_at ON emails(scraped_at DESC);

-- =============================================================================
-- job_logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warn', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_logs_job_id ON job_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_logs_created_at ON job_logs(created_at);

ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- report_leads
-- =============================================================================
CREATE TABLE IF NOT EXISTS report_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  job_id UUID NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_leads_email ON report_leads(email);
CREATE INDEX IF NOT EXISTS idx_report_leads_job_id ON report_leads(job_id);
CREATE INDEX IF NOT EXISTS idx_report_leads_created_at ON report_leads(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_leads_email_job ON report_leads(email, job_id);

-- =============================================================================
-- report_config
-- =============================================================================
CREATE TABLE IF NOT EXISTS report_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES scrape_jobs(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_config_job_id ON report_config(job_id);
