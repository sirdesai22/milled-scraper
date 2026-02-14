import { logger, tasks, locals } from "@trigger.dev/sdk/v3";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "playwright";

// Add stealth plugin to evade bot detection (webdriver, permissions, etc.)
chromium.use(StealthPlugin());

// Create a locals key for the browser instance
const PlaywrightBrowserLocal = locals.create<{ browser: Browser }>(
  "playwright-browser"
);

export function getBrowser(): Browser {
  return locals.getOrThrow(PlaywrightBrowserLocal).browser;
}

function setBrowser(browser: Browser): void {
  locals.set(PlaywrightBrowserLocal, { browser });
}

const STEALTH_LAUNCH_ARGS = [
  "--disable-blink-features=AutomationControlled",
  "--disable-dev-shm-usage",
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-web-security",
  "--disable-features=IsolateOrigins,site-per-process",
];

const OXYLABS_PROXY_SERVER_DEFAULT = "https://unblock.oxylabs.io:60000";

function getOxylabsProxy():
  | { server: string; username: string; password: string }
  | undefined {
  const username = process.env.OXYLABS_PROXY_USERNAME;
  const password = process.env.OXYLABS_PROXY_PASSWORD;
  if (!username || !password) return undefined;
  const server =
    process.env.OXYLABS_PROXY_SERVER ?? OXYLABS_PROXY_SERVER_DEFAULT;
  return { server, username, password };
}

async function launchStealthBrowser(): Promise<Browser> {
  const proxy = getOxylabsProxy();
  const args = [...STEALTH_LAUNCH_ARGS];
  if (proxy) {
    args.push("--ignore-certificate-errors"); // Oxylabs Web Unblocker uses its own cert; required per Oxylabs docs
    logger.log(
      "[Playwright]: Using Oxylabs Web Unblocker proxy for Cloudflare bypass"
    );
  }
  const launchOptions: Parameters<typeof chromium.launch>[0] = {
    headless: true,
    args,
    ...(proxy && { proxy }),
  };
  return chromium.launch(launchOptions);
}

// Skip local browser only when using Browser Use and Oxylabs is not set
function useLocalBrowser(): boolean {
  if (getOxylabsProxy()) return true;
  if (process.env.BROWSER_USE_API_KEY) return false;
  return true;
}

// Middleware to manage browser lifecycle (skipped when using Browser Use Cloud without Oxylabs)
tasks.middleware("playwright-browser", async ({ next }) => {
  if (!useLocalBrowser()) {
    logger.log("[Playwright]: Using Browser Use Cloud, skipping local browser");
    await next();
    return;
  }

  const browser = await launchStealthBrowser();
  setBrowser(browser);
  logger.log("[Playwright]: Browser launched with playwright-extra + stealth");

  try {
    await next();
  } finally {
    await browser.close();
    logger.log("[Playwright]: Browser closed");
  }
});

// Handle waits - close browser to free resources (no-op when using Browser Use only)
tasks.onWait("playwright-browser", async () => {
  if (!useLocalBrowser()) return;
  const browser = getBrowser();
  await browser.close();
  logger.log("[Playwright]: Browser closed (onWait)");
});

// Handle resumes - relaunch browser (no-op when using Browser Use only)
tasks.onResume("playwright-browser", async () => {
  if (!useLocalBrowser()) return;
  const browser = await launchStealthBrowser();
  setBrowser(browser);
  logger.log("[Playwright]: Browser relaunched (onResume)");
});

// Helper function to add random delay (human-like behavior)
export async function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  logger.log(`[Playwright]: Random delay of ${delay}ms`);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/** Returns true if the current page is a Cloudflare security/challenge page. */
export async function isCloudflareSecurityPage(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const bodyText = document.body?.innerText ?? "";
    const title = document.title ?? "";
    const isChallengeBody =
      bodyText.includes("Verify you are human") ||
      bodyText.includes("Performing security verification") ||
      bodyText.includes("security service to protect against malicious bots");
    const isChallengeTitle =
      title.includes("Cloudflare") || title.includes("Attention Required");
    return isChallengeBody || isChallengeTitle;
  });
}

const CLOUDFLARE_WAIT_POLL_MS = 5000;

/**
 * When Cloudflare "verify you are human" is detected, wait for it to be solved
 * (e.g. by Browser Use auto-solving). Polls until the challenge is gone or timeout.
 * @returns true if the challenge was solved (Cloudflare page no longer visible), false if timeout
 */
export async function waitForCloudflareChallengeToBeSolved(
  page: Page,
  options: { timeoutMs: number } = { timeoutMs: 90_000 }
): Promise<boolean> {
  const { timeoutMs } = options;
  const start = Date.now();
  logger.log(
    `[Playwright]: Cloudflare challenge detected. Waiting up to ${timeoutMs / 1000}s for it to be solved (e.g. by Browser Use)...`
  );

  while (Date.now() - start < timeoutMs) {
    try {
      if (page.isClosed()) {
        logger.warn("[Playwright]: Page was closed during Cloudflare wait.");
        return false;
      }
      const stillCloudflare = await isCloudflareSecurityPage(page);
      if (!stillCloudflare) {
        logger.log("[Playwright]: Cloudflare challenge appears solved, continuing.");
        return true;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (
        msg.includes("Target closed") ||
        msg.includes("browser has been closed") ||
        msg.includes("context or browser has been closed")
      ) {
        logger.warn(
          "[Playwright]: Browser or page was closed during Cloudflare wait (session may have timed out or disconnected)."
        );
        return false;
      }
      throw e;
    }
    await new Promise((r) => setTimeout(r, CLOUDFLARE_WAIT_POLL_MS));
  }

  logger.warn("[Playwright]: Timeout waiting for Cloudflare challenge to be solved.");
  return false;
}
