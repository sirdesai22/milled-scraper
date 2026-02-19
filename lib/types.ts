/**
 * Shared types for the app. Database entities match Supabase tables.
 */

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface ScrapeJob {
  id: string;
  brand_name: string;
  status: JobStatus;
  total_emails: number;
  scraped_emails: number;
  created_at: string;
  /** Trigger.dev run id (run_xxx) when job was triggered; used for dashboard link and run status. */
  trigger_run_id?: string | null;
}

export interface Email {
  id: string;
  job_id: string;
  brand_name: string;
  email_url: string;
  email_subject: string | null;
  email_html: string;
  scraped_at: string;
  /** When the campaign was sent (from Milled time element). */
  sent_at: string | null;
}

export type JobLogLevel = "info" | "warn" | "error";

export interface JobLog {
  id: string;
  job_id: string;
  source: string;
  message: string;
  level: JobLogLevel;
  created_at: string;
}

export interface ReportLead {
  id: string;
  email: string;
  job_id: string;
  brand_name: string;
  created_at: string;
}
