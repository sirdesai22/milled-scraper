/**
 * App-wide constants. Trigger tasks use their own constants where needed.
 */

/** Poll interval for dashboard job list (ms). */
export const POLL_INTERVAL_MS = 5000;

/** Cookie name for auth session (must match middleware and API). */
export const AUTH_COOKIE_NAME = "milled_auth";

/** Cookie storing logged-in user email (for admin check). */
export const USER_EMAIL_COOKIE_NAME = "milled_user_email";

/**
 * If a job has been "running" longer than this, the UI treats it as possibly stopped
 * (e.g. task crashed or timed out without updating status). Should be >= scrape-brand maxDuration.
 */
export const RUNNING_STALE_AFTER_MS = 10 * 60 * 1000; // 10 minutes
