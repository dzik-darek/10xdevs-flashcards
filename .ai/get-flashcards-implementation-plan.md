# API Endpoint Implementation Plan: Get Flashcards

## 1. Przegląd punktu końcowego
Punkt końcowy `GET /api/flashcards` umożliwia pobranie listy fiszek zalogowanego użytkownika. Obsługuje on dwa główne przypadki użycia: widok listy wszystkich fiszek (zarządzanie) oraz widok nauki (tylko fiszki wymagające powtórki). Endpoint wspiera również proste wyszukiwanie tekstowe.

## 2. Szczegóły żądania
- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/flashcards`
- **Parametry zapytania (Query Params)**:
  - **Opcjonalne**:
    - `q` (string): Fraza wyszukiwania. Jeśli podana, API wyszukuje dopasowania w polach `front` i `back`.
    - `mode` (string): Tryb pobierania danych.
      - `all` (domyślnie): Pobiera wszystkie fiszki użytkownika.
      - `study`: Pobiera tylko fiszki, których termin powtórki minął (`due <= NOW()`).

## 3. Wykorzystywane typy
Plik `src/types.ts` zawiera wszystkie niezbędne definicje:
- **Input**: `GetFlashcardsQueryDTO`
  - `q?: string`
  - `mode?: FlashcardQueryMode`
- **Output**: `GetFlashcardsResponseDTO`
  - `data: FlashcardDTO[]`
  - `count: number`
- **Modele**:
  - `FlashcardDTO`
  - `FlashcardQueryMode` ("all" | "study")

## 4. Szczegóły odpowiedzi
Odpowiedź jest zwracana w formacie JSON.

**Sukces (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "front": "Pytanie...",
      "back": "Odpowiedź...",
      "state": 0,
      "due": "2026-01-24T12:00:00Z",
      "is_ai_generated": false,
      // ...pozostałe pola FlashcardDTO
    }
  ],
  "count": 42
}
```

**Błąd (401 Unauthorized):**
```json
{
  "error": "Unauthorized access"
}
```

## 5. Przepływ danych

1.  **Request**: Klient wysyła żądanie GET z opcjonalnymi parametrami `q` i `mode`.
2.  **Middleware (Auth)**: Astro Middleware weryfikuje sesję użytkownika i udostępnia klienta Supabase oraz `user` w `context.locals`.
3.  **Handler**: `src/pages/api/flashcards/index.ts`:
    *   Sprawdza obecność użytkownika.
    *   Parsuje i waliduje parametry URL przy użyciu Zod.
    *   Przekazuje sterowanie do `FlashcardService`.
4.  **Service**: `FlashcardService.getFlashcards`:
    *   Buduje zapytanie do tabeli `flashcards`.
    *   Aplikuje filtr `user_id`.
    *   Aplikuje filtr `mode` (jeśli `study`, dodaje warunek czasu).
    *   Aplikuje filtr wyszukiwania (jeśli podano `q`).
    *   Wykonuje zapytanie do Supabase.
5.  **Response**: Handler zwraca sformatowane dane DTO lub błąd.

## 6. Względy bezpieczeństwa
-   **Uwierzytelnianie**: Endpoint dostępny tylko dla zalogowanych użytkowników. Weryfikacja następuje poprzez sprawdzenie `context.locals.user`.
-   **Autoryzacja (RLS)**: Zapytania do bazy danych muszą *zawsze* uwzględniać kontekst użytkownika. Chociaż Row Level Security (RLS) w bazie danych powinno to wymuszać, warstwa serwisu powinna również jawnie filtrować po `user_id` dla pewności i wydajności.
-   **Sanityzacja**: Użycie Zod do walidacji parametrów wejściowych zapobiega przekazywaniu nieprawidłowych typów danych.
-   **Ochrona danych**: Klient Supabase jest inicjalizowany po stronie serwera z tokenem sesji użytkownika (via Middleware), co zapewnia zachowanie uprawnień.

## 7. Obsługa błędów
| Scenariusz | Kod HTTP | Komunikat błędu |
| :--- | :--- | :--- |
| Brak sesji / Token wygasł | 401 | `Unauthorized` |
| Błąd walidacji parametrów (Zod) | 400 | `Invalid query parameters` |
| Błąd bazy danych (Supabase) | 500 | `Internal Server Error` |

Błędy 500 powinny być logowane po stronie serwera (console.error) przed zwróceniem odpowiedzi do klienta.

## 8. Rozważania dotyczące wydajności
-   **Indeksy**:
    -   Baza powinna posiadać indeks na kolumnie `user_id` (klucz obcy).
    -   Dla trybu `study` przydatny jest indeks złożony `(user_id, due)`.
    -   Dla wyszukiwania `q` zalecany jest indeks GIN/GIST dla operacji tekstowych, choć przy małej skali `ilike` będzie wystarczające.
-   **Limit danych**: Mimo że specyfikacja mówi o "pobieraniu wszystkich", w przyszłości warto rozważyć paginację, jeśli liczba fiszek użytkownika przekroczy 1000. Obecnie zakładamy brak sztywnego limitu (lub limit techniczny Supabase, domyślnie 1000 wierszy, chyba że użyjemy paginacji w zapytaniu). *Uwaga: Dla MVP trzymamy się specyfikacji bez jawnej paginacji.*

## 9. Etapy wdrożenia

### Krok 1: Aktualizacja Serwisu (`src/lib/services/flashcard.service.ts`)
Dodać metodę `getFlashcards` do klasy `FlashcardService`.
-   Metoda przyjmuje `userId` (string) i `query` (`GetFlashcardsQueryDTO`).
-   Zwraca `Promise<{ data: FlashcardDTO[], count: number }>`.
-   Implementacja wykorzystuje `supabase.from('flashcards').select('*', { count: 'exact' })`.
-   Obsługa logiki filtrowania `mode='study'` -> `.lte('due', new Date().toISOString())`.
-   Obsługa wyszukiwania `q` -> `.or(...)` z `ilike`.
-   Sortowanie wyników:
    -   `study`: `order('due', { ascending: true })`
    -   `all`: `order('created_at', { ascending: false })`

### Krok 2: Implementacja Endpointu (`src/pages/api/flashcards/index.ts`)
Stworzyć/Zaktualizować plik endpointu.
-   Ustawić `export const prerender = false`.
-   Zaimplementować handler `GET`.
-   Pobrać `supabase` i `user` z `context.locals`.
-   Jeśli brak użytkownika -> return 401.
-   Zdefiniować schemat Zod dla Query Params:
    ```typescript
    const querySchema = z.object({
      q: z.string().optional(),
      mode: z.enum(['all', 'study']).optional().default('all'),
    });
    ```
-   Parsować URLSearchParams: `Object.fromEntries(url.searchParams)`.
-   Wywołać `FlashcardService.getFlashcards`.
-   Zwrócić odpowiedź JSON 200.
-   Obsłużyć błędy w bloku `try/catch`.
