# Plan implementacji widoku Dashboard i Nawigacji (Sidebar)

## 1. Przegląd
Niniejszy plan obejmuje modernizację widoku Dashboardu oraz wdrożenie globalnej nawigacji (Sidebar) zgodnie z architekturą UI. Celem jest stworzenie spójnego `AppLayout`, który będzie wykorzystywany przez wszystkie widoki prywatne aplikacji. Dashboard stanie się głównym centrum informacyjnym, a nawigacja pomiędzy modułami (Fiszki, AI, Ustawienia) zostanie przeniesiona do paska bocznego.

## 2. Routing i Struktura Widoków
Zmiany dotyczą wszystkich widoków prywatnych, które muszą zostać zaktualizowane, aby korzystać z nowego Layoutu:

*   `/dashboard` (`src/pages/dashboard.astro`)
*   `/flashcards` (`src/pages/flashcards/index.astro`)
*   `/flashcards/new` (`src/pages/flashcards/new.astro`)
*   `/ai/generate` (`src/pages/ai/generate.astro`)
*   `/study` (`src/pages/study.astro`)
*   `/settings` (`src/pages/settings.astro`)

## 3. Struktura Komponentów (Layout i Sidebar)

### `Layout.astro` (AppShell)
Główny layout aplikacji zostanie zaktualizowany, aby obsługiwać strukturę: Sidebar (lewa strona) + Main Content (prawa strona).

*   **Zarządzanie stanem:** Layout będzie pobierał podstawowe dane użytkownika (z `locals`) oraz statystyki (liczba fiszek do powtórki) w celu wyświetlenia badge'a w nawigacji.
*   **Responsywność:** Obsługa zwijania Sidebaru na mniejszych ekranach (zgodnie z `shadcn/ui` Sidebar).

### `AppSidebar.astro` (Nowy komponent)
Komponent nawigacyjny renderowany po stronie serwera (Astro).

*   **Linki:**
    *   Dashboard (Home)
    *   Moje Fiszki (List)
    *   Generator AI (Sparkles)
    *   Dodaj ręcznie (Plus)
    *   Ustawienia (Settings)
*   **Aktywny stan:** Podświetlenie linku na podstawie `Astro.url.pathname`.
*   **Badge:** Wyświetlanie licznika "Due" przy linku "Dashboard" lub "Moje Fiszki".
*   **Stopka:** Przycisk wylogowania (`LogoutButton`).

## 4. Szczegóły Komponentów Widoku Dashboard

### `Dashboard.astro`
Odchudzona wersja dashboardu, skupiona na statusie nauki.

*   **Sekcja Powitalna:** "Cześć, [Email]!".
*   **Hero Section (StudyActionSection):**
    *   Dynamiczny komponent wzywający do działania (Start Study / Zero Inbox / Empty State).
*   **StatsGrid:**
    *   Kafelki ze statystykami (Do powtórki, Wszystkie).
*   **QuickActions:**
    *   Skróty do najczęstszych akcji (Dodaj, Generuj), ale bez duplikowania pełnej nawigacji Sidebaru.
*   **Usunięte elementy:** Karta "Zarządzanie fiszkami" (funkcja przeniesiona do Sidebaru).

## 5. Nowe Operacje i Endpointy API
Aby obsłużyć wydajne wyświetlanie liczników w Sidebarze i Dashboardzie bez pobierania całej listy fiszek, wymagane są nowe operacje.

### 5.1. Aktualizacja Serwisu (`src/lib/services/flashcard.service.ts`)
Dodanie metody `getFlashcardStats`:
*   **Cel:** Pobranie tylko liczby fiszek (total i due) bez pobierania ich treści.
*   **Metoda:** `getStats(supabase, userId)`
*   **Implementacja:** Dwa równoległe zapytania `count` z `head: true` (lub odpowiednik Supabase `count: 'exact'` z `limit(0)`).
    *   Query 1: Wszystkie fiszki użytkownika.
    *   Query 2: Fiszki z `due <= NOW()`.

### 5.2. Nowy Endpoint API (`src/pages/api/user/stats.ts`)
Endpoint GET dla klienta (np. do odświeżania licznika po zakończeniu sesji nauki bez przeładowania strony).
*   **Ścieżka:** `/api/user/stats`
*   **Metoda:** `GET`
*   **Odpowiedź:**
    ```json
    {
      "totalCount": 120,
      "studyCount": 15
    }
    ```
*   **Wykorzystanie:** Sidebar (w przyszłości, jeśli przejdzie na React) lub komponenty klienckie Dashboardu.

## 6. Typy

```typescript
// ViewModel dla statystyk
interface UserStatsDTO {
  totalCount: number;
  studyCount: number;
}
```

## 7. Kroki Implementacji

### Faza 1: Backend i Serwisy
1.  **Rozszerzenie `FlashcardService`:** Implementacja metody `getStats` w `src/lib/services/flashcard.service.ts`.
2.  **Utworzenie Endpointu:** Dodanie pliku `src/pages/api/user/stats.ts` wykorzystującego nową metodę serwisu.

### Faza 2: Komponenty Layoutu
3.  **Stworzenie `AppSidebar.astro`:** Implementacja paska bocznego z linkami i logiką aktywnej ścieżki. Wykorzystanie komponentów `shadcn/ui` (jeśli dostępne) lub `lucide-react` do ikon.
4.  **Aktualizacja `Layout.astro`:**
    *   Zmiana struktury HTML na Grid/Flex (Sidebar + Content).
    *   Pobranie statystyk (`getStats`) w frontmatterze Layoutu.
    *   Przekazanie statystyk do Sidebaru (np. do Badge'a).

### Faza 3: Modernizacja Dashboardu
5.  **Refaktoryzacja `src/pages/dashboard.astro`:**
    *   Usunięcie zbędnych kart nawigacyjnych.
    *   Wykorzystanie `getStats` zamiast `getFlashcards` (optymalizacja).
    *   Implementacja logiki warunkowej dla sekcji Hero (Start Study / Zero Inbox).

### Faza 4: Aktualizacja Pozostałych Widoków
6.  **Migracja Widoków:** Przejście przez wszystkie pliki w `src/pages/` (flashcards/*, ai/*, settings, study) i upewnienie się, że poprawnie renderują się w nowym `Layout`.
    *   *Uwaga:* Widok `/study` może wymagać ukrycia Sidebaru lub specjalnego trybu "Focus Mode" (do rozważenia, w MVP może zostać z Sidebarem).

## 8. Zarządzanie Stanem i Walidacja
*   **Layout:** Jest odpowiedzialny za sprawdzenie sesji (choć middleware robi to wcześniej) i dostarczenie kontekstu użytkownika do Sidebaru.
*   **Sidebar:** Musi obsługiwać stan "loading" jeśli dane statystyk nie są jeszcze dostępne (choć w SSR będą dostępne natychmiast).

## 9. Obsługa Błędów
*   Jeśli `getStats` zawiedzie w Layoutcie, Sidebar powinien wyrenderować się bez badge'y licznikowych, a Dashboard powinien pokazać stan pusty lub błąd, zamiast blokować całą stronę.
