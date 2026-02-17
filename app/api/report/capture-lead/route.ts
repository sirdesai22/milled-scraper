import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, jobId } = body;

    if (!email || !jobId) {
      return NextResponse.json(
        { error: "Email and jobId are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Fetch job details to get brand name
    const { data: job, error: jobError } = await supabase
      .from("scrape_jobs")
      .select("id, brand_name")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Check if email already captured for this job
    const { data: existing } = await supabase
      .from("report_leads")
      .select("id")
      .eq("email", email)
      .eq("job_id", jobId)
      .single();

    if (existing) {
      // Already captured, return success anyway
      return NextResponse.json({ success: true, alreadyExists: true });
    }

    // Insert new lead
    const { error: insertError } = await supabase
      .from("report_leads")
      .insert({
        email,
        job_id: jobId,
        brand_name: job.brand_name,
      });

    if (insertError) {
      console.error("Error inserting lead:", insertError);
      return NextResponse.json(
        { error: "Failed to save lead" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, alreadyExists: false });
  } catch (error) {
    console.error("Error in capture-lead:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
