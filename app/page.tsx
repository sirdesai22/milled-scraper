"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, logout } from "@/lib/auth";

interface ScrapeJob {
  id: string;
  brand_name: string;
  status: "pending" | "running" | "completed" | "failed";
  total_emails: number;
  scraped_emails: number;
  created_at: string;
}

interface Email {
  id: string;
  job_id: string;
  brand_name: string;
  email_url: string;
  email_subject: string | null;
  email_html: string;
  scraped_at: string;
}

export default function Home() {
  const router = useRouter();
  const [brandName, setBrandName] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [emails, setEmails] = useState<Record<string, Email[]>>({});
  const [authChecked, setAuthChecked] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    setAuthChecked(true);
  }, [router]);

  // Fetch jobs on mount and every 5 seconds
  useEffect(() => {
    if (!authChecked) return;
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [authChecked]);

  async function fetchJobs() {
    try {
      const response = await fetch("/api/scrape");
      const data = await response.json();
      if (data.jobs) {
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  }

  async function fetchEmails(jobId: string) {
    try {
      const response = await fetch(`/api/scrape?jobId=${jobId}`);
      const data = await response.json();
      if (data.emails) {
        setEmails((prev) => ({ ...prev, [jobId]: data.emails }));
      }
    } catch (error) {
      console.error("Error fetching emails:", error);
    }
  }

  async function handleStartScrape() {
    if (!brandName.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName: brandName.trim() }),
      });

      if (response.ok) {
        setBrandName("");
        await fetchJobs();
      } else {
        alert("Failed to start scrape job");
      }
    } catch (error) {
      console.error("Error starting scrape:", error);
      alert("Failed to start scrape job");
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "pending":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      case "running":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  function toggleJobExpand(jobId: string) {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
    } else {
      setExpandedJobId(jobId);
      if (!emails[jobId]) {
        fetchEmails(jobId);
      }
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Milled Email Scraper
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Scrape email campaigns from milled.com by brand name
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleStartScrape()}
              placeholder="Enter brand name (e.g., adidas)"
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={loading}
            />
            <button
              onClick={handleStartScrape}
              disabled={loading || !brandName.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
            >
              {loading ? "Starting..." : "Start Scraping"}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Scrape Jobs
          </h2>

          {jobs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No scrape jobs yet. Start by entering a brand name above.
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md"
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750"
                    onClick={() => toggleJobExpand(job.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {job.brand_name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(job.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            job.status
                          )}`}
                        >
                          {job.status}
                        </span>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {job.scraped_emails} / {job.total_emails} emails
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                            expandedJobId === job.id ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {expandedJobId === job.id && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-750">
                      {emails[job.id] ? (
                        emails[job.id].length > 0 ? (
                          <div className="space-y-2">
                            {emails[job.id].map((email) => (
                              <div
                                key={email.id}
                                className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                              >
                                <div className="flex justify-between items-start gap-3 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                      {email.email_subject || "No subject"}
                                    </h4>
                                    <a
                                      href={email.email_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 block truncate"
                                    >
                                      {email.email_url}
                                    </a>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <a
                                      href={`/email/${email.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    >
                                      Show email
                                    </a>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(
                                        email.scraped_at
                                      ).toLocaleTimeString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  HTML: {email.email_html.length} characters
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                            No emails scraped yet
                          </div>
                        )
                      ) : (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          Loading emails...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
