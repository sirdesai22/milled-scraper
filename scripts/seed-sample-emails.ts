/**
 * Seed script: Creates a test job with 35+ dummy emails from samples/ for testing the lead magnet report.
 * Run with: pnpm run seed
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SAMPLE_SUBJECTS = [
  "Check out the latest drops inside!",
  "Manifest that new year energy.",
  "CYBER MONDAY EXTRA 40% OFF FULL PRICE",
  "THE LEGACY LIVES ON - Samba Collection",
  "Up to 60% off: The clock is ticking...",
  "Get an extra $30 off your order",
  "Embrace all-day comfort in Soft Lux",
  "Anthony Edwards 2: Now pretty in pink",
  "The wait is over: adidas has arrived",
  "MISSED THE SHIPPING CUT OFF?",
  "BEAT THE COLD WITH TERREX",
  "SUPERSTAR - Shop the classics",
  "GIFT 3-STRIPES this holiday",
  "50% SELECT STYLES - Limited time",
  "adiClub Members: 35% off in the app",
  "FIRST DAY TO SAVE BIG",
  "Shop your team anytime for the holiday",
  "Celebrate the new year in style",
  "ADIDAS X MINECRAFT GLOW - Available now",
  "Inter Miami CF MLS Cup Champions",
  "Member Exclusive Giveaway",
  "ADIDAS | DISNEY MINNIE MOUSE",
  "Save more when you spend more",
  "App Exclusive Sale - 35% off only for members",
  "Holiday Gift Guide 2025",
  "Black Friday Week - Deals start now",
  "New Year, New Gear",
  "Back to School Special",
  "Valentine's Day Collection",
  "Spring Sale - Up to 50% off",
  "Lunar New Year Celebration",
  "FIFA World Cup 26 - Shop jerseys",
  "Week of Deals - End of Year savings",
  "The Gift of Samba",
  "Set the scene with Samba",
  "Shoes for $80 and under",
];

async function main() {
  const samplesDir = join(process.cwd(), "samples");
  const sample1Html = readFileSync(join(samplesDir, "sample2.html"), "utf-8");
  const sample2Html = readFileSync(join(samplesDir, "test.html"), "utf-8");

  const samples = [sample1Html, sample2Html];
  const totalEmails = 35;

  console.log("Creating test job...");
  const { data: job, error: jobError } = await supabase
    .from("scrape_jobs")
    .insert({
      brand_name: "Adidas",
      status: "completed",
      total_emails: totalEmails,
      scraped_emails: totalEmails,
    })
    .select()
    .single();

  if (jobError) {
    console.error("Failed to create job:", jobError);
    process.exit(1);
  }

  const jobId = job.id;
  console.log(`Created job ${jobId} (Adidas)`);

  // Generate dates for the past 2 months
  const now = new Date();
  const emails: Array<{
    job_id: string;
    brand_name: string;
    email_url: string;
    email_subject: string;
    email_html: string;
    scraped_at: string;
  }> = [];

  for (let i = 0; i < totalEmails; i++) {
    const daysAgo = Math.floor((i * 1.5) % 60);
    const scrapedAt = new Date(now);
    scrapedAt.setDate(scrapedAt.getDate() - daysAgo);
    scrapedAt.setHours(12 + (i % 8), i % 60, 0, 0);

    emails.push({
      job_id: jobId,
      brand_name: "Adidas",
      email_url: `https://milled.com/adidas/sample-${i + 1}`,
      email_subject: SAMPLE_SUBJECTS[i % SAMPLE_SUBJECTS.length],
      email_html: samples[i % samples.length],
      scraped_at: scrapedAt.toISOString(),
    });
  }

  console.log(`Inserting ${emails.length} emails...`);
  const { error: insertError } = await supabase.from("emails").insert(emails);

  if (insertError) {
    console.error("Failed to insert emails:", insertError);
    process.exit(1);
  }

  console.log(`\nDone! Seeded ${totalEmails} sample emails.`);
  console.log(`\nView the report at: /report/${jobId}`);
  console.log(`Or directly: /report/${jobId}/view (after capturing email)\n`);
}

main();
