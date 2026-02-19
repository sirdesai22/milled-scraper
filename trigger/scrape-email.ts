import { task, logger } from "@trigger.dev/sdk/v3";
import { getBrowserForScraping, isOxylabsConfigured } from "./browser-use";
import {
  randomDelay,
  isCloudflareSecurityPage,
  waitForCloudflareChallengeToBeSolved,
} from "./playwright-browser";
import { insertEmail, incrementScrapedCount } from "../lib/supabase";
import { sendJobLog } from "./app-logs";

function log(
  jobId: string,
  msg: string,
  level: "info" | "warn" | "error" = "info"
) {
  if (level === "error") logger.error(msg);
  else if (level === "warn") logger.warn(msg);
  else logger.log(msg);
  sendJobLog(jobId, "scrape-email", msg, level).catch(() => {});
}

interface ScrapeEmailPayload {
  emailUrl: string;
  brandName: string;
  jobId: string;
}

export const scrapeEmailTask = task({
  id: "scrape-email",
  maxDuration: 600, // 10 minutes max per email
  queue: {
    // 1 at a time to stay within Browser Use Cloud concurrent session limit (avoids 429)
    concurrencyLimit: 20,
  },
  run: async (payload: ScrapeEmailPayload) => {
    const { emailUrl, brandName, jobId } = payload;
    const appLog: (source: string, message: string, level?: "info" | "warn") => void = (
      source,
      message,
      level = "info"
    ) => sendJobLog(jobId, source, message, level).catch(() => {});

    log(jobId, `[scrape-email]: Starting scrape for URL: ${emailUrl}`);

    const { browser, close: closeBrowser } = await getBrowserForScraping({ sendLog: appLog });
    if (process.env.BROWSER_USE_API_KEY && !isOxylabsConfigured()) {
      log(jobId, "[scrape-email]: Using Browser Use Cloud for this email page");
    }

    try {
      const page = await browser.newPage();

      // Navigate to email page
      log(jobId, `[scrape-email]: Navigating to ${emailUrl}`);

      const gotoTimeoutMs = isOxylabsConfigured() ? 90_000 : 30_000;
      await page.goto(emailUrl, {
        waitUntil: "domcontentloaded",
        timeout: gotoTimeoutMs,
      });

      // Random human-like delay before extracting
      await randomDelay(1000, 4000, appLog);

      // Check for Cloudflare "Verify you are human" security page
      const hitSecurityPage = await isCloudflareSecurityPage(page);
      const emailcellTimeoutMs = hitSecurityPage ? 90_000 : 10_000;
      if (hitSecurityPage) {
        log(
          jobId,
          "[scrape-email]: Cloudflare challenge detected. Waiting for Browser Use to solve it (up to 90s) before looking for #emailcell..."
        );
      }

      // Wait for the emailcell div to be present (longer timeout if we hit Cloudflare)
      log(jobId, "[scrape-email]: Waiting for #emailcell to load");

      try {
        await page.waitForSelector("#emailcell", { timeout: emailcellTimeoutMs });
      } catch {
        if (hitSecurityPage) {
          throw new Error(
            "Hit Cloudflare security page; challenge was not solved in time (no #emailcell after 90s)."
          );
        }
        throw new Error("Failed to find #emailcell on the page.");
      }

      // Check if site is still showing Cloudflare after reaching the page (e.g. challenge appeared or page is blocked)
      let stillCloudflare = await isCloudflareSecurityPage(page);
      if (stillCloudflare) {
        log(
          jobId,
          "[scrape-email]: Cloudflare still present after #emailcell loaded. Waiting for challenge to clear..."
        );
        const solved = await waitForCloudflareChallengeToBeSolved(page, {
          timeoutMs: 90_000,
          sendLog: appLog,
        });
        if (!solved) {
          throw new Error(
            "Page still protected by Cloudflare after waiting; email content not extracted."
          );
        }
        stillCloudflare = await isCloudflareSecurityPage(page);
        if (stillCloudflare) {
          throw new Error(
            "Cloudflare challenge did not clear in time; skipping this email."
          );
        }
      }

      // Extract the email HTML
      log(jobId, "[scrape-email]: Extracting email content");

      const emailData = await page.evaluate(() => {
        const emailCell = document.querySelector("#emailcell");

        if (!emailCell) {
          return null;
        }

        // Get the outer HTML including the shadow root content
        // The shadow root template is already in the HTML as <template shadowrootmode="open">
        const emailHtml = emailCell.outerHTML;

        // Try to extract subject from page title or meta tags
        let subject =
          document.title ||
          document
            .querySelector('meta[property="og:title"]')
            ?.getAttribute("content") ||
          "";

        // Clean up the subject
        subject = subject.replace(" - Milled", "").trim();

        // Sent-at time from Milled vendor panel (e.g. <time datetime="2026-02-18T20:00:44-05:00" data-message-target="vendorPanelSentAt">)
        const sentAtEl = document.querySelector(
          'time[data-message-target="vendorPanelSentAt"]'
        ) as HTMLTimeElement | null;
        const sentAt = sentAtEl?.getAttribute("datetime")?.trim() || null;

        return {
          emailHtml,
          subject,
          sentAt,
        };
      });

      await page.close();

      if (!emailData || !emailData.emailHtml) {
        throw new Error("Failed to extract email HTML");
      }

      log(
        jobId,
        `[scrape-email]: Extracted ${emailData.emailHtml.length} characters of HTML`
      );

      // Insert into database (skip if this email_url already exists)
      log(jobId, "[scrape-email]: Saving to database");

      const result = await insertEmail({
        job_id: jobId,
        brand_name: brandName,
        email_url: emailUrl,
        email_subject: emailData.subject || null,
        email_html: emailData.emailHtml,
        sent_at: emailData.sentAt ?? null,
      });

      if ("duplicate" in result && result.duplicate) {
        log(jobId, `[scrape-email]: Email already in database (duplicate URL), skipping`, "warn");
        return {
          success: true,
          emailUrl,
          duplicate: true,
          emailLength: emailData.emailHtml.length,
          subject: emailData.subject,
        };
      }

      await incrementScrapedCount(jobId);
      log(jobId, "[scrape-email]: Successfully saved email to database");

      return {
        success: true,
        emailUrl,
        emailLength: emailData.emailHtml.length,
        subject: emailData.subject,
      };
    } catch (error) {
      log(
        jobId,
        `[scrape-email]: Error scraping ${emailUrl}: ${error}`,
        "error"
      );
      throw error;
    } finally {
      await closeBrowser();
    }
  },
});
