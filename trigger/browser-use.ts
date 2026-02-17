import { logger } from "@trigger.dev/sdk/v3";
import { BrowserUseClient } from "browser-use-sdk";
import { chromium } from "playwright";
import type { Browser } from "playwright";
import { getBrowser } from "./playwright-browser";

export interface ScrapingBrowser {
  browser: Browser;
  close: () => Promise<void>;
}

export type SendLogFn = (
  source: string,
  message: string,
  level?: "info" | "warn"
) => void;

export function isOxylabsConfigured(): boolean {
  return !!(
    process.env.OXYLABS_PROXY_USERNAME && process.env.OXYLABS_PROXY_PASSWORD
  );
}

/**
 * Returns a browser for scraping. When Oxylabs credentials are set, uses local
 * browser with Oxylabs Web Unblocker only (Browser Use is ignored). Otherwise
 * when BROWSER_USE_API_KEY is set, uses Browser Use Cloud; else local browser.
 * Optional sendLog forwards logs to the app UI.
 */
export async function getBrowserForScraping(options?: {
  sendLog?: SendLogFn;
}): Promise<ScrapingBrowser> {
  const sendLog = options?.sendLog;
  if (isOxylabsConfigured()) {
    const msg = "[Scraping]: Using Oxylabs Web Unblocker only (local browser)";
    logger.log(msg);
    sendLog?.("Scraping", msg);
    return {
      browser: getBrowser(),
      close: async () => {},
    };
  }

  const apiKey = process.env.BROWSER_USE_API_KEY;
  if (apiKey) {
    return getBrowserUseBrowser(apiKey, sendLog);
  }

  return {
    browser: getBrowser(),
    close: async () => {},
  };
}

async function getBrowserUseBrowser(
  apiKey: string,
  sendLog?: SendLogFn
): Promise<ScrapingBrowser> {
  const client = new BrowserUseClient({ apiKey });

  const msg1 = "[Browser Use]: Creating cloud browser session";
  logger.log(msg1);
  sendLog?.("Browser Use", msg1);

  const session = await client.browsers.createBrowserSession({
    timeout: 15, // minutes
    proxyCountryCode: "us", // US proxy helps bypass Cloudflare/geo blocks
  });

  if (!session?.cdpUrl) {
    throw new Error(
      "Browser Use session created but no CDP URL returned. Session may have failed."
    );
  }

  const msg2 = `[Browser Use]: Session ${session.id} created, connecting via CDP`;
  logger.log(msg2);
  sendLog?.("Browser Use", msg2);

  const browser = await chromium.connectOverCDP(session.cdpUrl);

  return {
    browser,
    close: async () => {
      try {
        await browser.close();
      } catch (e) {
        const err =
          e instanceof Error
            ? { message: e.message, stack: e.stack }
            : { message: String(e) };
        const msg = `[Browser Use]: Error closing browser: ${err.message}`;
        logger.warn(msg, { error: err });
        sendLog?.("Browser Use", msg, "warn");
      }
      try {
        await client.browsers.updateBrowserSession({
          session_id: session.id,
          action: "stop",
        });
        const msg3 = "[Browser Use]: Session stopped";
        logger.log(msg3);
        sendLog?.("Browser Use", msg3);
      } catch (e) {
        const err =
          e instanceof Error
            ? { message: e.message, stack: e.stack }
            : { message: String(e) };
        const msg = `[Browser Use]: Error stopping session: ${err.message}`;
        logger.warn(msg, { error: err });
        sendLog?.("Browser Use", msg, "warn");
      }
    },
  };
}
