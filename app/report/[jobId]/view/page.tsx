"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ScrapeJob, Email } from "@/lib/types";
import { EmailFlowCanvas } from "@/components/EmailFlowCanvas";
import { EmailModal } from "@/components/EmailModal";
import { StrategyReport } from "@/components/StrategyReport";

type Tab = "emails" | "strategy";

function filterEmailsBySentAt(
  emails: Email[],
  dateFrom: string | null,
  dateTo: string | null
): Email[] {
  if (!dateFrom && !dateTo) return emails;
  return emails.filter((email) => {
    const sentAt = email.sent_at;
    if (!sentAt) return false;
    const date = sentAt.slice(0, 10);
    if (dateFrom && date < dateFrom) return false;
    if (dateTo && date > dateTo) return false;
    return true;
  });
}

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
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const filteredEmails = useMemo(
    () =>
      filterEmailsBySentAt(
        emails,
        dateFrom || null,
        dateTo || null
      ),
    [emails, dateFrom, dateTo]
  );

  useEffect(() => {
    if (
      selectedEmailIndex !== null &&
      selectedEmailIndex >= filteredEmails.length
    ) {
      setSelectedEmailIndex(null);
    }
  }, [filteredEmails.length, selectedEmailIndex]);

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
      selectedEmailIndex < filteredEmails.length - 1
    ) {
      setSelectedEmailIndex(selectedEmailIndex + 1);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading report...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Report Not Found
          </h1>
          <p className="text-slate-600 mb-4">
            This report does not exist or has been removed.
          </p>
          <button
            onClick={() => router.push("/")}
            className="text-blue-600 hover:text-blue-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                {job.brand_name} Email Campaign Analysis
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {dateFrom || dateTo
                  ? `${filteredEmails.length} of ${emails.length} campaigns`
                  : `${emails.length} campaigns analyzed`}
                {isAdmin && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Admin
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.open(`/report/${jobId}/print`, "_blank")}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Preview PDF
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Back to Home
              </button>
            </div>
          </div>

          {/* Date range filter (by sent_at) */}
          <div className="flex flex-wrap items-center gap-3 py-4 border-b border-slate-200 mb-4">
            <span className="text-sm font-medium text-slate-700">
              Date range
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="From date"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="To date"
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-8 border-b border-slate-200 -mb-px">
            <button
              onClick={() => setActiveTab("emails")}
              className={`pb-4 px-1 font-medium text-sm transition-colors relative ${
                activeTab === "emails"
                  ? "text-blue-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Emails
              {activeTab === "emails" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("strategy")}
              className={`pb-4 px-1 font-medium text-sm transition-colors relative ${
                activeTab === "strategy"
                  ? "text-blue-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Strategy Analysis
              {activeTab === "strategy" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main
        className={
          activeTab === "emails"
            ? "w-full py-6"
            : "max-w-7xl mx-auto px-4 sm:px-6 py-8"
        }
      >
        <div
          className={activeTab === "emails" ? "block" : "hidden"}
          aria-hidden={activeTab !== "emails"}
        >
          <EmailFlowCanvas
            jobId={jobId}
            emails={filteredEmails}
            onEmailClick={handleEmailClick}
          />
        </div>

        <div
          className={
            activeTab === "strategy"
              ? "block"
              : "hidden"
          }
          aria-hidden={activeTab !== "strategy"}
        >
          <StrategyReport
            jobId={jobId}
            emailCount={filteredEmails.length}
            emails={filteredEmails}
            onEmailClick={handleEmailClick}
            isAdmin={isAdmin}
          />
        </div>
      </main>

      {/* Email Modal */}
      {selectedEmailIndex !== null && selectedEmailIndex < filteredEmails.length && (
        <EmailModal
          email={filteredEmails[selectedEmailIndex]}
          currentIndex={selectedEmailIndex}
          totalEmails={filteredEmails.length}
          onClose={handleCloseModal}
          onPrevious={handlePreviousEmail}
          onNext={handleNextEmail}
        />
      )}
    </div>
  );
}
