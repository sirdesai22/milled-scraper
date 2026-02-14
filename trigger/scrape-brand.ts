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

const MAX_EMAILS_TO_SCRAPE = 3;

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

interface ScrapeBrandPayload {
  brandName: string;
  jobId: string;
}

export const scrapeBrandTask = task({
  id: "scrape-brand",
  maxDuration: 3600, // 1 hour max
  run: async (payload: ScrapeBrandPayload) => {
    const { brandName, jobId } = payload;
    const appLog: (source: string, message: string, level?: "info" | "warn") => void = (
      source,
      message,
      level = "info"
    ) => sendJobLog(jobId, source, message, level).catch(() => {});

    log(jobId, `[scrape-brand]: Starting scrape for brand: ${brandName}`);

    const { browser, close: closeBrowser } = await getBrowserForScraping({ sendLog: appLog });

    try {
      // Update job status to running
      await updateJob(jobId, { status: "running" });

      const page = await browser.newPage();

      // Navigate to Milled search page
      const searchUrl = `https://milled.com/search?q=${encodeURIComponent(brandName)}`;
      log(jobId, `[scrape-brand]: Navigating to ${searchUrl}`);

      const gotoTimeoutMs = isOxylabsConfigured() ? 90_000 : 30_000;
      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: gotoTimeoutMs,
      });

      // Random human-like delay
      await randomDelay(2000, 5000, appLog);

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

      // Extract email campaign links from the search results
      // Structure: <ul> > <li> > ... > <a data-turbo-frame="_top" href="/brand/email-slug">
      log(jobId, "[scrape-brand]: Extracting email campaign links");

      const scrapeResult = await page.evaluate(() => {
        const seen = new Set<string>();
        const links: string[] = [];

        // Campaign links have data-turbo-frame="_top" and a two-segment path (/brand/slug)
        const anchors = document.querySelectorAll(
          'li a[data-turbo-frame="_top"]'
        );

        anchors.forEach((a) => {
          const anchor = a as HTMLAnchorElement;
          const href = anchor.href;
          if (!href) return;

          // Build absolute URL from relative href
          const url = new URL(href, window.location.origin);
          const segments = url.pathname.split("/").filter(Boolean);

          // Campaign URLs have exactly 2 segments: /brand-slug/email-slug
          if (segments.length !== 2) return;

          const fullUrl = url.origin + url.pathname;
          if (seen.has(fullUrl)) return; // each li has 2 identical <a> tags
          seen.add(fullUrl);
          links.push(fullUrl);
        });

        return {
          links,
          listItemsCount: document.querySelectorAll("li").length,
          pageTitle: document.title,
          pageUrl: window.location.href,
        };
      });

      let emailLinks = scrapeResult.links;

      logger.log("[scrape-brand]: Scraped page snapshot", {
        pageUrl: scrapeResult.pageUrl,
        pageTitle: scrapeResult.pageTitle,
        listItemsCount: scrapeResult.listItemsCount,
        emailCampaignsFound: emailLinks.length,
      });
      log(
        jobId,
        `[scrape-brand]: Scraped page snapshot — ${emailLinks.length} campaigns found (listItems: ${scrapeResult.listItemsCount})`
      );

      const isCloudflareBlock =
        emailLinks.length === 0 &&
        (scrapeResult.pageTitle.includes("Cloudflare") ||
          scrapeResult.pageTitle.includes("Attention Required"));

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
        // Re-extract after challenge solved
        const retryResult = await page.evaluate(() => {
          const seen = new Set<string>();
          const links: string[] = [];
          document
            .querySelectorAll('li a[data-turbo-frame="_top"]')
            .forEach((a) => {
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
          return { links, pageTitle: document.title };
        });
        if (retryResult.links.length === 0) {
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
              "Still on Cloudflare or no email campaigns after challenge. Page title: " +
              retryResult.pageTitle,
            totalEmails: 0,
            scrapedEmails: 0,
          };
        }
        emailLinks = retryResult.links;
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
      const linksToScrape = emailLinks.slice(0, MAX_EMAILS_TO_SCRAPE);
      if (emailLinks.length > MAX_EMAILS_TO_SCRAPE) {
        log(
          jobId,
          `[scrape-brand]: Limiting to ${MAX_EMAILS_TO_SCRAPE} emails (found ${emailLinks.length})`
        );
      }

      // Log scraped page and email URLs we're going to scrape
      logger.log("[scrape-brand]: Scraped search page", {
        searchPageUrl: searchUrl,
        totalFound: emailLinks.length,
        willScrape: linksToScrape.length,
        emailUrls: linksToScrape,
      });
      log(
        jobId,
        `[scrape-brand]: Scraped search page — totalFound=${emailLinks.length}, willScrape=${linksToScrape.length}`
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
