# Plan Testów - 10xdevs-flashcards

## 1. Wprowadzenie i cele

Celem niniejszego dokumentu jest zdefiniowanie strategii zapewnienia jakości (QA) dla projektu **10xdevs-flashcards**. Projekt jest platformą edukacyjną opartą na fiszkach, wykorzystującą AI do generowania treści oraz algorytm spaced repetition do optymalizacji nauki.

Głównym celem testów jest zapewnienie niezawodności kluczowych funkcji (generowanie AI, sesje nauki), bezpieczeństwa danych użytkowników oraz płynności interfejsu (UX) w ekosystemie Astro/React.

## 2. Zakres testów

### W zakresie (In-Scope):
- **Logika Biznesowa**: Algorytmy powtórek, walidacja danych, przetwarzanie odpowiedzi AI.
- **Interfejs Użytkownika (UI)**: Komponenty React (Shadcn/ui), responsywność (Tailwind), formularze.
- **Integracje**: Komunikacja z Supabase (Auth, DB), OpenRouter API (AI).
- **API**: Endpointy Astro (`src/pages/api/`).
- **Bezpieczeństwo**: Autoryzacja dostępu do zasobów (RLS), walidacja danych wejściowych.

### Poza zakresem (Out-of-Scope):
- Testy obciążeniowe infrastruktury OpenRouter (zewnętrzne API).
- Testy penetracyjne samej platformy Supabase (polegamy na ich zabezpieczeniach).

## 3. Typy testów

Ze względu na stos technologiczny (Astro + React), zalecana jest piramida testów:

1.  **Testy Jednostkowe (Unit Tests)**:
    *   Testowanie usług (`src/lib/services/`), szczególnie `ai.service.ts` (mockowanie API).
    *   Testowanie hooków (`useStudySession`, `useGeneratorState`).
    *   Testowanie funkcji pomocniczych (utils).
2.  **Testy Komponentów (Component Tests)**:
    *   Renderowanie i interakcje komponentów React (Shadcn/ui).
    *   Testowanie formularzy i walidacji (React Hook Form + Zod).
3.  **Testy Integracyjne (Integration Tests)**:
    *   Testowanie endpointów API (`src/pages/api/`) z mockowaną bazą danych.
    *   Sprawdzenie przepływu danych między klientem a API.
4.  **Testy End-to-End (E2E)**:
    *   Kluczowe ścieżki użytkownika (rejestracja -> generowanie -> nauka) na rzeczywistej przeglądarce.

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### A. Moduł AI (Priorytet: Wysoki)
*Komponenty: `AIGeneratorWizard`, `ai.service.ts`*

| ID | Scenariusz | Oczekiwany rezultat |
|----|------------|---------------------|
| AI-01 | Generowanie fiszek z poprawnego tekstu | Otrzymanie listy fiszek w formacie JSON, przejście do edycji. |
| AI-02 | Obsługa błędu API OpenRouter (timeout/500) | Wyświetlenie komunikatu błędu, możliwość ponowienia. |
| AI-03 | Walidacja zbyt krótkiego/długiego tekstu | Blokada wysłania żądania, komunikat walidacji. |
| AI-04 | Malformed JSON response od AI | System parsuje odpowiedź lub odrzuca ją z czytelnym błędem (nie crashuje). |

### B. Moduł Nauki (Priorytet: Wysoki)
*Komponenty: `StudySessionContainer`, `ts-fsrs`*

| ID | Scenariusz | Oczekiwany rezultat |
|----|------------|---------------------|
| ST-01 | Ocena fiszki (Easy/Good/Hard/Again) | Aktualizacja terminu następnej powtórki w bazie. |
| ST-02 | Zakończenie sesji | Wyświetlenie podsumowania sesji (`SessionSummary`). |
| ST-03 | Brak fiszek do nauki | Wyświetlenie komunikatu o braku kart na dziś. |

### C. Uwierzytelnianie i Użytkownicy
*Komponenty: `AuthLayout`, Supabase Auth*

| ID | Scenariusz | Oczekiwany rezultat |
|----|------------|---------------------|
| AU-01 | Rejestracja nowego użytkownika | Utworzenie konta w Auth i rekordu w tabeli `profiles`. |
| AU-02 | Dostęp do dashboardu bez logowania | Przekierowanie do `/login`. |
| AU-03 | Usunięcie konta | Usunięcie danych z Auth i kaskadowe usunięcie danych z DB. |

## 5. Środowisko testowe i Narzędzia

Z analizy `package.json` wynika brak skonfigurowanych narzędzi testowych. Rekomendowana konfiguracja:

### Narzędzia do wdrożenia:
*   **Vitest**: Główny runner testów (kompatybilny z Vite/Astro).
    *   `npm install -D vitest @vitest/ui jsdom @testing-library/react`
*   **Playwright**: Do testów E2E.
    *   `npm init playwright@latest`
*   **MSW (Mock Service Worker)**: Do mockowania odpowiedzi API (OpenRouter, Supabase) w testach jednostkowych.

### Środowiska:
*   **Local**: Deweloperskie, lokalna instancja Supabase.
*   **CI (Github Actions)**: Automatyczne uruchamianie testów przy Pull Request.

## 6. Harmonogram testów

1.  **Faza 0: Setup (1-2 dni)**
    *   Instalacja Vitest i Playwright.
    *   Konfiguracja pipeline'u CI.
2.  **Faza 1: Unit & Logic (Równolegle z developmentem)**
    *   Pokrycie `ai.service.ts` i logiki `ts-fsrs` testami (krytyczne dla jakości nauki).
3.  **Faza 2: Integration & API**
    *   Testy endpointów API flashcards.
4.  **Faza 3: E2E (Przed wydaniem MVP)**
    *   Scenariusze "Happy Path" dla całego procesu użytkownika.

## 7. Kryteria akceptacji

*   Wszystkie testy w pipeline CI muszą przechodzić (zielone).
*   Brak błędów krytycznych (Blocker/Critical) w testach manualnych E2E.

## 8. Procedury raportowania błędów

Błędy zgłaszane w systemie (np. GitHub Issues) powinny zawierać:
1.  **Tytuł**: Zwięzły opis problemu.
2.  **Środowisko**: Wersja przeglądarki, OS.
3.  **Kroki do reprodukcji**: Dokładna ścieżka.
4.  **Oczekiwany vs Rzeczywisty rezultat**.
5.  **Logi/Screenshoty**: Z konsoli deweloperskiej lub logi serwera.
6.  **Priorytet**: P1 (Krytyczny), P2 (Wysoki), P3 (Średni), P4 (Niski).
