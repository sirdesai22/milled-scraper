"use client";

interface ScrapeFormProps {
  brandName: string;
  loading: boolean;
  onBrandNameChange: (value: string) => void;
  onStartScrape: () => void;
}

export function ScrapeForm({
  brandName,
  loading,
  onBrandNameChange,
  onStartScrape,
}: ScrapeFormProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm p-5 sm:p-6 mb-6">
      <label htmlFor="brand-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
        Brand name
      </label>
      <div className="flex flex-col sm:flex-row gap-3">
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
    </div>
  );
}
