"use client";

import type { Email } from "@/lib/types";

interface EmailRowProps {
  email: Email;
}

export function EmailRow({ email }: EmailRowProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-slate-900 truncate">
            {email.email_subject || "No subject"}
          </h4>
          <a
            href={email.email_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 hover:underline truncate block"
          >
            {email.email_url}
          </a>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/email/${email.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300 transition-colors"
          >
            View email
          </a>
          <span className="text-xs text-slate-400">
            {email.sent_at
              ? new Date(email.sent_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : new Date(email.scraped_at).toLocaleTimeString()}
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {email.email_html.length.toLocaleString()} chars
      </p>
    </div>
  );
}
