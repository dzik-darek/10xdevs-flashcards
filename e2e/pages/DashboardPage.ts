import type { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for Dashboard Page
 * Implements the Page Object pattern for maintainable tests
 */
export class DashboardPage {
  readonly page: Page;
  readonly container: Locator;
  readonly welcomeSection: Locator;
  readonly title: Locator;
  readonly greeting: Locator;
  readonly emptyState: Locator;
  readonly studyCard: Locator;
  readonly studyCount: Locator;
  readonly startStudyButton: Locator;
  readonly statsGrid: Locator;
  readonly totalCardsStat: Locator;
  readonly studyCardsStat: Locator;
  readonly totalCount: Locator;
  readonly studyCountStat: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.getByTestId("dashboard-container");
    this.welcomeSection = page.getByTestId("dashboard-welcome");
    this.title = page.getByTestId("dashboard-title");
    this.greeting = page.getByTestId("dashboard-greeting");
    this.emptyState = page.getByTestId("dashboard-empty-state");
    this.studyCard = page.getByTestId("dashboard-study-card");
    this.studyCount = page.getByTestId("dashboard-study-count");
    this.startStudyButton = page.getByTestId("dashboard-start-study-button");
    this.statsGrid = page.getByTestId("dashboard-stats-grid");
    this.totalCardsStat = page.getByTestId("dashboard-total-cards-stat");
    this.studyCardsStat = page.getByTestId("dashboard-study-cards-stat");
    this.totalCount = page.getByTestId("dashboard-total-count");
    this.studyCountStat = page.getByTestId("dashboard-study-count-stat");
  }

  /**
   * Navigate to dashboard page
   */
  async goto() {
    await this.page.goto("/dashboard");
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Wait for dashboard to be fully loaded
   */
  async waitForLoad() {
    await this.container.waitFor({ state: "visible", timeout: 10000 });
    await this.title.waitFor({ state: "visible" });
  }

  /**
   * Get the greeting text
   */
  async getGreeting(): Promise<string | null> {
    return await this.greeting.textContent();
  }

  /**
   * Check if dashboard is visible
   */
  async isVisible(): Promise<boolean> {
    try {
      return await this.container.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Check if empty state is shown
   */
  async isEmptyStateVisible(): Promise<boolean> {
    try {
      return await this.emptyState.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Check if study card is shown (user has cards to study)
   */
  async isStudyCardVisible(): Promise<boolean> {
    try {
      return await this.studyCard.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Get total flashcards count
   */
  async getTotalCount(): Promise<string | null> {
    return await this.totalCount.textContent();
  }

  /**
   * Get study count
   */
  async getStudyCount(): Promise<string | null> {
    return await this.studyCountStat.textContent();
  }

  /**
   * Check if stats grid is visible
   */
  async isStatsGridVisible(): Promise<boolean> {
    try {
      return await this.statsGrid.isVisible();
    } catch {
      return false;
    }
  }
}
