# API Endpoint Implementation Plan: Create Flashcard

## 1. Przegląd punktu końcowego
Punkt końcowy `POST /api/flashcards` umożliwia zalogowanym użytkownikom tworzenie nowych fiszek. Endpoint obsługuje zarówno fiszki wprowadzane ręcznie, jak i te generowane przez AI (poprzez flagę `is_ai_generated`). Logika biznesowa zostanie wyodrębniona do nowego serwisu `FlashcardService`.

## 2. Szczegóły żądania
- **Metoda HTTP**: `POST`
- **Struktura URL**: `/api/flashcards`
- **Nagłówki**:
  - `Content-Type: application/json`
  - `Cookie` (dla sesji Supabase)
- **Request Body** (JSON):
  ```json
  {
    "front": "Pytanie lub treść awersu",
    "back": "Odpowiedź lub treść rewersu",
    "is_ai_generated": false
  }
  ```
- **Walidacja danych wejściowych** (zgodnie z `VALIDATION_CONSTRAINTS`):
  - `front`: string, długość [1, 500]
  - `back`: string, długość [1, 1000]
  - `is_ai_generated`: boolean

## 3. Wykorzystywane typy
Plik: `src/types.ts`
- **Input**: `CreateFlashcardDTO`
- **Output**: `ApiSuccessResponse<FlashcardDTO>`
- **Error**: `ApiErrorResponse`
- **Kontekst**: `Database` (dla typowania klienta Supabase)

## 4. Szczegóły odpowiedzi

### Sukces (201 Created)
Zwraca pełny obiekt utworzonej fiszki, w tym wygenerowane ID oraz domyślne parametry FSRS.

```json
{
  "data": {
    "id": "uuid-v4",
    "user_id": "user-uuid",
    "front": "...",
    "back": "...",
    "is_ai_generated": false,
    "state": 0,
    "created_at": "2026-01-24T...",
    "due": "2026-01-24T...",
    ...
  }
}
```

### Błędy
- **400 Bad Request**: Nieprawidłowe dane wejściowe (błąd walidacji Zod).
- **401 Unauthorized**: Użytkownik nie jest zalogowany.
- **500 Internal Server Error**: Błąd zapisu do bazy danych.

## 5. Przepływ danych
1.  **Odbiór żądania**: Endpoint Astro w `src/pages/api/flashcards/index.ts`.
2.  **Autoryzacja**: Weryfikacja sesji użytkownika za pomocą klienta Supabase z `context.locals`.
3.  **Walidacja**: Sprawdzenie poprawności payloadu za pomocą biblioteki `zod` i stałych z `VALIDATION_CONSTRAINTS`.
4.  **Logika biznesowa**: Wywołanie metody `createFlashcard` w `FlashcardService`.
5.  **Baza danych**: Insert do tabeli `public.flashcards`. Kolumny FSRS (`state`, `stability` itd.) przyjmują wartości domyślne z definicji tabeli.
6.  **Odpowiedź**: Zwrócenie utworzonego obiektu do klienta.

## 6. Względy bezpieczeństwa
- **Authentication**: Endpoint dostępny tylko dla uwierzytelnionych użytkowników.
- **Data Integrity**: `user_id` jest pobierane bezpośrednio z bezpiecznej sesji po stronie serwera (JWT), a nie z body żądania. Zapobiega to tworzeniu fiszek w imieniu innych użytkowników.
- **Input Sanitization**: Walidacja długości pól zapobiega atakom typu DoS (zapychanie bazy gigantycznymi tekstami). Supabase Client chroni przed SQL Injection.

## 7. Obsługa błędów
- Błędy walidacji Zod będą mapowane na kod 400 z czytelnym komunikatem w polu `details`.
- Błędy autoryzacji zwracają 401.
- Nieoczekiwane błędy bazy danych są logowane (`console.error`) i zwracają generyczny błąd 500 do klienta, aby nie wyciekać szczegółów implementacji.

## 8. Rozważania dotyczące wydajności
- Operacja jest prostym `INSERT`, więc powinna być bardzo szybka (<100ms).
- Brak złożonych transakcji czy złączeń (JOIN) w tym kroku.
- `FlashcardService` powinien być bezstanowy.

## 9. Etapy wdrożenia

### Krok 1: Utworzenie serwisu FlashcardService
Utwórz plik `src/lib/services/flashcard.service.ts`. Zaimplementuj klasę/moduł zawierający metodę `createFlashcard`.
- Metoda powinna przyjmować `SupabaseClient`, `userId` oraz `CreateFlashcardDTO`.
- Powinna zwracać `Promise<FlashcardDTO>`.

### Krok 2: Implementacja Endpointu
Utwórz plik `src/pages/api/flashcards/index.ts`.
- Skonfiguruj `prerender = false`.
- Zaimplementuj handler `POST`.
- Pobierz klienta Supabase z `context.locals`.
- Sprawdź użytkownika (`auth.getUser()`).
- Zwaliduj body używając `zod`.
- Wywołaj serwis.
- Zwróć odpowiedź `Response`.
