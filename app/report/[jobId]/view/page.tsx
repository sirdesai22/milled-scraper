"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ScrapeJob, Email } from "@/lib/types";
import { EmailGrid } from "@/components/EmailGrid";
import { EmailModal } from "@/components/EmailModal";
import { StrategyReport } from "@/components/StrategyReport";

type Tab = "emails" | "strategy";

export default function ReportViewPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<ScrapeJob | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("emails");
  const [selectedEmailIndex, setSelectedEmailIndex] = useState<number | null>(
    null
  );

  useEffect(() => {
    async function loadReportData() {
      // Check if user has access (email capture or admin)
      const hasAccess = localStorage.getItem(`report_access_${jobId}`);
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      const me = meRes.ok ? await meRes.json() : {};
      if (hasAccess !== "true" && !me.isAdmin) {
        router.replace(`/report/${jobId}`);
        return;
      }
      setIsAdmin(me.isAdmin ?? false);

      try {
        // Fetch job details
        const jobRes = await fetch(`/api/jobs/${jobId}`);
        if (!jobRes.ok) {
          throw new Error("Failed to fetch job");
        }
        const jobData = await jobRes.json();
        setJob(jobData);

        // Fetch emails
        const emailsRes = await fetch(`/api/jobs/${jobId}/emails`);
        if (!emailsRes.ok) {
          throw new Error("Failed to fetch emails");
        }
        const emailsData = await emailsRes.json();
        setEmails(emailsData);
      } catch (error) {
        console.error("Error loading report:", error);
      } finally {
        setLoading(false);
      }
    }

    loadReportData();
  }, [jobId, router]);

  function handleEmailClick(index: number) {
    setSelectedEmailIndex(index);
  }

  function handleCloseModal() {
    setSelectedEmailIndex(null);
  }

  function handlePreviousEmail() {
    if (selectedEmailIndex !== null && selectedEmailIndex > 0) {
      setSelectedEmailIndex(selectedEmailIndex - 1);
    }
  }

  function handleNextEmail() {
    if (
      selectedEmailIndex !== null &&
      selectedEmailIndex < emails.length - 1
    ) {
      setSelectedEmailIndex(selectedEmailIndex + 1);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">Loading report...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Report Not Found
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            This report does not exist or has been removed.
          </p>
          <button
            onClick={() => router.push("/")}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                {job.brand_name} Email Campaign Analysis
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {emails.length} campaigns analyzed
                {isAdmin && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                    Admin
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Back to Home
            </button>
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-8 border-b border-slate-200 dark:border-slate-700 -mb-px">
            <button
              onClick={() => setActiveTab("emails")}
              className={`pb-4 px-1 font-medium text-sm transition-colors relative ${
                activeTab === "emails"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Emails
              {activeTab === "emails" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("strategy")}
              className={`pb-4 px-1 font-medium text-sm transition-colors relative ${
                activeTab === "strategy"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Strategy Analysis
              {activeTab === "strategy" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === "emails" && (
          <EmailGrid emails={emails} onEmailClick={handleEmailClick} />
        )}

        {activeTab === "strategy" && (
          <StrategyReport
            jobId={jobId}
            brandName={job.brand_name}
            emailCount={emails.length}
            emails={emails}
            onEmailClick={handleEmailClick}
            isAdmin={isAdmin}
          />
        )}
      </main>

      {/* Email Modal */}
      {selectedEmailIndex !== null && (
        <EmailModal
          email={emails[selectedEmailIndex]}
          currentIndex={selectedEmailIndex}
          totalEmails={emails.length}
          onClose={handleCloseModal}
          onPrevious={handlePreviousEmail}
          onNext={handleNextEmail}
        />
      )}
    </div>
  );
}
