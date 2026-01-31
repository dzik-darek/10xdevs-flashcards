/**
 * Global type declarations for Playwright E2E tests
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      E2E_USERNAME?: string;
      E2E_PASSWORD?: string;
      E2E_BASE_URL?: string;
      CI?: string;
    }
  }
}

export {};
