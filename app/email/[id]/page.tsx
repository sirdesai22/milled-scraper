"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";

interface Email {
  id: string;
  job_id: string;
  brand_name: string;
  email_url: string;
  email_subject: string | null;
  email_html: string;
  scraped_at: string;
}

export default function EmailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked || !id) return;
    fetch(`/api/email/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Email not found" : "Failed to load");
        return res.json();
      })
      .then(setEmail)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, authChecked]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading email...</p>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-red-600 dark:text-red-400">{error || "Email not found"}</p>
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {email.email_subject || "No subject"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {email.brand_name} · {new Date(email.scraped_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={email.email_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View on Milled
          </a>
          <Link
            href="/"
            className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="p-4">
        <div
          className="mx-auto bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden max-w-4xl"
          style={{ minHeight: "60vh" }}
        >
          <iframe
            title="Email content"
            srcDoc={email.email_html}
            className="w-full border-0"
            style={{ minHeight: "80vh" }}
            sandbox="allow-same-origin"
          />
        </div>
      </main>
    </div>
  );
}
