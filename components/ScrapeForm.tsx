"use client";

import { useState } from "react";

export const DATE_PRESET_OPTIONS = [
  { value: "", label: "Default (no filter)" },
  { value: "last7Days", label: "Last 7 days" },
  { value: "last12Months", label: "Last 12 months" },
  { value: "last24Months", label: "Last 24 months" },
  { value: "allTime", label: "All time" },
  { value: "custom", label: "Custom range" },
] as const;

interface ScrapeFormProps {
  brandName: string;
  datePreset: string;
  dateFrom: string;
  dateTo: string;
  maxPages: number;
  searchPageLimit: number;
  maxEmailsToScrape: number;
  loading: boolean;
  onBrandNameChange: (value: string) => void;
  onDatePresetChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onMaxPagesChange: (value: number) => void;
  onSearchPageLimitChange: (value: number) => void;
  onMaxEmailsToScrapeChange: (value: number) => void;
  onStartScrape: () => void;
}

export function ScrapeForm({
  brandName,
  datePreset,
  dateFrom,
  dateTo,
  maxPages,
  searchPageLimit,
  maxEmailsToScrape,
  loading,
  onBrandNameChange,
  onDatePresetChange,
  onDateFromChange,
  onDateToChange,
  onMaxPagesChange,
  onSearchPageLimitChange,
  onMaxEmailsToScrapeChange,
  onStartScrape,
}: ScrapeFormProps) {
  const showCustomRange = datePreset === "custom";
  const [devPanelOpen, setDevPanelOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm p-5 sm:p-6 mb-6">
      <label htmlFor="brand-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
        Brand name
      </label>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          id="brand-input"
          type="text"
          value={brandName}
          onChange={(e) => onBrandNameChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onStartScrape()}
          placeholder="e.g. adidas, louis vuitton"
          className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 transition-shadow"
          disabled={loading}
          autoComplete="off"
        />
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onStartScrape}
            disabled={loading || !brandName.trim()}
            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:text-slate-500 dark:disabled:text-slate-400 text-white font-medium text-sm transition-colors disabled:cursor-not-allowed"
          >
            {loading ? "Starting…" : "Start scraping"}
          </button>
          <button
            type="button"
            onClick={() => setDevPanelOpen((o) => !o)}
            disabled={loading}
            className="p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-60"
            title="Dev options"
            aria-label="Dev options"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {devPanelOpen && (
        <div className="mb-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">Dev options</p>
          <div className="flex flex-wrap gap-4">
            <div>
              <label htmlFor="dev-max-pages" className="block text-xs text-slate-600 dark:text-slate-300 mb-1">
                Max pages to scrape
              </label>
              <input
                id="dev-max-pages"
                type="number"
                min={1}
                max={100}
                value={maxPages}
                onChange={(e) => onMaxPagesChange(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                disabled={loading}
                className="w-24 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="dev-search-limit" className="block text-xs text-slate-600 dark:text-slate-300 mb-1">
                Search page limit
              </label>
              <input
                id="dev-search-limit"
                type="number"
                min={1}
                max={100}
                value={searchPageLimit}
                onChange={(e) => onSearchPageLimitChange(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                disabled={loading}
                className="w-24 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="dev-max-emails" className="block text-xs text-slate-600 dark:text-slate-300 mb-1">
                Max emails to scrape
              </label>
              <input
                id="dev-max-emails"
                type="number"
                min={1}
                max={500}
                value={maxEmailsToScrape}
                onChange={(e) => onMaxEmailsToScrapeChange(Math.min(500, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                disabled={loading}
                className="w-24 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 disabled:opacity-60"
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="date-preset" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Date range (Pro)
          </label>
          <select
            id="date-preset"
            value={datePreset}
            onChange={(e) => onDatePresetChange(e.target.value)}
            disabled={loading}
            className="w-full sm:max-w-xs px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 transition-shadow disabled:opacity-60"
          >
            {DATE_PRESET_OPTIONS.map((opt) => (
              <option key={opt.value || "default"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {showCustomRange && (
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label htmlFor="date-from" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                From
              </label>
              <input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 transition-shadow disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="date-to" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                To
              </label>
              <input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 transition-shadow disabled:opacity-60"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
