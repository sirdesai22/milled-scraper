"use client";

import { Email } from "@/lib/types";
import { getPreviewSnippet } from "@/lib/email-utils";

interface EmailThumbnailProps {
  email: Email;
  onClick: () => void;
}

export function EmailThumbnail({ email, onClick }: EmailThumbnailProps) {
  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-lg border border-slate-200 overflow-hidden cursor-pointer hover:border-blue-500 transition-all hover:shadow-lg"
    >
      {/* Email preview iframe */}
      <div className="relative w-full aspect-[3/4] overflow-hidden bg-white">
        <div className="absolute inset-0 scale-[0.25] origin-top-left w-[400%] h-[400%] pointer-events-none">
          <iframe
            srcDoc={email.email_html}
            sandbox="allow-same-origin"
            className="w-full h-full border-0"
            style={{ pointerEvents: "none" }}
          />
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-3 shadow-lg">
            <svg
              className="w-6 h-6 text-slate-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="p-3 border-t border-slate-200">
        <h3 className="text-sm font-medium text-slate-900 line-clamp-2 mb-1">
          {email.email_subject || "No subject"}
        </h3>
        <p className="text-xs text-slate-500 line-clamp-2 mb-1">
          {getPreviewSnippet(email.email_html)}
        </p>
        <p className="text-xs text-slate-400">
          {email.sent_at
            ? new Date(email.sent_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : new Date(email.scraped_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
        </p>
      </div>
    </div>
  );
}
