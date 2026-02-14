/**
 * Client-side auth helpers. Session is enforced by middleware (cookie).
 */

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}
