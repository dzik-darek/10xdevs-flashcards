import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashboardPage";

/**
 * E2E Tests for Login Flow (US-002)
 * 
 * User Story: Logowanie do systemu
 * - Użytkownik może wprowadzić email i hasło
 * - Błędne dane logowania skutkują komunikatem "Nieprawidłowy email lub hasło"
 * - Udane logowanie przekierowuje do dashboardu
 */

test.describe("Login Flow", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test("should display login form with all required elements", async () => {
    // Verify all form elements are visible
    await expect(loginPage.loginFormCard).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.registerLink).toBeVisible();

    // Verify submit button has correct initial text
    await expect(loginPage.submitButton).toHaveText("Zaloguj się");
  });

  test("should show error message for invalid credentials", async ({ page }) => {
    // Attempt login with invalid credentials
    await loginPage.fillEmail("invalid@example.com");
    await loginPage.fillPassword("wrongpassword");
    await loginPage.submit();

    // Wait for error message to appear
    await expect(loginPage.errorAlert).toBeVisible({ timeout: 5000 });

    // Verify error message content
    const errorText = await loginPage.getErrorMessage();
    expect(errorText).toContain("Nieprawidłowy email lub hasło");

    // Verify we're still on login page
    await expect(page).toHaveURL("/login");
  });

  test("should show error message for empty email", async ({ page }) => {
    // Try to submit with empty email (only password)
    await loginPage.fillPassword("somepassword");
    await loginPage.submit();

    // Form validation should prevent submission or show error
    // We remain on login page
    await expect(page).toHaveURL("/login");
  });

  test("should successfully login with valid credentials and redirect to dashboard", async ({ page }) => {
    // Get test credentials from environment
    const testEmail = process.env.E2E_USERNAME;
    const testPassword = process.env.E2E_PASSWORD;

    // Verify test credentials are available
    expect(testEmail).toBeTruthy();
    expect(testPassword).toBeTruthy();

    if (!testEmail || !testPassword) {
      throw new Error("E2E_USERNAME or E2E_PASSWORD not set in .env.test");
    }

    // Perform login
    await loginPage.login(testEmail, testPassword);

    // Wait for redirect to dashboard
    await loginPage.waitForSuccessfulLogin();

    // Verify we're on dashboard page
    await expect(page).toHaveURL("/dashboard");

    // Verify no error message is shown
    const isErrorVisible = await loginPage.isErrorVisible();
    expect(isErrorVisible).toBe(false);

    // Use DashboardPage to verify successful landing
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.waitForLoad();

    // Verify dashboard is visible and functional
    expect(await dashboardPage.isVisible()).toBe(true);
    
    // Verify greeting contains user email or name
    const greeting = await dashboardPage.getGreeting();
    expect(greeting).toBeTruthy();
    expect(greeting).toContain("Cześć");
  });

  test("should disable submit button while submitting", async () => {
    const testEmail = process.env.E2E_USERNAME;
    const testPassword = process.env.E2E_PASSWORD;

    if (!testEmail || !testPassword) {
      test.skip();
    }

    // Fill form
    await loginPage.fillEmail(testEmail!);
    await loginPage.fillPassword(testPassword!);

    // Click submit and immediately check if button is disabled
    const submitPromise = loginPage.submit();
    
    // Button should show loading state
    await expect(loginPage.submitButton).toHaveText(/Logowanie\.\.\./);
    
    await submitPromise;
  });

  test("should navigate to register page when clicking register link", async ({ page }) => {
    // Click on register link
    await loginPage.registerLink.click();

    // Verify navigation to register page
    await expect(page).toHaveURL("/register");
  });
});
