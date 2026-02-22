"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { Email } from "@/lib/types";
import { getPreviewSnippet } from "@/lib/email-utils";
import { EmailExampleThumbnail } from "./EmailExampleThumbnail";
import {
  DEFAULT_REPORT_CONFIG,
  DEFAULT_THEME_DESCRIPTION,
  normalizeThemes,
  type ReportConfig,
  type RecurringTheme,
} from "@/lib/report-config";

function filterEmailsBySentAt(
  emails: Email[],
  dateFrom: string | null,
  dateTo: string | null
): Email[] {
  if (!dateFrom && !dateTo) return emails;
  return emails.filter((email) => {
    const sentAt = email.sent_at;
    if (!sentAt) return false;
    const date = sentAt.slice(0, 10);
    if (dateFrom && date < dateFrom) return false;
    if (dateTo && date > dateTo) return false;
    return true;
  });
}

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
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [addEmailDrawerThemeIndex, setAddEmailDrawerThemeIndex] = useState<
    number | null
  >(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`/api/report/${jobId}/config`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          const merged = { ...DEFAULT_REPORT_CONFIG, ...data };
          merged.themes = normalizeThemes(merged.themes as Parameters<typeof normalizeThemes>[0]);
          setConfig(merged);
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

  const sectionEditable = (id: string) => isAdmin && editingSection === id;

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
        <SectionHeader
          title="Campaign Overview"
          sectionId="overview"
          isAdmin={isAdmin}
          editingSection={editingSection}
          setEditingSection={setEditingSection}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Campaigns" value={String(emailCount)} editable={false} />
          <StatCard
            label="Per Week"
            value={config.overview.perWeek}
            editable={sectionEditable("overview")}
            onChange={(v) =>
              updateConfig("overview", { ...config.overview, perWeek: v })
            }
          />
          <StatCard
            label="Peak"
            value={config.overview.peak}
            editable={sectionEditable("overview")}
            onChange={(v) =>
              updateConfig("overview", { ...config.overview, peak: v })
            }
          />
          <StatCard
            label="Period"
            value={config.overview.period}
            editable={sectionEditable("overview")}
            onChange={(v) =>
              updateConfig("overview", { ...config.overview, period: v })
            }
          />
        </div>
      </section>

      {/* Tech Stack */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <SectionHeader
          title="Tech Stack"
          sectionId="techStack"
          isAdmin={isAdmin}
          editingSection={editingSection}
          setEditingSection={setEditingSection}
        />
        <div className="flex flex-wrap gap-2">
          {sectionEditable("techStack") ? (
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

      {/* Recurring Campaign Themes */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <SectionHeader
          title="Recurring Campaign Themes"
          sectionId="themes"
          isAdmin={isAdmin}
          editingSection={editingSection}
          setEditingSection={setEditingSection}
        />
        <div className="space-y-6">
          {config.themes.map((theme, i) => (
            <ThemeCard
              key={i}
              theme={theme}
              index={i}
              emails={emails}
              isEditing={sectionEditable("themes")}
              onEmailClick={onEmailClick}
              onUpdateTheme={(patch) => {
                const next = config.themes.map((t, j) =>
                  j === i ? { ...t, ...patch } : t
                );
                updateConfig("themes", next);
              }}
              onRemove={() => {
                const next = config.themes.filter((_, j) => j !== i);
                updateConfig("themes", next);
              }}
              onOpenAddEmailDrawer={() => setAddEmailDrawerThemeIndex(i)}
            />
          ))}
          {sectionEditable("themes") && (
            <button
              type="button"
              onClick={() => {
                const newTheme: RecurringTheme = {
                  title: "New theme",
                  description: DEFAULT_THEME_DESCRIPTION,
                  emailIds: [],
                };
                updateConfig("themes", [...config.themes, newTheme]);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add new theme
            </button>
          )}
        </div>
      </section>

      {/* Subject Lines */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <SectionHeader
          title="Subject Line Patterns"
          sectionId="subjectLines"
          isAdmin={isAdmin}
          editingSection={editingSection}
          setEditingSection={setEditingSection}
        />
        <div className="space-y-4">
          {sectionEditable("subjectLines") ? (
            <textarea
              value={config.subjectLines.summary}
              onChange={(e) =>
                updateConfig("subjectLines", { summary: e.target.value })
              }
              rows={14}
              className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
            />
          ) : (
            <p className="text-sm text-slate-600 whitespace-pre-wrap">
              {config.subjectLines.summary}
            </p>
          )}
        </div>
      </section>

      {/* Cadence */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <SectionHeader
          title="Campaign Cadence"
          sectionId="cadence"
          isAdmin={isAdmin}
          editingSection={editingSection}
          setEditingSection={setEditingSection}
        />
        <div className="flex flex-wrap gap-3">
          {config.cadence.map((item, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 min-w-[100px]"
            >
              {sectionEditable("cadence") ? (
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
        <SectionHeader
          title="Offer Structure"
          sectionId="offers"
          isAdmin={isAdmin}
          editingSection={editingSection}
          setEditingSection={setEditingSection}
        />
        <div className="space-y-4">
          {sectionEditable("offers") ? (
            <textarea
              value={config.offers.summary}
              onChange={(e) =>
                updateConfig("offers", { summary: e.target.value })
              }
              rows={10}
              className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
            />
          ) : (
            <p className="text-sm text-slate-600 whitespace-pre-wrap">
              {config.offers.summary}
            </p>
          )}
        </div>
      </section>

      {/* Design & Layout Choices */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <SectionHeader
          title="Design & Layout Choices"
          sectionId="designLayout"
          isAdmin={isAdmin}
          editingSection={editingSection}
          setEditingSection={setEditingSection}
        />
        <div className="space-y-4">
          {sectionEditable("designLayout") ? (
            <textarea
              value={config.designLayout.summary}
              onChange={(e) =>
                updateConfig("designLayout", { summary: e.target.value })
              }
              rows={10}
              className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
            />
          ) : (
            <p className="text-sm text-slate-600 whitespace-pre-wrap">
              {config.designLayout.summary}
            </p>
          )}
        </div>
      </section>

      {/* Voice and Storytelling Observations */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <SectionHeader
          title="Voice and Storytelling Observations"
          sectionId="voiceStorytelling"
          isAdmin={isAdmin}
          editingSection={editingSection}
          setEditingSection={setEditingSection}
        />
        <div className="space-y-4">
          {sectionEditable("voiceStorytelling") ? (
            <textarea
              value={config.voiceStorytelling.summary}
              onChange={(e) =>
                updateConfig("voiceStorytelling", { summary: e.target.value })
              }
              rows={10}
              className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
            />
          ) : (
            <p className="text-sm text-slate-600 whitespace-pre-wrap">
              {config.voiceStorytelling.summary}
            </p>
          )}
        </div>
      </section>

      {/* Popups */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <SectionHeader
          title="Popups"
          sectionId="popups"
          isAdmin={isAdmin}
          editingSection={editingSection}
          setEditingSection={setEditingSection}
        />
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          {sectionEditable("popups") ? (
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

      {addEmailDrawerThemeIndex !== null && (
        <AddEmailDrawer
          themeTitle={config.themes[addEmailDrawerThemeIndex]?.title ?? "Theme"}
          emails={emails}
          excludeEmailIds={config.themes[addEmailDrawerThemeIndex]?.emailIds ?? []}
          onSelectEmail={(id) => {
            const theme = config.themes[addEmailDrawerThemeIndex];
            if (!theme) return;
            const next = config.themes.map((t, j) =>
              j === addEmailDrawerThemeIndex
                ? { ...t, emailIds: [...t.emailIds, id] }
                : t
            );
            updateConfig("themes", next);
          }}
          onClose={() => setAddEmailDrawerThemeIndex(null)}
        />
      )}
    </div>
  );
}

function AddEmailDrawer({
  themeTitle,
  emails,
  excludeEmailIds,
  onSelectEmail,
  onClose,
}: {
  themeTitle: string;
  emails: Email[];
  excludeEmailIds: string[];
  onSelectEmail: (id: string) => void;
  onClose: () => void;
}) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmails = useMemo(() => {
    let list = filterEmailsBySentAt(
      emails,
      dateFrom || null,
      dateTo || null
    );
    list = list.filter((e) => !excludeEmailIds.includes(e.id));
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((email) => {
        const subject = (email.email_subject ?? "").toLowerCase();
        const preview = getPreviewSnippet(email.email_html, 500).toLowerCase();
        return subject.includes(q) || preview.includes(q);
      });
    }
    return list;
  }, [emails, dateFrom, dateTo, searchQuery, excludeEmailIds]);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed top-0 right-0 bottom-0 w-full max-w-2xl bg-white shadow-xl z-50 flex flex-col"
        role="dialog"
        aria-labelledby="add-email-drawer-title"
      >
        <div className="shrink-0 flex items-center justify-between gap-4 p-4 border-b border-slate-200">
          <h2
            id="add-email-drawer-title"
            className="text-lg font-semibold text-slate-900"
          >
            Add email to “{themeTitle}”
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="shrink-0 flex flex-col gap-3 p-4 border-b border-slate-200 bg-slate-50">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                From date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                To date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Search
            </label>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Subject or preview…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredEmails.map((email) => (
              <div
                key={email.id}
                className="cursor-pointer"
                onClick={() => onSelectEmail(email.id)}
              >
                <EmailExampleThumbnail
                  email={email}
                  onClick={() => onSelectEmail(email.id)}
                />
              </div>
            ))}
          </div>
          {filteredEmails.length === 0 && (
            <p className="text-sm text-slate-500 py-8 text-center">
              No emails match the filters, or all have been added.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function SectionHeader({
  title,
  sectionId,
  isAdmin,
  editingSection,
  setEditingSection,
}: {
  title: string;
  sectionId: string;
  isAdmin: boolean;
  editingSection: string | null;
  setEditingSection: (id: string | null) => void;
}) {
  const isEditing = editingSection === sectionId;
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {isAdmin && (
        <button
          type="button"
          onClick={() => setEditingSection(isEditing ? null : sectionId)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium"
        >
          <Pencil className="w-4 h-4" />
          {isEditing ? "Done" : "Edit"}
        </button>
      )}
    </div>
  );
}

function ThemeCard({
  theme,
  index,
  emails,
  isEditing,
  onEmailClick,
  onUpdateTheme,
  onRemove,
  onOpenAddEmailDrawer,
}: {
  theme: RecurringTheme;
  index: number;
  emails: Email[];
  isEditing: boolean;
  onEmailClick: (index: number) => void;
  onUpdateTheme: (patch: Partial<RecurringTheme>) => void;
  onRemove: () => void;
  onOpenAddEmailDrawer?: () => void;
}) {
  const emailsById = new Map(emails.map((e) => [e.id, e]));
  const themeEmails = theme.emailIds
    .map((id) => emailsById.get(id))
    .filter(Boolean) as Email[];
  const availableToAdd = emails.filter((e) => !theme.emailIds.includes(e.id));

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={theme.title}
              onChange={(e) => onUpdateTheme({ title: e.target.value })}
              className="w-full text-lg font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Theme title"
            />
          ) : (
            <h3 className="text-lg font-semibold text-slate-900">
              {theme.title}
            </h3>
          )}
        </div>
        {isEditing && (
          <button
            type="button"
            onClick={onRemove}
            title="Delete theme"
            className="shrink-0 p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div>
        {isEditing ? (
          <textarea
            value={theme.description}
            onChange={(e) => onUpdateTheme({ description: e.target.value })}
            rows={6}
            className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
            placeholder="Pattern and description…"
          />
        ) : (
          <p className="text-sm text-slate-600 whitespace-pre-wrap">
            {theme.description || "—"}
          </p>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          Emails
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {themeEmails.map((email) => (
            <div key={email.id} className="relative group">
              <EmailExampleThumbnail
                email={email}
                onClick={() => onEmailClick(emails.indexOf(email))}
              />
              {isEditing && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateTheme({
                      emailIds: theme.emailIds.filter((id) => id !== email.id),
                    })
                  }
                  className="absolute top-1 right-1 p-1 rounded bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove email"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {isEditing && (
            <button
              type="button"
              onClick={onOpenAddEmailDrawer}
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white min-h-[100px] text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add email
            </button>
          )}
        </div>
      </div>
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
