"use client";

import { memo } from "react";
import { type Node, type NodeProps } from "@xyflow/react";
import { Email } from "@/lib/types";
import { getPreviewSnippet } from "@/lib/email-utils";

export type EmailNodeData = {
  email: Email;
  onOpen: () => void;
};

export type EmailFlowNode = Node<EmailNodeData, "email">;

const NODE_WIDTH = 420;
const NODE_HEIGHT = 720;

function EmailNodeComponent({ data }: NodeProps<EmailFlowNode>) {
  const { email, onOpen } = data;
  const preview = getPreviewSnippet(email.email_html, 120);
  const sentAt = email.sent_at
    ? new Date(email.sent_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : new Date(email.scraped_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

  return (
    <div
      className="bg-white rounded-xl border-2 border-slate-200 shadow-lg overflow-hidden flex flex-col"
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
    >
      <div className="email-node-drag-handle p-3 border-b border-slate-200 bg-slate-50 shrink-0 cursor-grab active:cursor-grabbing">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">
          Subject
        </p>
        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 mb-1">
          {email.email_subject || "No subject"}
        </h3>
        {preview && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-1">{preview}</p>
        )}
        <p className="text-xs text-slate-400">{sentAt}</p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="mt-2 w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
        >
          Open full email
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto bg-white">
        <iframe
          title={`Email: ${email.email_subject || "No subject"}`}
          srcDoc={email.email_html}
          className="w-full border-0 min-h-[800px]"
          sandbox="allow-same-origin"
          style={{ height: "100%", minHeight: 600 }}
        />
      </div>
    </div>
  );
}

export const EmailNode = memo(EmailNodeComponent);
