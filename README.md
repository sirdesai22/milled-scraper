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

Supabase stores scrape jobs, email HTML, report config, and lead captures.

1. **Create a project** at [supabase.com](https://supabase.com) → New project.
2. **Apply the schema** using one of these methods:
   - **Option A – Supabase CLI** (recommended if you use the CLI):
     ```bash
     npx supabase link --project-ref YOUR_PROJECT_REF
     npx supabase db push
     ```
   - **Option B – SQL Editor**: In the Supabase dashboard, go to **SQL Editor** → New query, paste the contents of `supabase/migrations/20250601000000_milled_final.sql`, then Run.
3. **Get credentials**: Go to **Settings → API**.
   - **Project URL** → use as `SUPABASE_URL`
   - **Service role key** (secret) → use as `SUPABASE_SERVICE_ROLE_KEY`  
   The app uses the service role so it can read/write all tables; RLS is enabled on `job_logs` for future auth.

### 3. Set Up Trigger.dev

1. Create an account at [trigger.dev](https://trigger.dev)
2. Create a new project
3. Get your **Project ref** and **Secret key** from the project settings

### 4. Set Up Oxylabs (optional)

[Oxylabs Web Unblocker](https://oxylabs.io/products/web-unblocker) is used as a proxy to help get past Cloudflare and other bot protection when scraping milled.com. It is only used when **not** using Browser Use Cloud (i.e. when `BROWSER_USE_API_KEY` is unset).

1. Sign up at [oxylabs.io](https://oxylabs.io) and subscribe to **Web Unblocker** (or start a trial).
2. In [Dashboard → Proxy](https://dashboard.oxylabs.io), get your **Username** and **Password** for Web Unblocker.
3. Add to `.env.local` (and to your Trigger.dev project env for deployed tasks):
   - `OXYLABS_PROXY_USERNAME` – your Oxylabs username  
   - `OXYLABS_PROXY_PASSWORD` – your Oxylabs password  
   - `OXYLABS_PROXY_SERVER` – optional; defaults to `https://unblock.oxylabs.io:60000` if omitted.

If these are not set, scraping runs without a proxy (stealth Playwright only). For best success against Cloudflare, use either Oxylabs or Browser Use Cloud.

### 5. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Required
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
TRIGGER_PROJECT_REF=proj_xxxxxxxxxxxxxxxxxxxxxxxx
TRIGGER_SECRET_KEY=your_trigger_secret_key

# Run view / logs (Trigger tasks send logs to the app)
APP_URL=http://localhost:3000
LOG_SECRET=your_shared_secret_for_log_endpoint

# Optional – Browser Use Cloud (CDP browsers; when set, Oxylabs is not used)
BROWSER_USE_API_KEY=

# Optional – Oxylabs Web Unblocker (proxy for Cloudflare bypass when not using Browser Use)
OXYLABS_PROXY_USERNAME=
OXYLABS_PROXY_PASSWORD=
# OXYLABS_PROXY_SERVER=https://unblock.oxylabs.io:60000

# Optional – Auth (defaults: admin@gmail.com / admin@123)
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=admin@123

# Optional – Milled Pro (for date range and full archive)
MILLED_PRO_EMAIL=
MILLED_PRO_PASSWORD=
```

### 6. Run the Development Servers

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
├── supabase/migrations/         # Database migrations (run via supabase db push)
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
- **Oxylabs Web Unblocker** (optional): Proxy for Cloudflare bypass when using local Playwright; set `OXYLABS_PROXY_USERNAME` and `OXYLABS_PROXY_PASSWORD`.
- Stealth Playwright configuration (when not using Browser Use).
- Human-like random delays (1-5 seconds).
- Realistic viewport and browser settings.
- Concurrency limiting (max 3 concurrent scrapes).
- Removed webdriver detection flags.

## Database Schema

Tables are created by the migration in `supabase/migrations/20250601000000_milled_final.sql`.

### scrape_jobs
- `id` (UUID) - Primary key
- `brand_name` (TEXT) - Brand being scraped
- `status` (TEXT) - pending / running / completed / failed
- `total_emails` (INTEGER) - Total emails found
- `scraped_emails` (INTEGER) - Successfully scraped
- `created_at` (TIMESTAMPTZ) - Job creation time
- `trigger_run_id` (TEXT) - Trigger.dev run id for dashboard links

### emails
- `id` (UUID) - Primary key
- `job_id` (UUID) - Foreign key to scrape_jobs
- `brand_name` (TEXT) - Brand name
- `email_url` (TEXT) - URL of the email
- `email_subject` (TEXT) - Email subject line
- `email_html` (TEXT) - Full HTML content including shadow DOM
- `scraped_at` (TIMESTAMPTZ) - Scrape timestamp
- `sent_at` (TIMESTAMPTZ) - When the campaign was sent (from Milled)

### job_logs
- Log entries per job for the run view (Trigger.dev-style). RLS enabled.

### report_leads
- Captured emails (email + job_id unique) for lead-magnet report access.

### report_config
- Editable strategy report content per job (JSONB), admin-only.

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

### "chromium-headless-shell" grep error on deploy
If deploy fails with:
```text
RUN grep -A5 -m1 "browser: chromium-headless-shell" /tmp/browser-info.txt ... exit code 1
```
the `@trigger.dev/build` Playwright extension expects an older `playwright install --dry-run` format. Fix it by patching the extension (run from repo root):
```bash
cd node_modules/@trigger.dev/build && patch -p1 < ../../../patches/@trigger.dev+build+4.3.3.patch && cd ../../..
```
If you don’t have the patch file, edit both files and change the grep pattern as follows.

**Where to fix (both files):**
- `node_modules/@trigger.dev/build/dist/esm/extensions/playwright.js` (around line 266)
- `node_modules/@trigger.dev/build/dist/commonjs/extensions/playwright.js` (around line 269)

**Change:** replace
```js
"browser: ${browser}"
```
with
```js
"${browser}"
```
inside the `instructions.push(\`RUN grep -A5 -m1 ...\`)` call. Then run `npx trigger.dev@latest deploy` again.

### Other browser download failures
For other build errors, you can try pinning Playwright in `trigger.config.ts`: `playwright({ version: "1.40.0" })`.

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
