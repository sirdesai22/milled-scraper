import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;

  try {
    const { data: emails, error } = await supabase
      .from("emails")
      .select("*")
      .eq("job_id", jobId)
      .order("scraped_at", { ascending: false });

    if (error) {
      console.error("Error fetching emails:", error);
      return NextResponse.json(
        { error: "Failed to fetch emails" },
        { status: 500 }
      );
    }

    return NextResponse.json(emails || []);
  } catch (error) {
    console.error("Error in emails route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
