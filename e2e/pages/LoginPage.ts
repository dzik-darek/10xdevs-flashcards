import type { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for Login Page
 * Implements the Page Object pattern for maintainable tests
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly registerLink: Locator;
  readonly loginForm: Locator;
  readonly loginFormCard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId("login-email-input");
    this.passwordInput = page.getByTestId("login-password-input");
    this.submitButton = page.getByTestId("login-submit-button");
    this.errorAlert = page.getByTestId("login-error-alert");
    this.registerLink = page.getByTestId("register-link");
    this.loginForm = page.getByTestId("login-form");
    this.loginFormCard = page.getByTestId("login-form-card");
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto("/login");
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Fill email input field
   * @param email - Email address to fill
   */
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  /**
   * Fill password input field
   * @param password - Password to fill
   */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  /**
   * Submit the login form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Complete login flow with credentials
   * @param email - Email address
   * @param password - Password
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  /**
   * Get error message text from alert
   * @returns Error message text or null if not visible
   */
  async getErrorMessage(): Promise<string | null> {
    try {
      const isVisible = await this.errorAlert.isVisible();
      if (!isVisible) {
        return null;
      }
      return await this.errorAlert.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Wait for successful login redirect to dashboard
   */
  async waitForSuccessfulLogin() {
    await this.page.waitForURL("/dashboard", { timeout: 10000 });
  }

  /**
   * Check if error alert is visible
   */
  async isErrorVisible(): Promise<boolean> {
    try {
      return await this.errorAlert.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitButtonDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled();
  }

  /**
   * Get submit button text
   */
  async getSubmitButtonText(): Promise<string | null> {
    return await this.submitButton.textContent();
  }
}
