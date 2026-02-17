"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import type { Email } from "@/lib/types";

export default function EmailPage() {
  const params = useParams();
  const id = params.id as string;
  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/email/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Email not found" : "Failed to load");
        return res.json();
      })
      .then(setEmail)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">Loading email…</p>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-red-600">{error || "Email not found"}</p>
        <Link
          href="/"
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white backdrop-blur-sm px-4 py-3">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-slate-900 truncate">
              {email.email_subject || "No subject"}
            </h1>
            <p className="text-sm text-slate-500 truncate">
              {email.brand_name} · {new Date(email.scraped_at).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={email.email_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 text-sm font-medium text-indigo-600 hover:underline"
            >
              View on Milled
            </a>
            <Link
              href="/"
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="p-4">
        <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <iframe
            title="Email content"
            srcDoc={email.email_html}
            className="w-full border-0 min-h-[80vh]"
            sandbox="allow-same-origin"
          />
        </div>
      </main>
    </div>
  );
}
