"use client";

import { useState, useEffect, useCallback } from "react";
import type { ScrapeJob, Email } from "@/lib/types";
import { POLL_INTERVAL_MS } from "@/lib/constants";

export function useJobs() {
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/scrape");
      const data = await res.json();
      if (data.jobs) setJobs(data.jobs);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  return { jobs, refetch: fetchJobs };
}

export function useJobEmails() {
  const [emailsByJob, setEmailsByJob] = useState<Record<string, Email[]>>({});

  const fetchEmailsForJob = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/scrape?jobId=${jobId}`);
      const data = await res.json();
      if (data.emails) {
        setEmailsByJob((prev) => ({ ...prev, [jobId]: data.emails }));
      }
    } catch (err) {
      console.error("Error fetching emails:", err);
    }
  }, []);

  return [emailsByJob, fetchEmailsForJob] as const;
}
