"use client";

import { Email } from "@/lib/types";
import { EmailThumbnail } from "./EmailThumbnail";

interface EmailGridProps {
  emails: Email[];
  onEmailClick: (index: number) => void;
}

export function EmailGrid({ emails, onEmailClick }: EmailGridProps) {
  if (emails.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-slate-400">
          No emails found for this campaign.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {emails.map((email, index) => (
        <EmailThumbnail
          key={email.id}
          email={email}
          onClick={() => onEmailClick(index)}
        />
      ))}
    </div>
  );
}
