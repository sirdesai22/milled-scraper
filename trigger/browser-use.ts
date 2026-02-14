import { logger } from "@trigger.dev/sdk/v3";
import { BrowserUseClient } from "browser-use-sdk";
import { chromium } from "playwright";
import type { Browser } from "playwright";
import { getBrowser } from "./playwright-browser";

export interface ScrapingBrowser {
  browser: Browser;
  close: () => Promise<void>;
}

export function isOxylabsConfigured(): boolean {
  return !!(
    process.env.OXYLABS_PROXY_USERNAME && process.env.OXYLABS_PROXY_PASSWORD
  );
}

/**
 * Returns a browser for scraping. When Oxylabs credentials are set, uses local
 * browser with Oxylabs Web Unblocker only (Browser Use is ignored). Otherwise
 * when BROWSER_USE_API_KEY is set, uses Browser Use Cloud; else local browser.
 */
export async function getBrowserForScraping(): Promise<ScrapingBrowser> {
  if (isOxylabsConfigured()) {
    logger.log("[Scraping]: Using Oxylabs Web Unblocker only (local browser)");
    return {
      browser: getBrowser(),
      close: async () => {},
    };
  }

  const apiKey = process.env.BROWSER_USE_API_KEY;
  if (apiKey) {
    return getBrowserUseBrowser(apiKey);
  }

  return {
    browser: getBrowser(),
    close: async () => {},
  };
}

async function getBrowserUseBrowser(apiKey: string): Promise<ScrapingBrowser> {
  const client = new BrowserUseClient({ apiKey });

  logger.log("[Browser Use]: Creating cloud browser session");

  const session = await client.browsers.createBrowserSession({
    timeout: 15, // minutes
    proxyCountryCode: "us", // US proxy helps bypass Cloudflare/geo blocks
  });

  if (!session?.cdpUrl) {
    throw new Error(
      "Browser Use session created but no CDP URL returned. Session may have failed."
    );
  }

  logger.log(`[Browser Use]: Session ${session.id} created, connecting via CDP`);

  const browser = await chromium.connectOverCDP(session.cdpUrl);

  return {
    browser,
    close: async () => {
      try {
        await browser.close();
      } catch (e) {
        logger.warn("[Browser Use]: Error closing browser:", e);
      }
      try {
        await client.browsers.updateBrowserSession({
          session_id: session.id,
          action: "stop",
        });
        logger.log("[Browser Use]: Session stopped");
      } catch (e) {
        logger.warn("[Browser Use]: Error stopping session:", e);
      }
    },
  };
}
