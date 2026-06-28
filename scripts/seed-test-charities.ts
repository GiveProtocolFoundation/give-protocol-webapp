/**
 * Seed test charity organizations into Supabase so the /app featured carousel
 * has something to show before real NGOs sign up. Each test org is created
 * exactly like a real user: an auth.users row, a matching profiles row, and a
 * charity_details row — so clicking through the charity profile code path
 * exercises the real rendering surfaces and surfaces any bugs there.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
 *     npx tsx scripts/seed-test-charities.ts seed
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
 *     npx tsx scripts/seed-test-charities.ts teardown
 *
 * Required env:
 *   VITE_SUPABASE_URL or SUPABASE_URL  (Supabase project URL)
 *   SUPABASE_SERVICE_ROLE_KEY          (server-only key — never commit)
 * Optional env:
 *   SEED_CHARITY_PASSWORD              (login password for every seeded org,
 *                                       default "SeedCharity!2026")
 */

/* eslint-disable no-console */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Best-effort load of .env so the script matches the dev server's setup.
function loadDotEnv(): void {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const envPath = join(here, "..", ".env");
    const text = readFileSync(envPath, "utf8");
    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      const value = line
        .slice(eq + 1)
        .trim()
        .replace(/^"|"$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env missing is fine when env is already set externally.
  }
}
loadDotEnv();

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SEED_PASSWORD = process.env.SEED_CHARITY_PASSWORD ?? "SeedCharity!2026";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing required env. Set VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
  );
}

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface SeedCharity {
  slug: string;
  email: string;
  name: string;
  category: string;
  description: string;
  missionStatement: string;
  imageUrl: string;
  impactHighlights: string[];
  yearFounded: number;
  location: {
    city: string;
    stateProvince: string;
    country: string;
  };
  contact: {
    email: string;
    website: string;
  };
}

const SEED_CHARITIES: SeedCharity[] = [
  {
    slug: "pacific-shoreline-trust",
    email: "seed+pacific-shoreline@giveprotocol.test",
    name: "Pacific Shoreline Trust",
    category: "Environment",
    description:
      "Protecting Pacific coastlines through habitat restoration, volunteer beach cleanups, and policy advocacy across three Western states.",
    missionStatement:
      "Keep the Pacific coast thriving for wildlife and future generations by combining grassroots action with science-led restoration.",
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    impactHighlights: [
      "Restored 42 miles of coastal dune habitat",
      "Mobilized 8,200 volunteers in 2025",
      "Removed 120 tons of shoreline debris",
    ],
    yearFounded: 2011,
    location: {
      city: "Monterey",
      stateProvince: "CA",
      country: "United States",
    },
    contact: {
      email: "hello@pacificshoreline.test",
      website: "https://pacificshoreline.test",
    },
  },
  {
    slug: "harbor-light-food-bank",
    email: "seed+harbor-light@giveprotocol.test",
    name: "Harbor Light Food Bank",
    category: "Hunger Relief",
    description:
      "Rescuing surplus groceries and serving 35 meal programs across the greater harbor region every single week.",
    missionStatement:
      "End food insecurity in our community by connecting surplus food with neighbors who need it, with dignity at every step.",
    imageUrl:
      "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80",
    impactHighlights: [
      "Distributed 2.1M meals in 2025",
      "Partnered with 140 local grocers",
      "Zero-waste model: 93% diversion rate",
    ],
    yearFounded: 2007,
    location: {
      city: "Boston",
      stateProvince: "MA",
      country: "United States",
    },
    contact: {
      email: "team@harborlight.test",
      website: "https://harborlight.test",
    },
  },
  {
    slug: "bright-steps-education",
    email: "seed+bright-steps@giveprotocol.test",
    name: "Bright Steps Education Fund",
    category: "Education",
    description:
      "Funding school supplies, tutoring, and scholarships for first-generation students in under-resourced neighborhoods.",
    missionStatement:
      "Close the opportunity gap by making sure every kid starts the school year with the resources they need to succeed.",
    imageUrl:
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80",
    impactHighlights: [
      "Awarded 540 scholarships this year",
      "Stocked 18 classroom libraries",
      "92% scholarship-to-graduation rate",
    ],
    yearFounded: 2014,
    location: {
      city: "Austin",
      stateProvince: "TX",
      country: "United States",
    },
    contact: {
      email: "hello@brightsteps.test",
      website: "https://brightsteps.test",
    },
  },
  {
    slug: "maple-river-animal-rescue",
    email: "seed+maple-river@giveprotocol.test",
    name: "Maple River Animal Rescue",
    category: "Animal Welfare",
    description:
      "Finding loving homes for abandoned dogs and cats across New England through foster networks, medical care, and adoption events.",
    missionStatement:
      "Every animal deserves a second chance. We rescue, heal, and rehome without turning any pet away for a treatable condition.",
    imageUrl:
      "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?auto=format&fit=crop&w=1200&q=80",
    impactHighlights: [
      "Rehomed 1,850 animals in 2025",
      "Operates a 24/7 medical triage line",
      "No-kill since inception",
    ],
    yearFounded: 2009,
    location: {
      city: "Burlington",
      stateProvince: "VT",
      country: "United States",
    },
    contact: {
      email: "hello@mapleriver.test",
      website: "https://mapleriver.test",
    },
  },
  {
    slug: "codepath-youth-mentorship",
    email: "seed+codepath-youth@giveprotocol.test",
    name: "CodePath Youth Mentorship",
    category: "Education",
    description:
      "Connecting high schoolers with professional software engineers for year-long project-based mentorships and scholarships.",
    missionStatement:
      "Build a software industry that reflects the world. Every mentee finishes with a shipped project, a resume, and a peer network.",
    imageUrl:
      "https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1200&q=80",
    impactHighlights: [
      "320 mentees matched in 2025",
      "$480k in college scholarships disbursed",
      "68% of alumni now study CS or engineering",
    ],
    yearFounded: 2018,
    location: {
      city: "Oakland",
      stateProvince: "CA",
      country: "United States",
    },
    contact: {
      email: "hello@codepath-youth.test",
      website: "https://codepath-youth.test",
    },
  },
  {
    slug: "quiet-forest-wildfire-relief",
    email: "seed+quiet-forest@giveprotocol.test",
    name: "Quiet Forest Wildfire Relief",
    category: "Disaster Relief",
    description:
      "Rapid-response cash grants and housing assistance for families displaced by Western wildfires.",
    missionStatement:
      "Be there in the hours after the call — with cash, shelter, and a human voice — so families can focus on rebuilding their lives.",
    imageUrl:
      "https://images.unsplash.com/photo-1568394221379-2b3d66d8cf50?auto=format&fit=crop&w=1200&q=80",
    impactHighlights: [
      "Disbursed $6.4M in 2025 grants",
      "Average time-to-first-payment: 11 hours",
      "Supports 4 Western US states",
    ],
    yearFounded: 2020,
    location: {
      city: "Bend",
      stateProvince: "OR",
      country: "United States",
    },
    contact: {
      email: "team@quietforest.test",
      website: "https://quietforest.test",
    },
  },
  {
    slug: "second-sunrise-mental-health",
    email: "seed+second-sunrise@giveprotocol.test",
    name: "Second Sunrise Mental Health",
    category: "Health",
    description:
      "Free, multilingual peer counseling and crisis support hotlines for young adults across the Midwest.",
    missionStatement:
      "Make mental health support as accessible as a text message — free, anonymous, and available in the moment you need it most.",
    imageUrl:
      "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=1200&q=80",
    impactHighlights: [
      "24,000 crisis-line conversations in 2025",
      "Available in 7 languages",
      "Partners with 60 college campuses",
    ],
    yearFounded: 2016,
    location: {
      city: "Chicago",
      stateProvince: "IL",
      country: "United States",
    },
    contact: {
      email: "hello@secondsunrise.test",
      website: "https://secondsunrise.test",
    },
  },
  {
    slug: "open-hands-clean-water",
    email: "seed+open-hands@giveprotocol.test",
    name: "Open Hands Clean Water",
    category: "International Aid",
    description:
      "Drilling and maintaining community wells in East Africa while training local operators to keep every well running.",
    missionStatement:
      "No well should fail. Pair every drill with a decade of training, parts, and remote monitoring so access to water is permanent.",
    imageUrl:
      "https://images.unsplash.com/photo-1581091870621-7b2b13a1a9c6?auto=format&fit=crop&w=1200&q=80",
    impactHighlights: [
      "312 wells commissioned across 9 districts",
      "98.4% uptime across monitored wells",
      "Trained 480 local operators",
    ],
    yearFounded: 2012,
    location: {
      city: "Nairobi",
      stateProvince: "",
      country: "Kenya",
    },
    contact: {
      email: "hello@openhands-water.test",
      website: "https://openhands-water.test",
    },
  },
];

interface AdminUser {
  id: string;
  email?: string;
}

async function findUserByEmail(email: string): Promise<AdminUser | null> {
  // listUsers is paginated; for a test seed set of ~8 we only ever read page 1.
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw error;
  const match = data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  return match ? { id: match.id, email: match.email ?? undefined } : null;
}

/** Creates or retrieves the Supabase auth user for a seed charity. */
async function ensureAuthUser(spec: SeedCharity): Promise<string> {
  const existing = await findUserByEmail(spec.email);
  if (existing) {
    console.log(`  auth user exists: ${spec.email} (${existing.id})`);
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: spec.email,
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: { type: "charity", seed: true, seed_slug: spec.slug },
  });
  if (error) throw error;
  if (!data.user) throw new Error(`Failed to create user for ${spec.email}`);
  console.log(`  created auth user: ${spec.email} (${data.user.id})`);
  return data.user.id;
}

/** Creates or updates the profiles row for a seed charity user. */
async function ensureProfile(
  userId: string,
  spec: SeedCharity,
): Promise<string> {
  const { data: existing, error: readError } = await admin
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) throw readError;

  const meta = {
    yearFounded: spec.yearFounded,
    address: {
      city: spec.location.city,
      stateProvince: spec.location.stateProvince,
      country: spec.location.country,
    },
    contact: {
      email: spec.contact.email,
      website: spec.contact.website,
    },
  };

  if (existing?.id) {
    const { error: updateError } = await admin
      .from("profiles")
      .update({ type: "charity", meta })
      .eq("id", existing.id);
    if (updateError) throw updateError;
    return existing.id;
  }

  const { data, error } = await admin
    .from("profiles")
    .insert({ user_id: userId, type: "charity", meta })
    .select("id")
    .single();
  if (error) throw error;
  if (!data?.id) throw new Error(`Failed to create profile for ${spec.email}`);
  return data.id;
}

/** Upserts the charity_details row for a seed charity profile. */
async function ensureCharityDetails(
  profileId: string,
  spec: SeedCharity,
): Promise<void> {
  const row = {
    profile_id: profileId,
    name: spec.name,
    description: spec.description,
    category: spec.category,
    image_url: spec.imageUrl,
    mission_statement: spec.missionStatement,
    impact_highlights: spec.impactHighlights,
  };
  const { error } = await admin
    .from("charity_details")
    .upsert(row, { onConflict: "profile_id" });
  if (error) throw error;
}

/** Seeds all test charities into the database. */
async function runSeed(): Promise<void> {
  console.log(`Seeding ${SEED_CHARITIES.length} test charities...`);
  for (const spec of SEED_CHARITIES) {
    console.log(`• ${spec.name}`);
    const userId = await ensureAuthUser(spec);
    const profileId = await ensureProfile(userId, spec);
    await ensureCharityDetails(profileId, spec);
  }
  console.log("\nSeed complete.");
  console.log("All seeded charities share a common password (see SEED_CHARITY_PASSWORD env var).");
  console.log(
    "Log in via the Charity login with any seeded email above to exercise the authed charity flow.",
  );
}

/** Removes all seeded test charities from the database. */
async function runTeardown(): Promise<void> {
  console.log(`Removing ${SEED_CHARITIES.length} test charities...`);
  for (const spec of SEED_CHARITIES) {
    console.log(`• ${spec.name}`);
    const user = await findUserByEmail(spec.email);
    if (!user) {
      console.log(`  no auth user; skipping`);
      continue;
    }
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profile?.id) {
      await admin.from("charity_details").delete().eq("profile_id", profile.id);
      await admin.from("profiles").delete().eq("id", profile.id);
    }
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;
    console.log(`  removed auth user and rows`);
  }
  console.log("\nTeardown complete.");
}

/** CLI entry point — dispatches to seed or teardown based on argv. */
async function main(): Promise<void> {
  const command = process.argv[2] ?? "seed";
  if (command === "seed") {
    await runSeed();
  } else if (command === "teardown") {
    await runTeardown();
  } else {
    throw new Error(`Unknown command: ${command}. Use "seed" or "teardown".`);
  }
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exitCode = 1;
});
