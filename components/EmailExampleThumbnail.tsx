"use client";

import { Email } from "@/lib/types";

interface EmailExampleThumbnailProps {
  email: Email;
  onClick: () => void;
}

/** Compact email preview for interleaving with strategy analysis */
export function EmailExampleThumbnail({ email, onClick }: EmailExampleThumbnailProps) {
  return (
    <div
      onClick={onClick}
      className="group relative rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-all hover:shadow-md bg-white dark:bg-slate-800"
    >
      <div className="relative w-full aspect-[3/4] overflow-hidden bg-white min-h-[160px]">
        <div className="absolute inset-0 scale-[0.25] origin-top-left w-[400%] h-[400%] pointer-events-none">
          <iframe
            srcDoc={email.email_html}
            sandbox="allow-same-origin"
            className="w-full h-full border-0"
            style={{ pointerEvents: "none" }}
          />
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
      </div>
      <div className="p-2 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs font-medium text-slate-900 dark:text-white line-clamp-2">
          {email.email_subject || "No subject"}
        </p>
      </div>
    </div>
  );
}
