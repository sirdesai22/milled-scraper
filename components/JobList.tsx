"use client";

import type { ScrapeJob, Email } from "@/lib/types";
import { JobCard } from "./JobCard";

interface JobListProps {
  jobs: ScrapeJob[];
  expandedJobId: string | null;
  emailsByJob: Record<string, Email[] | undefined>;
  onToggleJob: (jobId: string) => void;
}

export function JobList({
  jobs,
  expandedJobId,
  emailsByJob,
  onToggleJob,
}: JobListProps) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No jobs yet</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-xs">
          Enter a brand name above and start scraping to see jobs here.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3" role="list">
      {jobs.map((job) => (
        <li key={job.id}>
          <JobCard
            job={job}
            isExpanded={expandedJobId === job.id}
            emails={emailsByJob[job.id]}
            onToggle={() => onToggleJob(job.id)}
          />
        </li>
      ))}
    </ul>
  );
}
