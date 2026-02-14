# Milled Email Scraper

A Next.js web scraper that extracts email campaigns from milled.com using Trigger.dev and Playwright.

## Features

- 🔍 Search and scrape email campaigns by brand name
- 🤖 Automated scraping with bot detection avoidance
- 💾 Store email HTML in Supabase database
- 📊 Real-time dashboard to monitor scraping jobs
- ⚡ Parallel scraping with Trigger.dev background tasks
- 🎨 Modern, responsive UI built with Tailwind CSS

## Architecture

```
User Input → Next.js Dashboard → API Route → Trigger.dev
                                              ↓
                                    Parent Task (Search Page)
                                              ↓
                                    Child Tasks (Email Pages)
                                              ↓
                                    Supabase Database
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run the schema from `supabase-schema.sql`
3. Get your project URL and service role key from Settings → API

### 3. Set Up Trigger.dev

1. Create an account at [trigger.dev](https://trigger.dev)
2. Create a new project
3. Get your secret key from the project settings

### 4. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
TRIGGER_SECRET_KEY=your_trigger_secret_key
```

### 5. Run the Development Servers

Start Trigger.dev dev server (in one terminal):

```bash
npx trigger.dev@latest dev
```

Start Next.js dev server (in another terminal):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Enter a brand name (e.g., "adidas") in the input field
2. Click "Start Scraping"
3. The system will:
   - Search milled.com for email campaigns
   - Extract all email links from the search results (first page only)
   - Scrape each email page to get the HTML content
   - Store everything in Supabase
4. Watch the dashboard as jobs progress
5. Click on a job to expand and view scraped emails

## Project Structure

```
.
├── app/
│   ├── api/scrape/route.ts      # API route for triggering scrapes
│   └── page.tsx                  # Main dashboard UI
├── lib/
│   └── supabase.ts               # Supabase client and helpers
├── trigger/
│   ├── browser-use.ts           # Browser Use Cloud CDP helper (when API key set)
│   ├── playwright-browser.ts   # Browser middleware with stealth config
│   ├── scrape-brand.ts         # Parent task (search page)
│   └── scrape-email.ts         # Child task (email pages)
├── supabase-schema.sql          # Database schema
├── trigger.config.ts            # Trigger.dev configuration
└── .env.example                 # Environment variables template
```

## Browser Use Cloud (optional)

When `BROWSER_USE_API_KEY` is set, scraping uses [Browser Use Cloud](https://docs.cloud.browser-use.com/concepts/overview) instead of a local browser. The app creates a **Browser Session** (direct CDP access), connects Playwright via `chromium.connectOverCDP(session.cdpUrl)`, and runs the same scrape logic in the cloud. This can improve success against bot protection (e.g. Cloudflare).

- Get an API key at [cloud.browser-use.com](https://cloud.browser-use.com).
- Add `BROWSER_USE_API_KEY=bu_...` to `.env.local` (and to your Trigger.dev project env for deployed tasks).
- If the key is not set, the app falls back to the local Playwright + stealth browser.

## Anti-Bot Detection Features

- **Browser Use Cloud** (optional): Cloud browsers via CDP when `BROWSER_USE_API_KEY` is set.
- Stealth Playwright configuration (when not using Browser Use).
- Human-like random delays (1-5 seconds).
- Realistic viewport and browser settings.
- Concurrency limiting (max 3 concurrent scrapes).
- Removed webdriver detection flags.

## Database Schema

### scrape_jobs
- `id` (UUID) - Primary key
- `brand_name` (TEXT) - Brand being scraped
- `status` (TEXT) - pending/running/completed/failed
- `total_emails` (INTEGER) - Total emails found
- `scraped_emails` (INTEGER) - Successfully scraped
- `created_at` (TIMESTAMPTZ) - Job creation time

### emails
- `id` (UUID) - Primary key
- `job_id` (UUID) - Foreign key to scrape_jobs
- `brand_name` (TEXT) - Brand name
- `email_url` (TEXT, UNIQUE) - URL of the email
- `email_subject` (TEXT) - Email subject line
- `email_html` (TEXT) - Full HTML content including shadow DOM
- `scraped_at` (TIMESTAMPTZ) - Scrape timestamp

## Deployment

### Deploy to Vercel

```bash
npm run build
vercel deploy
```

### Deploy Trigger.dev Tasks

```bash
npx trigger.dev@latest deploy
```

Make sure to add all environment variables to your deployment platform.

## Troubleshooting

### Browser download failures
If you encounter errors during the build process, try setting a specific Playwright version in `trigger.config.ts`:

```typescript
playwright({ version: "1.40.0" })
```

### Supabase connection issues
- Verify your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Ensure the database schema has been created
- Check that your Supabase project is active

### Trigger.dev issues
- Make sure `npx trigger.dev@latest dev` is running before testing
- Verify your `TRIGGER_SECRET_KEY` is correct
- Check the Trigger.dev dashboard for task logs

## License

MIT
