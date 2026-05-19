/** A platform news item displayed on the charity hub dashboard. */
export interface NewsUpdate {
  id: string;
  title: string;
  excerpt: string;
  url: string;
  publishedAt: string;
}

/**
 * Platform news items surfaced on the charity hub. Static for now — intended to be swapped
 * for a Supabase table or CMS feed without changing the consuming component's API.
 */
export const NEWS_UPDATES: NewsUpdate[] = [
  {
    id: "n-2026-04-15",
    title: "Multi-chain distributions live on Moonbeam",
    excerpt:
      "Charities can now receive scheduled donations on Moonbeam in addition to Ethereum and Polygon.",
    url: "/news/multichain-moonbeam",
    publishedAt: "2026-04-15",
  },
  {
    id: "n-2026-04-02",
    title: "Quarterly impact report — Q1 2026",
    excerpt:
      "Over $4.2M in on-chain donations and 18,700 verified volunteer hours across 430 nonprofits this quarter.",
    url: "/news/q1-2026-impact",
    publishedAt: "2026-04-02",
  },
  {
    id: "n-2026-03-18",
    title: "New verification tier for registered 501(c)(3) charities",
    excerpt:
      "A lightweight onboarding path is now available for nonprofits already registered with the IRS.",
    url: "/news/501c3-tier",
    publishedAt: "2026-03-18",
  },
  {
    id: "n-2026-03-05",
    title: "Volunteer hour endorsements moving on-chain",
    excerpt:
      "Charity endorsements of volunteer hours are being migrated to a tamper-resistant on-chain registry.",
    url: "/news/endorsements-onchain",
    publishedAt: "2026-03-05",
  },
  {
    id: "n-2026-02-20",
    title: "Give Protocol joins the Open Philanthropy Signals coalition",
    excerpt:
      "We're collaborating with partners across the sector to publish shared transparency signals for donors.",
    url: "/news/open-philanthropy-signals",
    publishedAt: "2026-02-20",
  },
];
