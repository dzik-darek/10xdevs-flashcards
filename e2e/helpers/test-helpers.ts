import type { Page, BrowserContext } from "@playwright/test";

/**
 * Test helpers for E2E tests
 * Provides utility functions for common test operations
 */

/**
 * Wait for navigation to complete
 */
export async function waitForNavigation(page: Page, url: string, timeout = 10000): Promise<void> {
  await page.waitForURL(url, { timeout });
  await page.waitForLoadState("networkidle");
}

/**
 * Clear browser context (cookies, storage)
 */
export async function clearBrowserContext(context: BrowserContext): Promise<void> {
  await context.clearCookies();
}

/**
 * Clear page storage (localStorage, sessionStorage)
 */
export async function clearPageStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Take a screenshot with descriptive name
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  options?: { fullPage?: boolean }
): Promise<void> {
  await page.screenshot({
    path: `e2e/screenshots/${name}-${Date.now()}.png`,
    fullPage: options?.fullPage ?? false,
  });
}

/**
 * Wait for element to be visible and stable (not animating)
 */
export async function waitForStableElement(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<void> {
  const element = page.locator(selector);
  await element.waitFor({ state: "visible", timeout });
  // Wait a bit for animations to settle
  await page.waitForTimeout(100);
}

/**
 * Check if user is authenticated by checking for redirect to login
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    return page.url().includes("/dashboard");
  } catch {
    return false;
  }
}

/**
 * Logout user by clearing session
 */
export async function logout(page: Page): Promise<void> {
  await clearPageStorage(page);
  await page.context().clearCookies();
  await page.goto("/login");
}

/**
 * Get environment variable with fallback
 */
export function getEnvVar(name: string, fallback?: string): string {
  const value = process.env[name];
  if (!value && !fallback) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value || fallback!;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
