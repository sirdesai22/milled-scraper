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
    { title: "Seasonal & Holiday Sales", tags: "CYBER 40% • ADICLUB 35% • Black Friday • Gift cards" },
    { title: "Iconic Silhouette Heritage", tags: "Samba • Legacy Lives On • Lifestyle-first" },
    { title: "Athlete & Sports", tags: "Inter Miami • FIFA • Signature drops" },
    { title: "Brand Collaborations", tags: "Disney • Wales Bonner • Minecraft" },
    { title: "adiClub & Member Exclusives", tags: "Early access • 35% members • App push" },
  ],
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
  themes: ReadonlyArray<{ title: string; tags: string }>;
  subjectLines: { summary: string };
  cadence: ReadonlyArray<{ label: string; desc: string }>;
  offers: { summary: string };
  techStack: { email: string; sms: string };
  designLayout: { summary: string };
  voiceStorytelling: { summary: string };
  popups: { primary: string; secondary: string };
};
