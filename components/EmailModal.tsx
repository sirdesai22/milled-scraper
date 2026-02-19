"use client";

import { useEffect } from "react";
import { Email } from "@/lib/types";

interface EmailModalProps {
  email: Email;
  currentIndex: number;
  totalEmails: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function EmailModal({
  email,
  currentIndex,
  totalEmails,
  onClose,
  onPrevious,
  onNext,
}: EmailModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && currentIndex > 0) {
        onPrevious();
      } else if (e.key === "ArrowRight" && currentIndex < totalEmails - 1) {
        onNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, totalEmails, onClose, onPrevious, onNext]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Modal container */}
      <div
        className="relative w-full h-full max-w-4xl max-h-[90vh] m-4 bg-white rounded-xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 truncate">
              {email.email_subject || "No subject"}
            </h2>
            <p className="text-sm text-slate-500">
              {email.sent_at
                ? new Date(email.sent_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : new Date(email.scraped_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
              {email.sent_at && (
                <span className="ml-1 text-slate-400">
                  ({new Date(email.sent_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })})
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm text-slate-500">
              {currentIndex + 1} / {totalEmails}
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Email content */}
        <div className="flex-1 overflow-hidden bg-slate-50">
          <iframe
            srcDoc={email.email_html}
            sandbox="allow-same-origin allow-popups"
            className="w-full h-full border-0"
          />
        </div>

        {/* Navigation buttons */}
        <div className="absolute top-1/2 left-4 right-4 flex justify-between pointer-events-none">
          <button
            onClick={onPrevious}
            disabled={currentIndex === 0}
            className="pointer-events-auto p-3 rounded-full bg-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
            aria-label="Previous email"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={onNext}
            disabled={currentIndex === totalEmails - 1}
            className="pointer-events-auto p-3 rounded-full bg-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
            aria-label="Next email"
          >
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
