/** Demo description for new Recurring Campaign Theme */
export const DEFAULT_THEME_DESCRIPTION = `Pattern: Heavy discounting tied to shopping periods
Prominent codes: "CYBER" (40% off), "ADICLUB" (35% off)
Up to 60% off Black Friday, Cyber Monday promotions
Gift card bundles ($100 for $75)
Week of Deals, End of Year savings`;

export type RecurringTheme = {
  title: string;
  description: string;
  emailIds: string[];
};

/** Normalize themes from legacy shape (title + tags) to current shape (title + description + emailIds) */
export function normalizeThemes(
  themes: ReadonlyArray<{ title: string; tags?: string; description?: string; emailIds?: string[] }>
): RecurringTheme[] {
  return themes.map((t) => ({
    title: t.title,
    description: t.description ?? (t as { tags?: string }).tags ?? "",
    emailIds: Array.isArray(t.emailIds) ? t.emailIds : [],
  }));
}

/**
 * Default report config structure. Used when no config exists in DB.
 */
export const DEFAULT_REPORT_CONFIG = {
  overview: {
    perWeek: "3–5",
    peak: "10–15+",
    period: "Recent",
  },
  themes: [
    {
      title: "Seasonal & Holiday Sales",
      description: DEFAULT_THEME_DESCRIPTION,
      emailIds: [],
    },
    {
      title: "Iconic Silhouette Heritage",
      description: "Pattern: Heritage and lifestyle positioning\nSamba • Legacy Lives On • Lifestyle-first",
      emailIds: [],
    },
    {
      title: "Athlete & Sports",
      description: "Pattern: Athlete and event-driven campaigns\nInter Miami • FIFA • Signature drops",
      emailIds: [],
    },
    {
      title: "Brand Collaborations",
      description: "Pattern: Limited collabs and drops\nDisney • Wales Bonner • Minecraft",
      emailIds: [],
    },
    {
      title: "Club & Member Exclusives",
      description: "Pattern: Member perks and early access\nEarly access • 35% members • App push",
      emailIds: [],
    },
  ] as RecurringTheme[],
  subjectLines: {
    summary: "35–55 chars • Urgency • Sale/Discount • Product names front-loaded",
  },
  cadence: [
    { label: "Wed/Thu", desc: "Mid-week" },
    { label: "Sat", desc: "Weekend" },
    { label: "10am–12pm", desc: "Urgency" },
    { label: "3pm–5pm", desc: "Promo" },
    { label: "Jul–Aug", desc: "Lull" },
    { label: "Nov–Dec", desc: "Peak" },
  ],
  offers: {
    summary: "% off • Threshold • Gift cards • Single-tier (no laddering)",
  },
  techStack: {
    email: "SFMC",
    sms: "SFMC",
  },
  designLayout: {
    summary: "Single-column • Hero image • Clear CTA placement • Mobile-first",
  },
  voiceStorytelling: {
    summary: "Direct tone • Benefit-led • Urgency language • Brand voice consistent",
  },
  popups: {
    primary: "Log in / Sign up • Social sign-in • Member benefits",
    secondary: "No secondary popups",
  },
} as const;

export type ReportConfig = {
  overview: { perWeek: string; peak: string; period: string };
  themes: RecurringTheme[];
  subjectLines: { summary: string };
  cadence: ReadonlyArray<{ label: string; desc: string }>;
  offers: { summary: string };
  techStack: { email: string; sms: string };
  designLayout: { summary: string };
  voiceStorytelling: { summary: string };
  popups: { primary: string; secondary: string };
};
