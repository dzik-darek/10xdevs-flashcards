import { expect } from "@playwright/test";
import { test } from "../fixtures/auth.fixture";

/**
 * E2E Tests for Authenticated User Flow
 * Tests that require user to be already logged in
 */

test.describe("Authenticated User Dashboard", () => {
  test("should access dashboard directly when already authenticated", async ({ dashboardPage }) => {
    // User is already authenticated via fixture
    await dashboardPage.goto();

    // Verify dashboard loads successfully
    await dashboardPage.waitForLoad();
    expect(await dashboardPage.isVisible()).toBe(true);

    // Verify user greeting is shown
    const greeting = await dashboardPage.getGreeting();
    expect(greeting).toBeTruthy();
    expect(greeting).toContain("Cześć");
  });

  test("should redirect to dashboard when authenticated user visits login page", async ({ authenticatedPage }) => {
    // Try to visit login page while authenticated
    await authenticatedPage.goto("/login");

    // Should be redirected to dashboard by middleware
    await expect(authenticatedPage).toHaveURL("/dashboard", { timeout: 10000 });
  });

  test("should display dashboard statistics", async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.waitForLoad();

    // Verify stats grid is visible
    expect(await dashboardPage.isStatsGridVisible()).toBe(true);

    // Verify counts are displayed (even if 0)
    const totalCount = await dashboardPage.getTotalCount();
    const studyCount = await dashboardPage.getStudyCount();

    expect(totalCount).toBeTruthy();
    expect(studyCount).toBeTruthy();

    // Counts should be numeric
    expect(totalCount).toMatch(/^\d+$/);
    expect(studyCount).toMatch(/^\d+$/);
  });
});
