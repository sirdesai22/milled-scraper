import { createClient } from "@supabase/supabase-js";
import type { ScrapeJob, Email, JobLog, JobLogLevel } from "./types";

export type { ScrapeJob, Email, JobLog } from "./types";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper functions
export async function createJob(brandName: string): Promise<ScrapeJob> {
  const { data, error } = await supabase
    .from("scrape_jobs")
    .insert({
      brand_name: brandName,
      status: "pending",
      total_emails: 0,
      scraped_emails: 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create job: ${error.message}`);
  }

  return data as ScrapeJob;
}

export async function updateJob(
  jobId: string,
  updates: Partial<Omit<ScrapeJob, "id" | "created_at">>
): Promise<void> {
  const { error } = await supabase
    .from("scrape_jobs")
    .update(updates)
    .eq("id", jobId);

  if (error) {
    throw new Error(`Failed to update job: ${error.message}`);
  }
}

export async function incrementScrapedCount(jobId: string): Promise<void> {
  const { error } = await supabase.rpc("increment_scraped_count", {
    job_id: jobId,
  });

  // If RPC doesn't exist, fallback to manual increment
  if (error) {
    const { data: job } = await supabase
      .from("scrape_jobs")
      .select("scraped_emails")
      .eq("id", jobId)
      .single();

    if (job) {
      await supabase
        .from("scrape_jobs")
        .update({ scraped_emails: (job.scraped_emails || 0) + 1 })
        .eq("id", jobId);
    }
  }
}

/** PostgreSQL unique violation (e.g. duplicate email_url) */
const UNIQUE_VIOLATION_CODE = "23505";

export async function insertEmail(email: {
  job_id: string;
  brand_name: string;
  email_url: string;
  email_subject: string | null;
  email_html: string;
}): Promise<{ email: Email } | { duplicate: true }> {
  const { data, error } = await supabase
    .from("emails")
    .insert(email)
    .select()
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION_CODE) {
      return { duplicate: true };
    }
    throw new Error(`Failed to insert email: ${error.message}`);
  }

  return { email: data as Email };
}

export async function getJobs(): Promise<ScrapeJob[]> {
  const { data, error } = await supabase
    .from("scrape_jobs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch jobs: ${error.message}`);
  }

  return data as ScrapeJob[];
}

export async function getJob(jobId: string): Promise<ScrapeJob | null> {
  const { data, error } = await supabase
    .from("scrape_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) {
    return null;
  }

  return data as ScrapeJob;
}

export async function getEmailsByJob(jobId: string): Promise<Email[]> {
  const { data, error } = await supabase
    .from("emails")
    .select("*")
    .eq("job_id", jobId)
    .order("scraped_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch emails: ${error.message}`);
  }

  return data as Email[];
}

export async function getEmailById(id: string): Promise<Email | null> {
  const { data, error } = await supabase
    .from("emails")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }

  return data as Email;
}

export async function insertJobLog(
  jobId: string,
  log: { source: string; message: string; level?: JobLogLevel }
): Promise<JobLog | null> {
  const { data, error } = await supabase
    .from("job_logs")
    .insert({
      job_id: jobId,
      source: log.source,
      message: log.message,
      level: log.level ?? "info",
    })
    .select()
    .single();

  if (error) {
    return null;
  }
  return data as JobLog;
}

export async function getJobLogs(jobId: string): Promise<JobLog[]> {
  const { data, error } = await supabase
    .from("job_logs")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }
  return (data ?? []) as JobLog[];
}
