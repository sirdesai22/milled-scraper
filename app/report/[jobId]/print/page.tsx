"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Email, ScrapeJob } from "@/lib/types";
import { StrategyReport } from "@/components/StrategyReport";
import { EmailGrid } from "@/components/EmailGrid";

export default function ReportPrintPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<ScrapeJob | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function load() {
      // Same gating as /view (localStorage access OR admin cookie)
      const hasAccess = localStorage.getItem(`report_access_${jobId}`);
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      const me = meRes.ok ? await meRes.json() : {};
      if (hasAccess !== "true" && !me.isAdmin) {
        router.replace(`/report/${jobId}`);
        return;
      }
      setIsAdmin(me.isAdmin ?? false);

      try {
        const jobRes = await fetch(`/api/jobs/${jobId}`);
        if (!jobRes.ok) throw new Error("Failed to fetch job");
        const jobData = await jobRes.json();
        setJob(jobData);

        const emailsRes = await fetch(`/api/jobs/${jobId}/emails`);
        if (!emailsRes.ok) throw new Error("Failed to fetch emails");
        const emailsData = await emailsRes.json();
        setEmails(emailsData);
      } catch (e) {
        console.error("Error loading print report:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [jobId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-slate-600">Preparing PDF preview…</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-slate-900 font-medium">Report not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top controls (hidden in print) */}
      <div className="print:hidden sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push(`/report/${jobId}/view`)}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Back to report
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
            >
              Download as PDF
            </button>
          </div>
        </div>
      </div>

      {/* Printable content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">{job.brand_name} Email Campaign Analysis</h1>
          <p className="text-sm text-slate-500 mt-1">
            {emails.length} campaigns analyzed
            {isAdmin ? " • Admin" : ""}
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Strategy Analysis</h2>
          <StrategyReport
            jobId={jobId}
            emailCount={emails.length}
            emails={emails}
            onEmailClick={() => {}}
            isAdmin={isAdmin}
          />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Emails</h2>
          <EmailGrid emails={emails} onEmailClick={() => {}} />
        </section>
      </main>
    </div>
  );
}

