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
    summary: `Common Promo Types:

Percentage off: Most common, including "Up to 60% off," "Extra 40% off," and "30% off in the app".

Threshold discounts: For example, "$30 off orders $100+" using specific codes like SCORE.

Gift card value adds: Such as "Spend $75, get $100 gift card".

Price point messaging: Highlighting items like "Shoes for $80 and under".

Offer Laddering: Adidas does not use progressive discount laddering; single-tier thresholds are the standard.

Free Shipping: This is not prominently featured in emails and is tied to adiclub membership as a loyalty benefit.

Loyalty Integration: adiclub is heavily integrated with exclusive perks like member-only products, early access, and app-exclusive discounts (e.g., "Members save 30% in the app").`,
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
    summary: `Common Promo Types: Most frequent are percentage-off deals (e.g., "Up to 60% off"), threshold discounts like "$30 off orders $100+", and gift card value adds.

Offer Laddering: Adidas typically uses single-tier thresholds and does not utilize progressive discount laddering during sales.

Loyalty Integration: Rewards are heavily integrated, featuring member-only products, early access, and app-exclusive discounts (e.g., 30% off in-app).

Free Shipping: This is tied to adiclub membership as a loyalty benefit rather than being prominently featured in general promotional emails.`,
  },
  techStack: {
    email: "SFMC",
    sms: "SFMC",
  },
  designLayout: {
    summary: `Format: Emails are 100% designed/HTML; no plain text versions were observed.

Urgency: Countdown timer GIFs are frequently used for flash sales and major events like Black Friday.

Optimization: Emails use single-column, fully responsive layouts for mobile but are not specifically optimized for dark mode.

Social Proof: Minimal reliance on reviews; the strategy focuses instead on brand strength and athlete partnerships.`,
  },
  voiceStorytelling: {
    summary: `Character Count: Subject lines are concise, typically ranging from 35-55 characters.

Front-loaded Keywords: Focuses on product names (Samba, Gazelle), sale terms, and collaboration names (Bad Bunny, Pharrell).

Hook Styles: Tactics include urgency (e.g., "The clock is ticking..."), celebrity endorsements, and benefit-focused language.

Preview Text: Used to reinforce urgency or expand on benefits mentioned in the subject line.`,
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
