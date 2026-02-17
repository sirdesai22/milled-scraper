"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { useJobs, useJobEmails } from "@/hooks/use-jobs";
import { JobList } from "@/components/JobList";
import { ScrapeForm } from "@/components/ScrapeForm";

export default function Home() {
  const router = useRouter();
  const { jobs, refetch: refetchJobs } = useJobs();
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [emailsByJob, fetchEmailsForJob] = useJobEmails();

  const [brandName, setBrandName] = useState("");
  const [datePreset, setDatePreset] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [maxPages, setMaxPages] = useState(10);
  const [searchPageLimit, setSearchPageLimit] = useState(100);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expandedJobId && !emailsByJob[expandedJobId]) {
      fetchEmailsForJob(expandedJobId);
    }
  }, [expandedJobId, emailsByJob, fetchEmailsForJob]);

  async function handleStartScrape() {
    if (!brandName.trim()) return;
    setLoading(true);
    try {
      const body: {
        brandName: string;
        datePreset?: string;
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
        maxPages?: number;
      } = { brandName: brandName.trim() };
      if (datePreset && datePreset !== "custom") {
        body.datePreset = datePreset;
      }
      if (datePreset === "custom" && dateFrom && dateTo) {
        body.dateFrom = new Date(dateFrom).toISOString().slice(0, 10);
        body.dateTo = new Date(dateTo).toISOString().slice(0, 10);
      }
      body.maxPages = maxPages;
      body.limit = searchPageLimit;
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setBrandName("");
        await refetchJobs();
      } else {
        alert("Failed to start scrape job");
      }
    } catch (err) {
      console.error("Error starting scrape:", err);
      alert("Failed to start scrape job");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  function toggleJobExpand(jobId: string) {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
    } else {
      setExpandedJobId(jobId);
      if (!emailsByJob[jobId]) {
        fetchEmailsForJob(jobId);
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Milled Scraper
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Scrape email campaigns from milled.com by brand name
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="self-start sm:self-center px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Log out
          </button>
        </header>

        <ScrapeForm
          brandName={brandName}
          datePreset={datePreset}
          dateFrom={dateFrom}
          dateTo={dateTo}
          maxPages={maxPages}
          searchPageLimit={searchPageLimit}
          loading={loading}
          onBrandNameChange={setBrandName}
          onDatePresetChange={setDatePreset}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onMaxPagesChange={setMaxPages}
          onSearchPageLimitChange={setSearchPageLimit}
          onStartScrape={handleStartScrape}
        />

        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Scrape jobs
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Expand a job to view scraped emails
            </p>
          </div>
          <div className="p-5">
            <JobList
              jobs={jobs}
              expandedJobId={expandedJobId}
              emailsByJob={emailsByJob}
              onToggleJob={toggleJobExpand}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
