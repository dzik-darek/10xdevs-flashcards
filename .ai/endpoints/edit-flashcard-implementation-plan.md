# API Endpoint Implementation Plan: Edytuj fiszkę

## 1. Przegląd punktu końcowego
Punkt końcowy `PATCH /api/flashcards/{id}` umożliwia użytkownikom aktualizację treści ("front" - pytanie i "back" - odpowiedź) istniejącej fiszki. Operacja ta jest ściśle ograniczona do treści merytorycznej i **nie może** modyfikować parametrów algorytmu FSRS (stability, difficulty, etc.) ani metadanych systemowych (np. `is_ai_generated`), z wyjątkiem daty modyfikacji (`updated_at`).

## 2. Szczegóły żądania
- **Metoda HTTP:** `PATCH`
- **Struktura URL:** `/api/flashcards/[id]` (gdzie `[id]` to UUID fiszki)
- **Parametry URL:**
  - `id` (Wymagane): Prawidłowy UUID v4 identyfikujący fiszkę.
- **Nagłówki:**
  - `Content-Type: application/json`
  - Ciasteczka sesyjne (obsługiwane przez Supabase Auth).
- **Request Body:**
  Obiekt JSON zgodny z `UpdateFlashcardDTO`. Przynajmniej jedno pole powinno być obecne.
  ```json
  {
    "front": "Zaktualizowane pytanie (opcjonalne)",
    "back": "Zaktualizowana odpowiedź (opcjonalne)"
  }
  ```

## 3. Wykorzystywane typy
- **`UpdateFlashcardDTO`** (`src/types.ts`): Definiuje dozwolone pola do aktualizacji (`front`, `back`).
- **`FlashcardDTO`** (`src/types.ts`): Pełna reprezentacja fiszki zwracana w odpowiedzi.
- **`VALIDATION_CONSTRAINTS`** (`src/types.ts`): Stałe limity znaków (front: 500, back: 1000).

## 3. Szczegóły odpowiedzi
- **Sukces (200 OK):**
  Zwraca zaktualizowany obiekt fiszki.
  ```json
  {
    "id": "uuid",
    "front": "...",
    "back": "...",
    "updated_at": "timestamp",
    ... // pozostałe pola FSRS bez zmian
  }
  ```
- **Błędy:**
  - `400 Bad Request`: Nieprawidłowe UUID, walidacja Zod nie powiodła się (np. za długi tekst).
  - `401 Unauthorized`: Brak aktywnej sesji użytkownika.
  - `404 Not Found`: Fiszka nie istnieje lub należy do innego użytkownika.
  - `500 Internal Server Error`: Błąd połączenia z bazą danych.

## 4. Przepływ danych
1.  **Odebranie żądania:** Astro Router przekazuje żądanie do `src/pages/api/flashcards/[id].ts`.
2.  **Middleware:** Weryfikacja sesji użytkownika i dostępności klienta Supabase w `context.locals`.
3.  **Walidacja:**
    *   Parsowanie `id` z URL (sprawdzenie formatu UUID).
    *   Parsowanie Body przy użyciu Zod (sprawdzenie typów i długości znaków).
4.  **Warstwa Serwisu:** Wywołanie metody `FlashcardService.updateFlashcard`.
5.  **Baza Danych:** Wykonanie zapytania UPDATE na tabeli `flashcards` z filtrowaniem po `id` oraz `user_id`.
6.  **Odpowiedź:** Zwrócenie zaktualizowanego rekordu jako JSON.

## 5. Względy bezpieczeństwa
- **Uwierzytelnianie:** Endpoint dostępny tylko dla zalogowanych użytkowników.
- **Autoryzacja (Ownership):** Zapytanie do bazy danych **musi** zawierać warunek `.eq('user_id', user.id)`. Dzięki temu użytkownik nie może edytować fiszek, których nie jest właścicielem (ochrona przed IDOR).
- **Sanityzacja:** Użycie Zod do walidacji danych wejściowych zapobiega wstrzyknięciu nieprawidłowych danych. Supabase Client chroni przed SQL Injection.

## 6. Obsługa błędów
- Błędy walidacji (Zod) -> `400` z detalami błędów (`details`).
- Próba edycji nieistniejącej/cudzej fiszki -> Serwis zwraca null/błąd, API mapuje to na `404`.
- Nieoczekiwane błędy DB -> `500` z ogólnym komunikatem `error`.

## 7. Rozważania dotyczące wydajności
- Operacja jest prostym UPDATE na kluczu głównym (`id`), więc jest bardzo szybka.
- Indeksy na `id` (Primary Key) oraz `user_id` (Foreign Key) zapewniają optymalny czas wyszukiwania.

## 8. Etapy wdrożenia

### Krok 1: Aktualizacja Serwisu (`src/lib/services/flashcard.service.ts`)
Dodać metodę `updateFlashcard` do klasy `FlashcardService`.
- **Podpis:** `async updateFlashcard(id: string, userId: string, data: UpdateFlashcardDTO): Promise<FlashcardDTO | null>`
- **Logika:** Wywołanie `supabase.from('flashcards').update(data).eq('id', id).eq('user_id', userId).select().single()`.
- **Obsługa:** Zwrócenie danych lub rzucenie błędu w przypadku niepowodzenia.

### Krok 2: Utworzenie Endpointu (`src/pages/api/flashcards/[id].ts`)
Utworzyć nowy plik obsługujący dynamiczny routing dla fiszek.
- **Eksport:** `export const PATCH: APIRoute = async ...`
- **Konfiguracja:** `export const prerender = false;`
- **Walidacja ID:** Sprawdzenie czy `params.id` jest poprawnym UUID.

### Krok 3: Implementacja Walidacji Danych (Zod)
Wewnątrz endpointu zdefiniować schemat walidacji przy użyciu `zod`.
- Wykorzystać `VALIDATION_CONSTRAINTS` z `src/types.ts`.
- Schemat powinien pozwalać na częściowe dane (`.partial()`), ale wymagać przynajmniej jednego pola (refine/non-empty check).

### Krok 4: Integracja i Obsługa Błędów
- Połączyć walidację z wywołaniem serwisu.
- Otoczyć logikę blokiem `try-catch`.
- Mapować błędy na odpowiednie `Response` JSON.
