---
name: Milled Email Scraper
overview: Build a Next.js dashboard with Trigger.dev + Playwright that scrapes email campaigns from milled.com by brand name, extracting the `div#emailcell` HTML content and storing it in Supabase.
todos:
  - id: deps
    content: Install playwright, @supabase/supabase-js dependencies
    status: completed
  - id: trigger-config
    content: Update trigger.config.ts with Playwright build extension
    status: completed
  - id: supabase-schema
    content: Create Supabase SQL schema and lib/supabase.ts client with helper functions
    status: completed
  - id: playwright-middleware
    content: Create trigger/playwright-browser.ts with stealth browser middleware
    status: completed
  - id: scrape-brand-task
    content: Create trigger/scrape-brand.ts parent task (search page scraper)
    status: completed
  - id: scrape-email-task
    content: Create trigger/scrape-email.ts child task (email page scraper)
    status: completed
  - id: api-route
    content: Create app/api/scrape/route.ts for triggering jobs and fetching status
    status: completed
  - id: dashboard-ui
    content: Build the Next.js dashboard page with brand input, job list, and email viewer
    status: completed
  - id: env-setup
    content: Create .env.example with required env var placeholders
    status: completed
isProject: false
---

# Milled.com Email Campaign Scraper

## Architecture

```mermaid
flowchart LR
    UI["Next.js Dashboard"] -->|"POST /api/scrape"| API["API Route"]
    API -->|"tasks.trigger"| Parent["scrape-brand task"]
    Parent -->|"Playwright: search page"| Milled["milled.com/search?q=brand"]
    Parent -->|"batchTriggerAndWait"| Child1["scrape-email task 1"]
    Parent -->|"batchTriggerAndWait"| Child2["scrape-email task 2"]
    Parent -->|"batchTriggerAndWait"| ChildN["scrape-email task N"]
    Child1 -->|"Playwright: email page"| Supabase["Supabase DB"]
    Child2 --> Supabase
    ChildN --> Supabase
```



## Database Schema (Supabase)

Two tables in Supabase:

- `**scrape_jobs**`: `id` (uuid, PK), `brand_name` (text), `status` (text: pending/running/completed/failed), `total_emails` (int), `scraped_emails` (int), `created_at` (timestamptz)
- `**emails**`: `id` (uuid, PK), `job_id` (uuid, FK), `brand_name` (text), `email_url` (text, unique), `email_subject` (text), `email_html` (text), `scraped_at` (timestamptz)

These will be created via SQL in the Supabase dashboard (manual step documented in README).

## Files to Create / Modify

### 1. Dependencies

Add to [package.json](package.json):

- `playwright` - browser automation
- `@supabase/supabase-js` - database client
- `@trigger.dev/build` already present as devDep

### 2. Trigger.dev Config - [trigger.config.ts](trigger.config.ts)

Add the Playwright build extension:

```typescript
import { playwright } from "@trigger.dev/build/extensions/playwright";

export default defineConfig({
  // ...existing config
  build: {
    extensions: [playwright()],
  },
});
```

### 3. Playwright Browser Middleware - `trigger/playwright-browser.ts` (new)

Following the official Trigger.dev pattern:

- Use `locals` to store browser instance
- `tasks.middleware` to launch/close browser around each task run
- `tasks.onWait` / `tasks.onResume` for graceful browser lifecycle
- Anti-bot stealth config: custom User-Agent, disabled `webdriver` flag, realistic viewport

### 4. Parent Task - `trigger/scrape-brand.ts` (new)

- Receives `{ brandName: string, jobId: string }`
- Updates job status to `running` in Supabase
- Launches Playwright, navigates to `https://milled.com/search?q={brandName}`
- Waits for page load with random human-like delay (2-5s)
- Extracts all email campaign links from `<li>` elements' `<a>` tags
- Updates `total_emails` count in `scrape_jobs`
- Uses `batchTriggerAndWait` on the child `scrape-email` task for all links
- Updates job status to `completed` when done

### 5. Child Task - `trigger/scrape-email.ts` (new)

- Receives `{ emailUrl: string, brandName: string, jobId: string }`
- Launches Playwright (via middleware), navigates to the email URL
- Random delay before scraping (1-4s)
- Extracts `div#emailcell` outer HTML (note: this div uses Shadow DOM with `<template shadowrootmode="open">`, so we use `element.innerHTML` or `element.evaluate()` to get the full content including the shadow root template)
- Extracts email subject from page title or meta
- Inserts into Supabase `emails` table
- Increments `scraped_emails` count on the parent job

### 6. Supabase Client - `lib/supabase.ts` (new)

- Creates and exports a Supabase client using env vars `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Helper functions: `createJob()`, `updateJob()`, `insertEmail()`, `getJobs()`, `getEmailsByJob()`

### 7. API Route - `app/api/scrape/route.ts` (new)

- `POST`: Accepts `{ brandName }`, creates a job in Supabase, triggers the `scrape-brand` task, returns job ID
- `GET`: Returns list of all jobs with their statuses

### 8. Dashboard UI - [app/page.tsx](app/page.tsx) (replace default content)

- Clean, modern UI with Tailwind CSS
- Input field for brand name + "Start Scraping" button
- Jobs list showing: brand name, status (with color badges), email count, timestamp
- Click a job to expand and see scraped emails
- Auto-refresh to poll job status

### 9. Environment Variables

Create `.env.local` (gitignored) with:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TRIGGER_SECRET_KEY` (already needed for Trigger.dev)

## Anti-Bot Detection Strategy

Applied in both parent and child tasks:

- **Stealth launch args**: `--disable-blink-features=AutomationControlled`, no `webdriver` flag
- **Realistic User-Agent**: Rotate between 3-5 modern Chrome UA strings
- **Random delays**: `2000-5000ms` between page loads, `1000-3000ms` before extracting content
- **Human-like viewport**: `1920x1080` with realistic `deviceScaleFactor`
- **Sequential child processing**: Use `batchTriggerAndWait` which Trigger.dev handles with concurrency queues, not simultaneous browser instances
- **Concurrency limit**: Set queue concurrency on child task to `2-3` max to avoid hammering the site

## Dev Workflow

1. Set up Supabase project and create tables (SQL provided)
2. Add env vars to `.env.local`
3. `npm install` new deps
4. `npx trigger dev` to start Trigger.dev dev server
5. `npm run dev` to start Next.js
6. Enter a brand name in the dashboard and hit scrape

