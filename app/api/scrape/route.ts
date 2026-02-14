import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { createJob, getJobs, getEmailsByJob } from "@/lib/supabase";
import type { scrapeBrandTask } from "@/trigger/scrape-brand";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brandName } = body;

    if (!brandName || typeof brandName !== "string") {
      return NextResponse.json(
        { error: "Brand name is required" },
        { status: 400 }
      );
    }

    // Create a new scrape job in the database
    const job = await createJob(brandName);

    // Trigger the scrape-brand task
    const handle = await tasks.trigger<typeof scrapeBrandTask>(
      "scrape-brand",
      {
        brandName,
        jobId: job.id,
      }
    );

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
