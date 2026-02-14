"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { JobLog, JobStatus } from "@/lib/types";

const LOG_POLL_MS = 800;
const TRIGGER_RUN_POLL_MS = 3000;

interface TriggerRunInfo {
  status: string;
  taskIdentifier?: string;
  startedAt: string | null;
  finishedAt: string | null;
}

interface JobRunViewProps {
  jobId: string;
  status: JobStatus;
  /** Trigger.dev run id (run_xxx) to show live status and link to dashboard. */
  triggerRunId?: string | null;
  /** When true, UI shows that the run may have stopped (e.g. no update for a long time). */
  displayStale?: boolean;
}

function StatusIcon({ status, stale }: { status: JobStatus; stale?: boolean }) {
  if (stale) {
    return (
      <span className="flex h-5 w-5 items-center justify-center text-amber-400" title="Run may have stopped">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="flex h-5 w-5 items-center justify-center text-blue-400" title="Running">
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="flex h-5 w-5 items-center justify-center text-emerald-500" title="Completed">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex h-5 w-5 items-center justify-center text-red-500" title="Failed">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 items-center justify-center text-slate-400" title="Pending">
      <span className="h-2 w-2 rounded-full bg-slate-400" />
    </span>
  );
}

function LogLine({ log: l }: { log: JobLog }) {
  const isWarn = l.level === "warn";
  const isError = l.level === "error";
  return (
    <div
      className={`flex gap-2 py-1 px-2 rounded font-mono text-xs ${
        isError
          ? "text-red-300 bg-red-900/20"
          : isWarn
            ? "text-amber-300 bg-amber-900/20"
            : "text-slate-300"
      }`}
    >
      <span className="shrink-0 text-slate-500">
        {new Date(l.created_at).toLocaleTimeString()}
      </span>
      <span className="min-w-0 break-all">{l.message}</span>
    </div>
  );
}

const TRIGGER_DASHBOARD_RUN_URL = "https://cloud.trigger.dev";

export function JobRunView({
  jobId,
  status,
  triggerRunId,
  displayStale = false,
}: JobRunViewProps) {
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [triggerRun, setTriggerRun] = useState<TriggerRunInfo | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/logs`);
      if (!res.ok) {
        setFetchError(true);
        return [];
      }
      setFetchError(false);
      const data = await res.json();
      return Array.isArray(data.logs) ? data.logs : [];
    } catch {
      setFetchError(true);
      return [];
    }
  }, [jobId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLogs().then((logList) => {
      if (!cancelled) {
        setLogs(logList);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fetchLogs]);

  useEffect(() => {
    if (status !== "running") return;
    const interval = setInterval(() => {
      fetchLogs().then((logList) => setLogs(logList));
    }, LOG_POLL_MS);
    return () => clearInterval(interval);
  }, [status, fetchLogs]);

  // Fetch Trigger.dev run status when we have a run id
  useEffect(() => {
    if (!triggerRunId) return;
    let cancelled = false;
    const fetchTriggerRun = async () => {
      try {
        const res = await fetch(`/api/trigger/run/${triggerRunId}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) {
          setTriggerRun({
            status: data.status ?? "UNKNOWN",
            taskIdentifier: data.taskIdentifier,
            startedAt: data.startedAt ?? null,
            finishedAt: data.finishedAt ?? null,
          });
        }
      } catch {
        // ignore
      }
    };
    fetchTriggerRun();
    const interval = setInterval(
      fetchTriggerRun,
      status === "running" ? TRIGGER_RUN_POLL_MS : 10000
    );
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [triggerRunId, status]);

  const lastLogId = logs[logs.length - 1]?.id;
  useEffect(() => {
    if (logs.length === 0) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [logs.length, lastLogId]);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-400">Run</span>
          {triggerRunId && (
            <>
              {triggerRun && (
                <span className="text-xs text-slate-500">
                  Trigger.dev: <span className="text-slate-300">{triggerRun.status}</span>
                </span>
              )}
              <a
                href={`${TRIGGER_DASHBOARD_RUN_URL}/runs/${triggerRunId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                View in Trigger.dev →
              </a>
            </>
          )}
        </div>
        <span className="text-xs text-slate-500">This is the root task</span>
      </div>

      <div className="flex">
        {/* Task tree */}
        <div className="w-56 shrink-0 border-r border-slate-700 py-2">
          <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-200">
            <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="truncate">scrape-brand</span>
            <span className="ml-auto shrink-0">
              <StatusIcon status={status} stale={displayStale} />
            </span>
          </div>
          <div className="pl-6 pr-2 py-1">
            <div className="flex items-center gap-2 py-1 text-xs text-slate-400">
              <span className="shrink-0 rounded bg-slate-700 px-1.5 py-0.5 font-mono">A</span>
              <span>Attempt 1</span>
              <StatusIcon status={status} stale={displayStale} />
            </div>
            <div className="flex items-center gap-2 py-1 text-xs text-slate-400 pl-2">
              <span className="shrink-0 rounded bg-slate-700 px-1.5 py-0.5 font-mono">r</span>
              <span>run()</span>
            </div>
          </div>
        </div>

        {/* Log stream */}
        <div className="flex-1 min-w-0 flex flex-col min-h-[140px] max-h-80">
          <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b border-slate-700 shrink-0">
            <span className="text-xs text-slate-500">Log</span>
            {status === "running" && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <div
            ref={listRef}
            className="overflow-y-auto flex-1 min-h-0 p-2 space-y-0.5 font-mono"
          >
            {fetchError && logs.length === 0 ? (
              <p className="py-3 text-center text-xs text-amber-400">
                Couldn’t load logs. Check that the job_logs table exists and you’re signed in.
              </p>
            ) : loading && logs.length === 0 ? (
              <p className="py-3 text-center text-xs text-slate-500">Loading…</p>
            ) : logs.length === 0 ? (
              <p className="py-3 text-center text-xs text-slate-500">
                {status === "running"
                  ? "Logs will appear here as the run progresses."
                  : "No logs recorded for this run."}
              </p>
            ) : (
              <>
                {logs.map((l) => (
                  <LogLine key={l.id} log={l} />
                ))}
                {status === "running" && (
                  <div className="flex gap-2 py-1 px-2 text-slate-500 text-xs items-center">
                    <span className="animate-pulse">▌</span>
                    <span>watching for new logs…</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
