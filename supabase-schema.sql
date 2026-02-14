-- Milled Email Scraper Database Schema
-- Run this in your Supabase SQL Editor

-- Create scrape_jobs table
CREATE TABLE IF NOT EXISTS scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_emails INTEGER DEFAULT 0,
  scraped_emails INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create emails table
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  email_url TEXT NOT NULL UNIQUE,
  email_subject TEXT,
  email_html TEXT,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created_at ON scrape_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_job_id ON emails(job_id);
CREATE INDEX IF NOT EXISTS idx_emails_brand_name ON emails(brand_name);
CREATE INDEX IF NOT EXISTS idx_emails_scraped_at ON emails(scraped_at DESC);
