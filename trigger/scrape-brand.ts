import { task, logger } from "@trigger.dev/sdk/v3";
import { getBrowserForScraping, isOxylabsConfigured } from "./browser-use";
import {
  randomDelay,
  isCloudflareSecurityPage,
  waitForCloudflareChallengeToBeSolved,
} from "./playwright-browser";
import { updateJob } from "../lib/supabase";
import { scrapeEmailTask } from "@/trigger/scrape-email";
import { sendJobLog } from "./app-logs";
import { ensureMilledLoggedIn } from "./milled-login";
import type { Page } from "playwright";

const MAX_EMAILS_TO_SCRAPE = 3;
const SEARCH_PAGE_LIMIT = 100;
const DEFAULT_MAX_PAGES = 10;

function log(
  jobId: string,
  msg: string,
  level: "info" | "warn" | "error" = "info"
) {
  if (level === "error") logger.error(msg);
  else if (level === "warn") logger.warn(msg);
  else logger.log(msg);
  sendJobLog(jobId, "scrape-brand", msg, level).catch(() => {});
}

/** Maps dashboard preset to Milled data-preset-name (Pro presets). */
export const DATE_PRESET_MAP: Record<string, string> = {
  default: "",
  last7Days: "last7Days",
  last12Months: "last12Months",
  last24Months: "last24Months",
  allTime: "allTime",
};

interface ScrapeBrandPayload {
  brandName: string;
  jobId: string;
  datePreset?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  maxPages?: number;
  maxEmailsToScrape?: number;
}

type SendLogFn = (source: string, message: string, level?: "info" | "warn") => void;

async function applyDatePreset(
  page: Page,
  presetName: string,
  sendLog: SendLogFn
): Promise<boolean> {
  if (!presetName) return false;
  try {
    const btn = await page.$(`button[data-preset-name="${presetName}"]`);
    if (!btn) {
      sendLog("scrape-brand", `[scrape-brand]: Date preset button not found: ${presetName}`, "warn");
      return false;
    }
    await btn.click();
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    sendLog("scrape-brand", `[scrape-brand]: Date preset click failed: ${msg}`, "warn");
    return false;
  }
}

async function applyCustomDateRange(
  page: Page,
  dateFrom: string,
  dateTo: string,
  sendLog: SendLogFn
): Promise<boolean> {
  try {
    const fromInput = await page.$('input[name="from"], input[data-date-from], #dateFrom');
    const toInput = await page.$('input[name="to"], input[data-date-to], #dateTo');
    if (fromInput && toInput) {
      await fromInput.fill(dateFrom.slice(0, 10));
      await toInput.fill(dateTo.slice(0, 10));
      const applyBtn = await page.$('button:has-text("Apply"), [data-action="apply-dates"]');
      if (applyBtn) await applyBtn.click();
      await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
      return true;
    }
    sendLog("scrape-brand", "[scrape-brand]: Custom date inputs not found; skipping.", "warn");
    return false;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    sendLog("scrape-brand", `[scrape-brand]: Custom date range failed: ${msg}`, "warn");
    return false;
  }
}

/** Parse total result count from text like "Emails (993 results)". */
async function parseTotalResults(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const text = document.body.innerText;
    const match = text.match(/Emails\s*\((\d+)\s*results?\)/i) ?? text.match(/(\d+)\s*results?/i);
    if (match) return parseInt(match[1], 10);
    return null;
  });
}

/** Extract campaign links from current page (vendor page: li a[data-turbo-frame="_top"] with pathname segment count 2). */
async function extractLinksFromPage(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const seen = new Set<string>();
    const links: string[] = [];
    const anchors = document.querySelectorAll('li a[data-turbo-frame="_top"]');
    anchors.forEach((a) => {
      const anchor = a as HTMLAnchorElement;
      if (!anchor.href) return;
      const url = new URL(anchor.href, window.location.origin);
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments.length !== 2) return;
      const fullUrl = url.origin + url.pathname;
      if (seen.has(fullUrl)) return;
      seen.add(fullUrl);
      links.push(fullUrl);
    });
    return links;
  });
}

const MILLED_ORIGIN = "https://milled.com";

/** Get first vendor path from search page (turbo-frame[id^="vendors-"] → first li → first a[href]). Returns path with leading slash or null. */
async function getFirstVendorPath(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const turboFrame = document.querySelector('turbo-frame[id^="vendors-"]');
    if (!turboFrame) return null;
    const firstLi = turboFrame.querySelector('.gallery-items li') ?? turboFrame.querySelector('li');
    if (!firstLi) return null;
    const firstLink = firstLi.querySelector('a[href]') as HTMLAnchorElement | null;
    const href = firstLink?.getAttribute('href');
    if (!href || href === '#') return null;
    const path = href.startsWith('/') ? href : `/${href}`;
    return path;
  });
}

export const scrapeBrandTask = task({
  id: "scrape-brand",
  maxDuration: 3600, // 1 hour max
  run: async (payload: ScrapeBrandPayload) => {
    const {
      brandName,
      jobId,
      datePreset,
      dateFrom,
      dateTo,
      limit = SEARCH_PAGE_LIMIT,
      maxPages = DEFAULT_MAX_PAGES,
      maxEmailsToScrape: payloadMaxEmails,
    } = payload;
    const effectiveMaxEmails = payloadMaxEmails != null && payloadMaxEmails > 0
      ? Math.min(payloadMaxEmails, 500)
      : MAX_EMAILS_TO_SCRAPE;
    const effectiveLimit = Math.min(Math.max(1, limit), 100);
    const effectiveMaxPages = Math.max(1, Math.min(maxPages, 100));

    const appLog: (source: string, message: string, level?: "info" | "warn") => void = (
      source,
      message,
      level = "info"
    ) => sendJobLog(jobId, source, message, level).catch(() => {});

    log(jobId, `[scrape-brand]: Starting scrape for brand: ${brandName}`);

    const { browser, close: closeBrowser } = await getBrowserForScraping({ sendLog: appLog });

    try {
      await updateJob(jobId, { status: "running" });

      const page = await browser.newPage();

      const loggedIn = await ensureMilledLoggedIn(page, { sendLog: appLog });
      if (!loggedIn) {
        log(jobId, "[scrape-brand]: Milled Pro login failed; aborting.", "warn");
        await updateJob(jobId, { status: "failed", total_emails: 0, scraped_emails: 0 });
        await page.close();
        return {
          success: false,
          brandName,
          reason: "Milled Pro login failed (invalid credentials or login error).",
          totalEmails: 0,
          scrapedEmails: 0,
        };
      }

      const q = encodeURIComponent(brandName).replace(/%20/g, "+");
      const buildSearchUrl = (pageNum: number) =>
        `https://milled.com/search?q=${q}&limit=${effectiveLimit}&page=${pageNum}`;

      const searchUrl = buildSearchUrl(1);
      log(jobId, `[scrape-brand]: Navigating to ${searchUrl}`);

      const gotoTimeoutMs = isOxylabsConfigured() ? 90_000 : 30_000;
      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: gotoTimeoutMs,
      });

      await randomDelay(2000, 5000, appLog);

      if (datePreset && DATE_PRESET_MAP[datePreset]) {
        const presetName = DATE_PRESET_MAP[datePreset];
        log(jobId, `[scrape-brand]: Applying date preset: ${presetName || "default"}`);
        const applied = await applyDatePreset(page, presetName, appLog);
        if (applied) {
          await randomDelay(1000, 3000, appLog);
        }
      } else if (dateFrom && dateTo) {
        log(jobId, `[scrape-brand]: Applying custom date range: ${dateFrom} to ${dateTo}`);
        const applied = await applyCustomDateRange(page, dateFrom, dateTo, appLog);
        if (applied) {
          await randomDelay(1000, 3000, appLog);
        }
      }

      // Check for Cloudflare "Verify you are human" security page
      let hitSecurityPage = await isCloudflareSecurityPage(page);
      if (hitSecurityPage) {
        const solved = await waitForCloudflareChallengeToBeSolved(page, {
          timeoutMs: 90_000,
          sendLog: appLog,
        });
        if (!solved) {
          log(
            jobId,
            "[scrape-brand]: Cloudflare challenge was not solved in time. Cannot scrape search results.",
            "warn"
          );
          await updateJob(jobId, {
            status: "failed",
            total_emails: 0,
            scraped_emails: 0,
          });
          await page.close();
          return {
            success: false,
            brandName,
            reason: "Hit Cloudflare security page; challenge was not solved in time.",
            totalEmails: 0,
            scrapedEmails: 0,
          };
        }
        hitSecurityPage = false;
      }

      const allLinks: string[] = [];
      const seenUrls = new Set<string>();

      function addLinks(links: string[]) {
        for (const u of links) {
          if (!seenUrls.has(u)) {
            seenUrls.add(u);
            allLinks.push(u);
          }
        }
      }

      log(jobId, "[scrape-brand]: Waiting for vendors turbo-frame");
      try {
        await page.waitForSelector('turbo-frame[id^="vendors-"]', { timeout: 15_000 });
      } catch {
        log(jobId, "[scrape-brand]: Vendors turbo-frame not found on search page", "warn");
        await updateJob(jobId, { status: "failed", total_emails: 0, scraped_emails: 0 });
        await page.close();
        return {
          success: false,
          brandName,
          reason: "Vendors list not found on search page.",
          totalEmails: 0,
          scrapedEmails: 0,
        };
      }

      const firstVendorPath = await getFirstVendorPath(page);
      if (!firstVendorPath) {
        log(jobId, "[scrape-brand]: Could not get first vendor link from turbo-frame", "warn");
        await updateJob(jobId, { status: "failed", total_emails: 0, scraped_emails: 0 });
        await page.close();
        return {
          success: false,
          brandName,
          reason: "Vendors list not found on search page.",
          totalEmails: 0,
          scrapedEmails: 0,
        };
      }

      const vendorUrl = MILLED_ORIGIN + (firstVendorPath.startsWith("/") ? firstVendorPath : `/${firstVendorPath}`);
      log(jobId, `[scrape-brand]: Navigating to first vendor: ${vendorUrl}`);
      await page.goto(vendorUrl, {
        waitUntil: "domcontentloaded",
        timeout: gotoTimeoutMs,
      });
      await randomDelay(1000, 3000, appLog);

      const totalResults = await parseTotalResults(page);
      const totalPages =
        totalResults != null
          ? Math.ceil(totalResults / effectiveLimit)
          : 1;
      const pagesToFetch = Math.min(effectiveMaxPages, totalPages);

      if (totalResults != null) {
        log(jobId, `[scrape-brand]: Vendor page — Emails (${totalResults} results), fetching up to ${pagesToFetch} page(s)`);
      }

      log(jobId, "[scrape-brand]: Extracting email campaign links from vendor page");
      addLinks(await extractLinksFromPage(page));

      for (let p = 2; p <= pagesToFetch; p++) {
        await randomDelay(500, 1500, appLog);
        const vendorPageUrl = `${vendorUrl}${vendorUrl.includes("?") ? "&" : "?"}page=${p}`;
        log(jobId, `[scrape-brand]: Fetching vendor page ${p}/${pagesToFetch}: ${vendorPageUrl}`);
        await page.goto(vendorPageUrl, {
          waitUntil: "domcontentloaded",
          timeout: gotoTimeoutMs,
        });
        await randomDelay(1000, 2500, appLog);
        addLinks(await extractLinksFromPage(page));
      }

      let emailLinks = allLinks;

      logger.log("[scrape-brand]: Aggregated vendor page(s)", {
        totalResults: totalResults ?? "unknown",
        pagesFetched: pagesToFetch,
        emailCampaignsFound: emailLinks.length,
      });
      log(
        jobId,
        `[scrape-brand]: Aggregated ${emailLinks.length} campaigns from ${pagesToFetch} vendor page(s)`
      );

      const pageTitle = await page.title();
      const isCloudflareBlock =
        emailLinks.length === 0 &&
        (pageTitle.includes("Cloudflare") || pageTitle.includes("Attention Required"));

      if (isCloudflareBlock) {
        log(
          jobId,
          "[scrape-brand]: Page is Cloudflare challenge (Attention Required). Waiting for it to be solved...",
          "warn"
        );
        const solved = await waitForCloudflareChallengeToBeSolved(page, {
          timeoutMs: 90_000,
          sendLog: appLog,
        });
        if (!solved) {
          log(jobId, "[scrape-brand]: Cloudflare challenge was not solved in time.", "warn");
          await updateJob(jobId, {
            status: "failed",
            total_emails: 0,
            scraped_emails: 0,
          });
          await page.close();
          return {
            success: false,
            brandName,
            reason:
              "Blocked by Cloudflare (Attention Required). Challenge was not solved in time.",
            totalEmails: 0,
            scrapedEmails: 0,
          };
        }
        // Re-run flow: still on search page → wait for turbo-frame → navigate to first vendor → extract links
        try {
          await page.waitForSelector('turbo-frame[id^="vendors-"]', { timeout: 15_000 });
        } catch {
          await updateJob(jobId, {
            status: "failed",
            total_emails: 0,
            scraped_emails: 0,
          });
          await page.close();
          return {
            success: false,
            brandName,
            reason: "After Cloudflare solve: vendors turbo-frame not found.",
            totalEmails: 0,
            scrapedEmails: 0,
          };
        }
        const retryVendorPath = await getFirstVendorPath(page);
        if (!retryVendorPath) {
          await updateJob(jobId, {
            status: "failed",
            total_emails: 0,
            scraped_emails: 0,
          });
          await page.close();
          return {
            success: false,
            brandName,
            reason: "After Cloudflare solve: could not get first vendor link.",
            totalEmails: 0,
            scrapedEmails: 0,
          };
        }
        const retryVendorUrl = MILLED_ORIGIN + (retryVendorPath.startsWith("/") ? retryVendorPath : `/${retryVendorPath}`);
        log(jobId, `[scrape-brand]: Navigating to first vendor (retry): ${retryVendorUrl}`);
        await page.goto(retryVendorUrl, {
          waitUntil: "domcontentloaded",
          timeout: gotoTimeoutMs,
        });
        await randomDelay(1000, 3000, appLog);
        const retryLinks: string[] = [];
        const retrySeen = new Set<string>();
        for (const u of await extractLinksFromPage(page)) {
          if (!retrySeen.has(u)) {
            retrySeen.add(u);
            retryLinks.push(u);
          }
        }
        if (retryLinks.length === 0) {
          await updateJob(jobId, {
            status: "failed",
            total_emails: 0,
            scraped_emails: 0,
          });
          await page.close();
          return {
            success: false,
            brandName,
            reason:
              "Still on Cloudflare or no email campaigns after challenge.",
            totalEmails: 0,
            scrapedEmails: 0,
          };
        }
        emailLinks = retryLinks;
        log(
          jobId,
          `[scrape-brand]: After Cloudflare solve, found ${emailLinks.length} email campaigns`
        );
      }

      log(jobId, `[scrape-brand]: Found ${emailLinks.length} email campaigns`);
      log(jobId, `[scrape-brand]: Email links: ${emailLinks.join(", ")}`);

      if (emailLinks.length === 0) {
        log(jobId, "[scrape-brand]: No email campaigns found", "warn");
        await updateJob(jobId, {
          status: "completed",
          total_emails: 0,
          scraped_emails: 0,
        });
        await page.close();
        return {
          success: true,
          brandName,
          totalEmails: 0,
          scrapedEmails: 0,
        };
      }

      // Limit to max emails to scrape
      const linksToScrape = emailLinks.slice(0, effectiveMaxEmails);
      if (emailLinks.length > effectiveMaxEmails) {
        log(
          jobId,
          `[scrape-brand]: Limiting to ${effectiveMaxEmails} emails (found ${emailLinks.length})`
        );
      }

      // Log vendor page scrape and email URLs we're going to scrape
      logger.log("[scrape-brand]: Scraped vendor page", {
        totalFound: emailLinks.length,
        willScrape: linksToScrape.length,
        emailUrls: linksToScrape,
      });
      log(
        jobId,
        `[scrape-brand]: Scraped vendor page — totalFound=${emailLinks.length}, willScrape=${linksToScrape.length}`
      );
      for (const url of linksToScrape) {
        log(jobId, `[scrape-brand]: Will scrape: ${url}`);
      }

      // Update total_emails count (number we're actually scraping)
      await updateJob(jobId, { total_emails: linksToScrape.length });

      await page.close();

      // Batch trigger child tasks for each email link
      log(jobId, "[scrape-brand]: Triggering child tasks for email scraping");

      const batchPayloads = linksToScrape.map((emailUrl) => ({
        payload: {
          emailUrl,
          brandName,
          jobId,
        },
      }));

      // Trigger child tasks in batches (max 1000 per batch as per Trigger.dev limits)
      const results = await scrapeEmailTask.batchTriggerAndWait(batchPayloads);

      // Count successful scrapes
      let successCount = 0;
      let failCount = 0;

      for (const result of results.runs) {
        if (result.ok) {
          successCount++;
        } else {
          failCount++;
          log(
            jobId,
            `[scrape-brand]: Failed to scrape email: ${result.error}`,
            "error"
          );
        }
      }

      log(
        jobId,
        `[scrape-brand]: Completed. Success: ${successCount}, Failed: ${failCount}`
      );

      // Update job status to completed
      await updateJob(jobId, { status: "completed" });

      return {
        success: true,
        brandName,
        totalEmails: linksToScrape.length,
        scrapedEmails: successCount,
        failedEmails: failCount,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isClosed =
        message.includes("Target closed") ||
        message.includes("browser has been closed") ||
        message.includes("context or browser has been closed");
      log(
        jobId,
        `[scrape-brand]: Error: ${isClosed ? "Browser or page was closed (session may have timed out or disconnected). " + message : message}`,
        "error"
      );

      // Update job status to failed
      await updateJob(jobId, { status: "failed" });

      if (isClosed) {
        throw new Error(
          "Browser or page was closed during scrape. The Browser Use session may have timed out or disconnected. Try again or check your session limit."
        );
      }
      throw error;
    } finally {
      await closeBrowser();
    }
  },
});
