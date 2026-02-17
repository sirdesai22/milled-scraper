-- Report config: editable strategy content per job (admin only)
CREATE TABLE IF NOT EXISTS report_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES scrape_jobs(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_config_job_id ON report_config(job_id);
