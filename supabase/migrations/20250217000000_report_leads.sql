-- Create report_leads table for email capture
CREATE TABLE IF NOT EXISTS report_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  job_id UUID NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_report_leads_email ON report_leads(email);
CREATE INDEX IF NOT EXISTS idx_report_leads_job_id ON report_leads(job_id);
CREATE INDEX IF NOT EXISTS idx_report_leads_created_at ON report_leads(created_at DESC);

-- Composite index for checking if email already captured for a job
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_leads_email_job ON report_leads(email, job_id);
