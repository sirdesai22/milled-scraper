import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { createJob, getJobs, getEmailsByJob, insertJobLog, updateJob } from "@/lib/supabase";
import type { scrapeBrandTask } from "@/trigger/scrape-brand";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      brandName,
      datePreset,
      dateFrom,
      dateTo,
      limit,
      maxPages,
      maxEmailsToScrape,
    } = body as {
      brandName?: string;
      datePreset?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      maxPages?: number;
      maxEmailsToScrape?: number;
    };

    if (!brandName || typeof brandName !== "string") {
      return NextResponse.json(
        { error: "Brand name is required" },
        { status: 400 }
      );
    }

    const job = await createJob(brandName);
    try {
      await insertJobLog(job.id, {
        source: "app",
        message: `[app]: Job created for "${brandName}". Triggering scrape-brand...`,
      });
    } catch {
      // job_logs table may not exist yet
    }

    //convert limit, maxPages, maxEmailsToScrape to numbers if they are strings
    const effectiveLimit = typeof limit === "string" ? parseInt(limit) : limit;
    const effectiveMaxPages = typeof maxPages === "string" ? parseInt(maxPages) : maxPages;
    const effectiveMaxEmailsToScrape = typeof maxEmailsToScrape === "string" ? parseInt(maxEmailsToScrape) : maxEmailsToScrape;

    const triggerPayload = {
      brandName: brandName.trim(),
      jobId: job.id,
      ...(datePreset != null && { datePreset: String(datePreset) }),
      ...(dateFrom != null && { dateFrom: String(dateFrom) }),
      ...(dateTo != null && { dateTo: String(dateTo) }),
      ...(typeof effectiveLimit === "number" && effectiveLimit > 0 && { limit: Math.min(effectiveLimit, 100) }),
      ...(typeof effectiveMaxPages === "number" && effectiveMaxPages > 0 && { maxPages: effectiveMaxPages }),
      ...(typeof effectiveMaxEmailsToScrape === "number" && effectiveMaxEmailsToScrape > 0 && { maxEmailsToScrape: Math.min(effectiveMaxEmailsToScrape, 500) }),
    };

    const handle = await tasks.trigger<typeof scrapeBrandTask>(
      "scrape-brand",
      triggerPayload
    );

    await updateJob(job.id, { trigger_run_id: handle.id });

    try {
      await insertJobLog(job.id, {
        source: "app",
        message: `[app]: Triggered run ${handle.id}. Logs will stream below as the task runs.`,
      });
      // Synthetic step logs so the UI shows activity immediately
      const steps = [
        "[app]: Job queued. Waiting for worker to pick up task...",
        "[app]: Worker started. Running scrape-brand...",
        "[app]: Launching browser (Playwright + stealth)...",
        "[app]: Navigating to milled.com search...",
        "[app]: Loading search results page...",
        "[app]: Extracting email campaign links from page...",
        "[app]: Fetching email list. Real-time logs will appear below.",
      ];
      for (const message of steps) {
        await insertJobLog(job.id, { source: "app", message });
      }
    } catch {
      // job_logs table may not exist yet
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      triggerHandle: handle.id,
    });
  } catch (error) {
    console.error("Error triggering scrape:", error);
    return NextResponse.json(
      { error: "Failed to trigger scrape job" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get("jobId");

    if (jobId) {
      // Get emails for a specific job
      const emails = await getEmailsByJob(jobId);
      return NextResponse.json({ emails });
    }

    // Get all jobs
    const jobs = await getJobs();
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
