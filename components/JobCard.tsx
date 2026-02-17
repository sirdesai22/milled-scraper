"use client";

import Link from "next/link";
import type { ScrapeJob, Email } from "@/lib/types";
import { RUNNING_STALE_AFTER_MS } from "@/lib/constants";
import { EmailRow } from "./EmailRow";
import { JobRunView } from "./JobRunView";

function getStatusClasses(status: string, isStale?: boolean): string {
  if (isStale) {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300";
  }
  switch (status) {
    case "pending":
      return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
    case "running":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300";
    case "completed":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300";
    case "failed":
      return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
  }
}

function isRunningStale(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() > RUNNING_STALE_AFTER_MS;
}

interface JobCardProps {
  job: ScrapeJob;
  isExpanded: boolean;
  emails: Email[] | undefined;
  onToggle: () => void;
}

export function JobCard({ job, isExpanded, emails, onToggle }: JobCardProps) {
  const stale = job.status === "running" && isRunningStale(job.created_at);
  const statusLabel = stale ? "Run may have stopped" : job.status;
  const statusClasses = getStatusClasses(job.status, stale);

  const showReportButton = job.status === "completed" && job.scraped_emails > 0;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex items-center gap-4 p-4">
        <button
          type="button"
          onClick={onToggle}
          className="min-w-0 flex-1 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 -m-4 p-4 rounded-lg transition-colors"
        >
          <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
            {job.brand_name}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {new Date(job.created_at).toLocaleString()}
          </p>
        </button>
        <div className="flex items-center gap-3 shrink-0">
          {showReportButton && (
            <Link
              href={`/report/${job.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Report
            </Link>
          )}
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusClasses}`}
            title={stale ? "Job has been running longer than expected; it may have crashed or timed out." : undefined}
          >
            {statusLabel}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
            {job.scraped_emails}/{job.total_emails}
          </span>
          <button
            type="button"
            onClick={onToggle}
            className="p-1 -m-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <svg
              className={`w-5 h-5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-4">
          {stale && (
            <p className="mb-3 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              This run has had no update for a long time and may have stopped (crashed or timed out).
            </p>
          )}
          <JobRunView
            jobId={job.id}
            status={job.status}
            triggerRunId={job.trigger_run_id}
            displayStale={stale}
          />

          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 mt-2">
            Current state
          </h4>
          {emails === undefined ? (
            <div className="flex items-center justify-center py-8 text-sm text-slate-500 dark:text-slate-400">
              <span className="animate-pulse">Loading emails…</span>
            </div>
          ) : emails.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No emails scraped yet
            </p>
          ) : (
            <ul className="space-y-2" role="list">
              {emails.map((email) => (
                <li key={email.id}>
                  <EmailRow email={email} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
