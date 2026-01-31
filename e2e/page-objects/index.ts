import { test as base, expect } from '@playwright/test';

/**
 * Example Page Object Model for Login Page
 * Demonstrates best practices for E2E testing with Playwright
 */
export class LoginPage {
  constructor(private page: any) {}

  // Locators
  get emailInput() {
    return this.page.getByLabel(/email/i);
  }

  get passwordInput() {
    return this.page.getByLabel(/password/i);
  }

  get loginButton() {
    return this.page.getByRole('button', { name: /log in/i });
  }

  get registerLink() {
    return this.page.getByRole('link', { name: /register/i });
  }

  // Actions
  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async goToRegister() {
    await this.registerLink.click();
  }
}

/**
 * Example Page Object Model for Dashboard
 */
export class DashboardPage {
  constructor(private page: any) {}

  async goto() {
    await this.page.goto('/dashboard');
  }

  async isLoaded() {
    await expect(this.page.getByRole('heading')).toBeVisible();
  }

  get studyLink() {
    return this.page.getByRole('link', { name: /study/i });
  }

  get flashcardsLink() {
    return this.page.getByRole('link', { name: /flashcards/i });
  }

  get aiGeneratorLink() {
    return this.page.getByRole('link', { name: /generate/i });
  }
}

/**
 * Extend Playwright test with Page Objects
 */
export const test = base.extend<{
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
}>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { expect };
