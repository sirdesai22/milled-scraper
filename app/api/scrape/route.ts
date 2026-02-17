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
    } = body as {
      brandName?: string;
      datePreset?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      maxPages?: number;
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

    const triggerPayload = {
      brandName: brandName.trim(),
      jobId: job.id,
      ...(datePreset != null && { datePreset: String(datePreset) }),
      ...(dateFrom != null && { dateFrom: String(dateFrom) }),
      ...(dateTo != null && { dateTo: String(dateTo) }),
      ...(typeof limit === "number" && limit > 0 && { limit: Math.min(limit, 100) }),
      ...(typeof maxPages === "number" && maxPages > 0 && { maxPages }),
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
