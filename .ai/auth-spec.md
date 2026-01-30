# Specyfikacja Techniczna Modułu Autentykacji

Dokument definiuje architekturę rozwiązania dla funkcjonalności rejestracji, logowania i usuwania konta w aplikacji 10xdevs Flashcards, zgodnie z wymaganiami US-001, US-002 i US-003.

## 1. Architektura Interfejsu Użytkownika (Frontend)

Wymagane jest ścisłe rozdzielenie odpowiedzialności pomiędzy statycznymi stronami Astro (kontenery, routing) a interaktywnymi komponentami React (formularze, obsługa stanu).

### 1.1. Struktura Stron (Astro)

Należy utworzyć/zaktualizować następujące strony w katalogu `src/pages`:

| Ścieżka | Typ | Opis | Dostęp |
|---|---|---|---|
| `/login` | `src/pages/login.astro` | Strona logowania. Zawiera komponent `LoginForm`. Jeśli użytkownik jest zalogowany, middleware przekierowuje na `/dashboard`. | Publiczny (Guest) |
| `/register` | `src/pages/register.astro` | Strona rejestracji. Zawiera komponent `RegisterForm`. | Publiczny (Guest) |
| `/dashboard` | `src/pages/dashboard.astro` | Główny pulpit aplikacji. Wyświetla statystyki (US-010) i skróty akcji. | Prywatny (Auth) |
| `/settings` | `src/pages/settings.astro` | Strona ustawień konta. Zawiera sekcję "Danger Zone" z komponentem `DeleteAccount`. | Prywatny (Auth) |

### 1.2. Layouty

Należy wprowadzić dedykowany layout dla stron autentykacji, aby uniknąć wyświetlania nawigacji aplikacji (sidebar/header) na ekranach logowania.

*   **`src/layouts/AuthLayout.astro`**: Prosty layout centrujący zawartość na ekranie, bez pasków bocznych. Tło neutralne/szare.
*   **`src/layouts/Layout.astro`**: Istniejący layout aplikacji. Wymaga aktualizacji, aby sprawdzać stan sesji i warunkowo renderować elementy (np. ukrywać przyciski akcji dla niezalogowanych, choć middleware i tak zablokuje dostęp).

### 1.3. Komponenty React (`src/components/auth`)

Komponenty te będą odpowiadać za interakcję z użytkownikiem, walidację i komunikację z Supabase (Client-side).

1.  **`LoginForm.tsx`**
    *   Używa `react-hook-form` + `zod` do walidacji.
    *   Pola: Email, Hasło.
    *   Akcja: Wywołuje `supabase.auth.signInWithPassword`.
    *   Obsługa błędów: Wyświetla alert (`src/components/ui/alert.tsx`) w przypadku błędu (np. "Nieprawidłowe dane logowania").
    *   Sukces: Przekierowanie na `/dashboard` (lub stronę główną).

2.  **`RegisterForm.tsx`**
    *   Używa `react-hook-form` + `zod` do walidacji.
    *   Pola: Email, Hasło (min. 6 znaków - zgodnie z US-001).
    *   Akcja: Wywołuje `supabase.auth.signUp`.
    *   Obsługa błędów: Wyświetla komunikat, jeśli użytkownik o danym emailu już istnieje.
    *   Sukces: Automatyczne logowanie i przekierowanie (zachowanie domyślne Supabase przy braku konieczności potwierdzenia email, lub komunikat "Sprawdź skrzynkę" jeśli email confirmation włączone). *Założenie MVP: Email confirmation wyłączone dla uproszczenia, lub obsługa flow z potwierdzeniem.*

3.  **`DeleteAccount.tsx`**
    *   Komponent w `src/pages/settings`.
    *   Przycisk "Usuń konto" (czerwony, wariant `destructive`).
    *   Modal potwierdzenia (`AlertDialog` z shadcn/ui) - wymagane przez US-003.
    *   Akcja: Wywołanie endpointu API `DELETE /api/auth/user`.
    *   Sukces: Wylogowanie klienta i przekierowanie na stronę główną.

### 1.4. Walidacja i Komunikaty

Wykorzystanie biblioteki `zod` do definicji schematów:

```typescript
const authSchema = z.object({
  email: z.string().email("Nieprawidłowy format email"),
  password: z.string().min(6, "Hasło musi mieć minimum 6 znaków"),
});
```

Obsługa błędów musi być user-friendly. Błędy API Supabase należy mapować na komunikaty w języku polskim.

## 2. Logika Backendowa i API

Ze względu na wykorzystanie Astro w trybie SSR, autentykacja musi działać dwutorowo: po stronie klienta (dla interakcji) i po stronie serwera (dla ochrony tras).

### 2.1. Middleware (`src/middleware/index.ts`)

Kluczowy element bezpieczeństwa. Należy przebudować istniejący middleware.

*   **Zadania middleware:**
    1.  Tworzenie klienta Supabase SSR (`createServerClient` z `@supabase/ssr`).
    2.  Obsługa ciasteczek (odczyt/zapis tokenów sesji).
    3.  Odświeżanie tokena sesji (jeśli wygasł).
    4.  Weryfikacja dostępu do chronionych ścieżek (`/dashboard`, `/flashcards/*`, `/study`, `/ai/*`, `/settings`, `/api/*` - z wyłączeniem `/api/auth/*`).
    5.  Przekierowania:
        *   Brak sesji + chroniona trasa -> Redirect do `/login` (lub 401 Unauthorized dla API).
        *   Aktywna sesja + trasa auth (`/login`, `/register`) -> Redirect do `/dashboard`.

### 2.2. Endpointy API (`src/pages/api/`)

1.  **`src/pages/api/auth/signout.ts` (GET)**
    *   Endpoint serwerowy do czyszczenia ciasteczek sesji.
    *   Wywoływany przez frontend przy wylogowaniu (oprócz client-side `signOut`).

2.  **`src/pages/api/auth/user.ts` (DELETE)**
    *   Implementacja US-003 (Hard Delete).
    *   Wymaga aktywnej sesji użytkownika (weryfikacja w middleware/endpoint).
    *   Używa `supabaseAdmin` (klient z uprawnieniami `service_role` - wymaga zmiennej środowiskowej `SUPABASE_SERVICE_ROLE_KEY`), aby usunąć użytkownika z tabeli `auth.users`.
    *   Usunięcie z `auth.users` kaskadowo usunie dane z tabel `public` (profile, flashcards) dzięki kluczom obcym `ON DELETE CASCADE` (zdefiniowanym w migracji 20260124100100_create_profiles_table.sql).

## 3. System Autentykacji (Supabase + Astro)

### 3.1. Konfiguracja Klientów Supabase

Należy zmigrować z prostego `createClient` (`supabase-js`) na `@supabase/ssr` w celu poprawnej obsługi ciasteczek w środowisku Astro.

*   **Plik `src/lib/supabase/server.ts`**: Helper do tworzenia klienta w kontekście Astro (Middleware, API Routes).
*   **Plik `src/lib/supabase/client.ts`**: Helper do tworzenia klienta w przeglądarce (React Components).

### 3.2. Zarządzanie Sesją

*   Sesja oparta o `access_token` i `refresh_token` przechowywane w ciasteczkach `httpOnly` (zarządzane przez `@supabase/ssr`).
*   Middleware Astro jest "strażnikiem" - każda nawigacja wywołuje sprawdzenie/odświeżenie sesji.

### 3.3. Bezpieczeństwo

*   **RLS (Row Level Security)**: Wszystkie tabele (`flashcards`, `profiles`, `reviews`) muszą mieć włączone RLS. Polityki muszą zezwalać na operacje CRUD tylko dla `auth.uid() = user_id`.
*   **Service Role**: Klucz `service_role` może być używany TYLKO w endpointach API po stronie serwera (jak usuwanie konta) i nigdy nie może być eksponowany klientowi.

## 4. Plan Wdrożenia (Kolejność Prac)

1.  Instalacja `@supabase/ssr`.
2.  Konfiguracja helperów Supabase (Client/Server).
3.  Implementacja Middleware (Ochrona tras).
4.  Implementacja Layoutu Auth i Stron (Login/Register).
5.  Implementacja Komponentów Formularzy (React).
6.  Implementacja Endpointu Usuwania Konta i strony Ustawień.
