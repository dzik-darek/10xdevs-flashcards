# Testing Guide

This project uses **Vitest** for unit and component tests, and **Playwright** for end-to-end (E2E) tests.

## Unit & Component Testing with Vitest

### Running Tests

```bash
# Run all tests once
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

Test files should be placed next to the code they test with the `.test.ts` or `.test.tsx` extension.

**Example structure:**
```
src/
  components/
    ui/
      button.tsx
      button.test.tsx  ← Test file
  lib/
    services/
      flashcard.service.ts
      flashcard.service.test.ts  ← Test file
```

### Example Component Test

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Mocking APIs

The project uses **MSW (Mock Service Worker)** for API mocking. Mock handlers are defined in `src/test/mocks/handlers.ts`.

```typescript
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';

// Add custom handler for a test
server.use(
  http.get('/api/custom', () => {
    return HttpResponse.json({ data: 'mock data' });
  })
);
```

### Available Testing Utilities

- **Vitest**: Test runner and assertion library
- **Testing Library**: Component testing utilities
- **MSW**: API request mocking
- **jsdom**: DOM environment for tests

## E2E Testing with Playwright

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI mode
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug
```

### Test Structure

E2E tests are located in the `e2e/` directory at the project root.

```
e2e/
  auth.spec.ts           ← Authentication tests
  flashcards.spec.ts     ← Flashcard feature tests
  page-objects/
    index.ts             ← Page Object Models
```

### Writing E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test('should navigate to login page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /login/i }).click();
  await expect(page).toHaveURL('/login');
});
```

### Page Object Model

The project uses the Page Object Model pattern for maintainable E2E tests. Page objects are defined in `e2e/page-objects/`.

```typescript
import { test, expect } from './page-objects';

test('login flow', async ({ loginPage, dashboardPage }) => {
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password');
  await dashboardPage.isLoaded();
});
```

### Browser Configuration

Tests run only on **Chromium/Desktop Chrome** as per project guidelines. The configuration is in `playwright.config.ts`.

### Debugging Tests

1. **UI Mode**: `npm run test:e2e:ui` - Visual test runner with time travel debugging
2. **Debug Mode**: `npm run test:e2e:debug` - Step through tests with Playwright Inspector
3. **Trace Viewer**: View traces after failed tests in the HTML report

### Screenshots & Videos

- Screenshots are captured automatically on test failures
- Traces are recorded on first retry
- Reports are generated in `playwright-report/`

## CI/CD Integration

Both test suites are designed to run in CI environments:

- Unit tests run quickly and should be part of every PR
- E2E tests run in headless mode on CI
- Coverage reports can be generated for unit tests

## Best Practices

### Unit Tests
- Test behavior, not implementation details
- Use descriptive test names
- Keep tests isolated and independent
- Mock external dependencies (APIs, databases)
- Follow the Arrange-Act-Assert pattern

### E2E Tests
- Use Page Object Model for reusability
- Test critical user journeys
- Avoid testing implementation details
- Use semantic locators (roles, labels)
- Keep tests independent and isolated
- Clean up test data after tests

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
