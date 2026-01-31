import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashboardPage";

/**
 * Extended test fixtures for authentication tests
 * Provides authenticated context and helper methods
 */

interface AuthFixtures {
  authenticatedPage: Page;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
}

/**
 * Helper to perform login and return authenticated page
 */
async function loginAsTestUser(page: Page): Promise<void> {
  const testEmail = process.env.E2E_USERNAME;
  const testPassword = process.env.E2E_PASSWORD;

  if (!testEmail || !testPassword) {
    throw new Error("E2E_USERNAME or E2E_PASSWORD not set in .env.test");
  }

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(testEmail, testPassword);
  await loginPage.waitForSuccessfulLogin();
}

/**
 * Helper to clear authentication state
 */
async function clearAuth(page: Page): Promise<void> {
  // Clear all cookies and storage
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Extended test with authentication fixtures
 */
/* eslint-disable react-hooks/rules-of-hooks */
export const test = base.extend<AuthFixtures>({
  /**
   * Provides a page that is already authenticated as test user
   * Use this for tests that need to start from authenticated state
   */

  authenticatedPage: async ({ page }, use) => {
    await loginAsTestUser(page);
    await use(page);
    // Cleanup: clear auth after test
    await clearAuth(page);
  },

  /**
   * Provides LoginPage instance
   */

  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  /**
   * Provides DashboardPage instance with authenticated session
   */

  dashboardPage: async ({ page }, use) => {
    // Login first to ensure authenticated state
    await loginAsTestUser(page);
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
    // Cleanup: clear auth after test
    await clearAuth(page);
  },
});

export { expect };

/**
 * Exported helper functions for use in tests
 */
export const authHelpers = {
  loginAsTestUser,
  clearAuth,
};
