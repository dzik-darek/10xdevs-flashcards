import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should show login page for unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
  });

  test('should display login form with all fields', async ({ page }) => {
    await page.goto('/login');
    
    // Check form elements
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
    
    // Check link to registration
    await expect(page.getByRole('link', { name: /register/i })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    await page.getByRole('button', { name: /log in/i }).click();
    
    // Should show validation errors
    await expect(page.getByText(/email is required/i)).toBeVisible();
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/login');
    
    // Click registration link
    await page.getByRole('link', { name: /register/i }).click();
    
    // Should navigate to register page
    await expect(page).toHaveURL('/register');
    await expect(page.getByRole('heading', { name: /register/i })).toBeVisible();
  });
});

test.describe('Dashboard', () => {
  test('should display welcome message on homepage', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByRole('heading')).toBeVisible();
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');
    
    // Check for main navigation
    await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
  });
});
