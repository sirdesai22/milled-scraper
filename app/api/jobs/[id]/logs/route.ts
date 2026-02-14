import { NextRequest, NextResponse } from "next/server";
import { getJobLogs, insertJobLog } from "@/lib/supabase";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const hasAuth = request.cookies.get(AUTH_COOKIE_NAME)?.value === "1";
  if (!hasAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const logs = await getJobLogs(jobId);
    return NextResponse.json({ logs: logs ?? [] });
  } catch {
    return NextResponse.json({ logs: [] });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const secret = request.headers.get("x-log-secret");
  if (secret !== process.env.LOG_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: jobId } = await params;
  let body: { source: string; message: string; level?: "info" | "warn" | "error" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.source || typeof body.message !== "string") {
    return NextResponse.json(
      { error: "source and message required" },
      { status: 400 }
    );
  }
  await insertJobLog(jobId, {
    source: body.source,
    message: body.message,
    level: body.level ?? "info",
  });
  return NextResponse.json({ ok: true });
}
