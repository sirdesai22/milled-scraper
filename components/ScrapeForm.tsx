"use client";

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
  loading: boolean;
  onBrandNameChange: (value: string) => void;
  onDatePresetChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onStartScrape: () => void;
}

export function ScrapeForm({
  brandName,
  datePreset,
  dateFrom,
  dateTo,
  loading,
  onBrandNameChange,
  onDatePresetChange,
  onDateFromChange,
  onDateToChange,
  onStartScrape,
}: ScrapeFormProps) {
  const showCustomRange = datePreset === "custom";

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
        <button
          type="button"
          onClick={onStartScrape}
          disabled={loading || !brandName.trim()}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:text-slate-500 dark:disabled:text-slate-400 text-white font-medium text-sm transition-colors disabled:cursor-not-allowed shrink-0"
        >
          {loading ? "Starting…" : "Start scraping"}
        </button>
      </div>

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
