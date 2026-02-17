import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  AUTH_COOKIE_NAME,
  USER_EMAIL_COOKIE_NAME,
} from "@/lib/constants";
import { DEFAULT_REPORT_CONFIG, type ReportConfig } from "@/lib/report-config";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@gmail.com";

function isAdmin(req: NextRequest): boolean {
  const hasAuth = req.cookies.get(AUTH_COOKIE_NAME)?.value === "1";
  const email = req.cookies.get(USER_EMAIL_COOKIE_NAME)?.value ?? null;
  return hasAuth && (email === ADMIN_EMAIL || !email);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    const { data, error } = await supabase
      .from("report_config")
      .select("config")
      .eq("job_id", jobId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching report config:", error);
      return NextResponse.json(
        { error: "Failed to fetch config" },
        { status: 500 }
      );
    }

    const config: ReportConfig = data?.config
      ? { ...DEFAULT_REPORT_CONFIG, ...data.config }
      : { ...DEFAULT_REPORT_CONFIG };

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error in config GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;

  try {
    const body = (await req.json()) as Partial<ReportConfig>;
    const merged: ReportConfig = {
      ...DEFAULT_REPORT_CONFIG,
      ...body,
    };

    const { error } = await supabase
      .from("report_config")
      .upsert(
        {
          job_id: jobId,
          config: merged,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "job_id" }
      );

    if (error) {
      console.error("Error saving report config:", error);
      return NextResponse.json(
        { error: "Failed to save config" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in config PUT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
