"use client";

import { useEffect, useState } from "react";
import { Email } from "@/lib/types";
import { EmailExampleThumbnail } from "./EmailExampleThumbnail";
import { DEFAULT_REPORT_CONFIG, type ReportConfig } from "@/lib/report-config";

interface StrategyReportProps {
  jobId: string;
  emailCount: number;
  emails: Email[];
  onEmailClick: (index: number) => void;
  isAdmin: boolean;
}

function distributeEmails<T>(items: T[], buckets: number): T[][] {
  const result: T[][] = Array.from({ length: buckets }, () => []);
  items.forEach((item, i) => result[i % buckets].push(item));
  return result;
}

export function StrategyReport({
  jobId,
  emailCount,
  emails,
  onEmailClick,
  isAdmin,
}: StrategyReportProps) {
  const [config, setConfig] = useState<ReportConfig>({ ...DEFAULT_REPORT_CONFIG });
  const [configLoading, setConfigLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const emailsByTheme = distributeEmails(emails, 5);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`/api/report/${jobId}/config`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setConfig({ ...DEFAULT_REPORT_CONFIG, ...data });
        }
      } catch (e) {
        console.error("Failed to load config:", e);
      } finally {
        setConfigLoading(false);
      }
    }
    loadConfig();
  }, [jobId]);

  async function handleSave() {
    if (!dirty) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/report/${jobId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setDirty(false);
      } else {
        alert("Failed to save");
      }
    } catch (e) {
      console.error("Save failed:", e);
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function updateConfig<K extends keyof ReportConfig>(
    key: K,
    value: ReportConfig[K]
  ) {
    setConfig((c) => ({ ...c, [key]: value }));
    setDirty(true);
  }

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {isAdmin && dirty && (
        <div className="sticky top-20 z-10 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}

      {/* Overview */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Campaign Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Campaigns" value={String(emailCount)} editable={false} />
          <StatCard
            label="Per Week"
            value={config.overview.perWeek}
            editable={isAdmin}
            onChange={(v) =>
              updateConfig("overview", { ...config.overview, perWeek: v })
            }
          />
          <StatCard
            label="Peak"
            value={config.overview.peak}
            editable={isAdmin}
            onChange={(v) =>
              updateConfig("overview", { ...config.overview, peak: v })
            }
          />
          <StatCard
            label="Period"
            value={config.overview.period}
            editable={isAdmin}
            onChange={(v) =>
              updateConfig("overview", { ...config.overview, period: v })
            }
          />
        </div>
      </section>

      {/* Themes */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Recurring Campaign Themes
        </h2>
        <div className="space-y-6">
          {config.themes.map((theme, i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                {isAdmin ? (
                  <input
                    type="text"
                    value={theme.title}
                    onChange={(e) => {
                      const next = [...config.themes];
                      next[i] = { ...next[i], title: e.target.value };
                      updateConfig("themes", next);
                    }}
                    className="flex-1 min-w-[200px] text-lg font-semibold bg-slate-50 border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                ) : (
                  <h3 className="text-lg font-semibold text-slate-900">
                    {theme.title}
                  </h3>
                )}
                {isAdmin ? (
                  <input
                    type="text"
                    value={theme.tags}
                    onChange={(e) => {
                      const next = [...config.themes];
                      next[i] = { ...next[i], tags: e.target.value };
                      updateConfig("themes", next);
                    }}
                    className="flex-1 min-w-[200px] text-sm bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                ) : (
                  <p className="text-sm text-slate-500 shrink-0">
                    {theme.tags}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {(emailsByTheme[i] || []).slice(0, 5).map((email) => (
                  <EmailExampleThumbnail
                    key={email.id}
                    email={email}
                    onClick={() => onEmailClick(emails.indexOf(email))}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Subject Lines */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Subject Line Patterns
        </h2>
        <div className="space-y-4">
          {isAdmin ? (
            <input
              type="text"
              value={config.subjectLines.summary}
              onChange={(e) =>
                updateConfig("subjectLines", { summary: e.target.value })
              }
              className="w-full text-sm bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          ) : (
            <p className="text-sm text-slate-600">
              {config.subjectLines.summary}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {emails.slice(0, 8).map((email, i) => (
              <button
                key={email.id}
                type="button"
                onClick={() => onEmailClick(i)}
                className="group text-left rounded-lg border border-slate-200 overflow-hidden bg-white hover:border-blue-500 transition-all"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-white">
                  <div className="absolute inset-0 scale-[0.22] origin-top-left w-[450%] h-[450%] pointer-events-none">
                    <iframe
                      srcDoc={email.email_html}
                      sandbox="allow-same-origin"
                      className="w-full h-full border-0"
                      style={{ pointerEvents: "none" }}
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-xs font-medium text-white line-clamp-2 drop-shadow-sm">
                      {email.email_subject || "No subject"}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Cadence */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Campaign Cadence
        </h2>
        <div className="flex flex-wrap gap-3">
          {config.cadence.map((item, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 min-w-[100px]"
            >
              {isAdmin ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => {
                      const next = [...config.cadence];
                      next[i] = { ...next[i], label: e.target.value };
                      updateConfig("cadence", next);
                    }}
                    className="w-full text-sm font-semibold bg-transparent border border-slate-300 rounded px-2 py-0.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={item.desc}
                    onChange={(e) => {
                      const next = [...config.cadence];
                      next[i] = { ...next[i], desc: e.target.value };
                      updateConfig("cadence", next);
                    }}
                    className="w-full text-xs bg-transparent border border-slate-300 rounded px-2 py-0.5 text-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.desc}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Offers */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Offer Structure
        </h2>
        <div className="space-y-4">
          {isAdmin ? (
            <input
              type="text"
              value={config.offers.summary}
              onChange={(e) =>
                updateConfig("offers", { summary: e.target.value })
              }
              className="w-full text-sm bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          ) : (
            <p className="text-sm text-slate-600">
              {config.offers.summary}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {emails.slice(0, 6).map((email, i) => (
              <EmailExampleThumbnail
                key={email.id}
                email={email}
                onClick={() => onEmailClick(i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Tech Stack
        </h2>
        <div className="flex flex-wrap gap-2">
          {isAdmin ? (
            <>
              <input
                type="text"
                value={config.techStack.email}
                onChange={(e) =>
                  updateConfig("techStack", {
                    ...config.techStack,
                    email: e.target.value,
                  })
                }
                className="rounded-lg bg-slate-50 border border-slate-300 px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <input
                type="text"
                value={config.techStack.sms}
                onChange={(e) =>
                  updateConfig("techStack", {
                    ...config.techStack,
                    sms: e.target.value,
                  })
                }
                className="rounded-lg bg-slate-50 border border-slate-300 px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </>
          ) : (
            <>
              <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                Email: {config.techStack.email}
              </span>
              <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                SMS: {config.techStack.sms}
              </span>
            </>
          )}
        </div>
      </section>

      {/* Popups */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Popups
        </h2>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          {isAdmin ? (
            <div className="space-y-2">
              <input
                type="text"
                value={config.popups.primary}
                onChange={(e) =>
                  updateConfig("popups", {
                    ...config.popups,
                    primary: e.target.value,
                  })
                }
                className="w-full text-sm bg-white border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <input
                type="text"
                value={config.popups.secondary}
                onChange={(e) =>
                  updateConfig("popups", {
                    ...config.popups,
                    secondary: e.target.value,
                  })
                }
                className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-2 text-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-700">
                <span className="font-medium">Primary:</span>{" "}
                {config.popups.primary}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {config.popups.secondary}
              </p>
            </>
          )}
        </div>
      </section>

      {isAdmin && dirty && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  editable,
  onChange,
}: {
  label: string;
  value: string;
  editable: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      {editable && onChange ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-2xl font-bold bg-white border border-slate-300 rounded px-2 py-1 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      ) : (
        <p className="text-2xl font-bold text-slate-900">
          {value}
        </p>
      )}
      <p className="text-xs text-slate-500 mt-1">
        {label}
      </p>
    </div>
  );
}
