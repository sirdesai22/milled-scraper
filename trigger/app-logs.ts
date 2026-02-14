/**
 * Sends log lines to the Next app so the dashboard can show a Trigger.dev-style run view.
 * Set APP_URL (e.g. https://your-app.vercel.app) and LOG_SECRET in Trigger.dev env.
 */

type LogLevel = "info" | "warn" | "error";

export async function sendJobLog(
  jobId: string,
  source: string,
  message: string,
  level: LogLevel = "info"
): Promise<void> {
  const baseUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.LOG_SECRET;
  if (!baseUrl || !secret) return;

  const url = `${baseUrl.replace(/\/$/, "")}/api/jobs/${jobId}/logs`;
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-log-secret": secret,
      },
      body: JSON.stringify({ source, message, level }),
    });
  } catch {
    // Fire-and-forget; don't fail the task if our app is unreachable
  }
}

/** Use for object messages: stringify for storage, same as logger.log behavior */
export function formatMessage(msg: unknown): string {
  if (typeof msg === "string") return msg;
  try {
    return JSON.stringify(msg);
  } catch {
    return String(msg);
  }
}
