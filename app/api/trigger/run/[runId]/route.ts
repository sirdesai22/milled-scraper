import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

const TRIGGER_API_BASE = "https://api.trigger.dev";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const hasAuth = request.cookies.get(AUTH_COOKIE_NAME)?.value === "1";
  if (!hasAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;
  if (!runId || !runId.startsWith("run_")) {
    return NextResponse.json({ error: "Invalid run ID" }, { status: 400 });
  }

  const secretKey = process.env.TRIGGER_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Trigger API not configured" },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${TRIGGER_API_BASE}/api/v3/runs/${runId}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: res.status === 404 ? "Run not found" : text || "Trigger API error" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      id: data.id,
      status: data.status,
      taskIdentifier: data.taskIdentifier,
      startedAt: data.startedAt ?? null,
      finishedAt: data.finishedAt ?? null,
      createdAt: data.createdAt,
    });
  } catch (err) {
    console.error("Trigger run fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch run from Trigger" },
      { status: 500 }
    );
  }
}
