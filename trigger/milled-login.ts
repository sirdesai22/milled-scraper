import type { Page } from "playwright";

const MILLED_LOGIN_URL = "https://milled.com/login";

export type SendLogFn = (source: string, message: string, level?: "info" | "warn") => void;

/**
 * If MILLED_PRO_EMAIL and MILLED_PRO_PASSWORD are set, navigates to Milled login,
 * fills credentials, submits, and waits for success. Same page then has session cookies.
 * If env not set, no-op.
 */
export async function ensureMilledLoggedIn(
  page: Page,
  options: {
    timeoutMs?: number;
    sendLog?: SendLogFn;
  } = {}
): Promise<boolean> {
  const email = process.env.MILLED_PRO_EMAIL;
  const password = process.env.MILLED_PRO_PASSWORD;
  const { timeoutMs = 30_000, sendLog } = options;

  if (!email?.trim() || !password) {
    return true; // no Pro login configured, continue as guest
  }

  sendLog?.("milled-login", "[milled-login]: Pro credentials set, logging in to Milled...");

  try {
    await page.goto(MILLED_LOGIN_URL, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });

    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

    // Common selectors for login forms (adjust if Milled uses different names/ids)
    const emailSelector =
      'input[type="email"], input[name="email"], input[name="user[email]"], #user_email';
    const passwordSelector =
      'input[type="password"], input[name="password"], input[name="user[password]"], #user_password';

    const emailInput = await page.$(emailSelector);
    const passwordInput = await page.$(passwordSelector);

    if (!emailInput || !passwordInput) {
      sendLog?.(
        "milled-login",
        "[milled-login]: Could not find email/password fields; skipping login.",
        "warn"
      );
      return true;
    }

    await emailInput.fill(email.trim());
    await passwordInput.fill(password);

    sendLog?.("milled-login", "[milled-login]: Submitting login form...");

    const submitButton = await page.$(
      'button[type="submit"], input[type="submit"], [data-action="click->auth#submit"]'
    );
    if (submitButton) {
      await submitButton.click();
    } else {
      await page.keyboard.press("Enter");
    }

    await page.waitForURL((url) => !url.pathname.includes("/login") || url.search.length > 0, {
      timeout: 15_000,
    }).catch(() => {});

    const currentUrl = page.url();
    if (currentUrl.includes("/login") && (await page.$("text=Invalid") || await page.$("text=incorrect"))) {
      sendLog?.("milled-login", "[milled-login]: Login failed (invalid credentials).", "warn");
      return false;
    }

    sendLog?.("milled-login", "[milled-login]: Logged in to Milled (Pro session active).");
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    sendLog?.("milled-login", `[milled-login]: Login error: ${msg}`, "warn");
    return true; // continue without Pro so scrape still runs
  }
}
