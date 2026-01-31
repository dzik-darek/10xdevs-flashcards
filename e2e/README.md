# E2E Tests Structure

This directory contains end-to-end tests using Playwright.

## Directory Structure

```
e2e/
├── auth/                    # Authentication-related tests
│   ├── login.spec.ts       # Login flow tests (US-002)
│   └── authenticated.spec.ts # Tests for authenticated users
├── pages/                   # Page Object Models (POM)
│   ├── LoginPage.ts        # Login page POM
│   └── DashboardPage.ts    # Dashboard page POM
├── fixtures/                # Test fixtures
│   └── auth.fixture.ts     # Authentication fixtures
├── helpers/                 # Test helper functions
│   └── test-helpers.ts     # Common test utilities
└── global.d.ts             # Global type declarations
```

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/auth/login.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run specific test by name
npx playwright test -g "should successfully login"
```

**Note**: Playwright will automatically start the dev server before running tests. If you need to run the server manually:
```bash
npm run dev:e2e  # in one terminal
npm run test:e2e # in another terminal
```

## Environment Variables

E2E tests require environment variables defined in `.env.test`:

- `E2E_USERNAME` - Test user email
- `E2E_PASSWORD` - Test user password

## Page Object Model (POM)

We use the Page Object Model pattern to:
- Encapsulate page interactions
- Make tests more maintainable
- Reduce code duplication
- Improve readability

Example:
```typescript
const loginPage = new LoginPage(page);
await loginPage.goto();
await loginPage.login(email, password);
await loginPage.waitForSuccessfulLogin();
```

## Fixtures

Authentication fixtures provide pre-configured test contexts:

```typescript
import { test } from "../fixtures/auth.fixture";

// Test with authenticated user
test("should access dashboard", async ({ authenticatedPage }) => {
  await authenticatedPage.goto("/dashboard");
  // User is already logged in
});
```

## Test Selectors

We use `data-testid` attributes for stable element selection:

```typescript
// In component
<Button data-testid="login-submit-button">Login</Button>

// In test
await page.getByTestId("login-submit-button").click();
```

## Best Practices

1. **Use Page Objects** - Always interact with pages through POM classes
2. **Stable Selectors** - Use `data-testid` over CSS selectors
3. **Wait for State** - Use `waitFor` methods instead of fixed timeouts
4. **Isolate Tests** - Each test should be independent
5. **Clean Up** - Use fixtures for setup/teardown
6. **Meaningful Names** - Test names should describe behavior clearly
