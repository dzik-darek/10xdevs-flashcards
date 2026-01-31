# API Endpoint Implementation Plan: Batch Create Flashcards

## 1. Przegląd punktu końcowego
Punkt końcowy `POST /api/flashcards/batch` umożliwia masowe tworzenie fiszek w jednej operacji. Jest to kluczowa funkcjonalność wspierająca zapisywanie fiszek wygenerowanych przez AI oraz potencjalne funkcje importu. Pozwala na utworzenie od 1 do 100 fiszek w jednym żądaniu, zwracając identyfikatory nowo utworzonych zasobów.

## 2. Szczegóły żądania
- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/flashcards/batch`
- **Nagłówki:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>` (obsługiwane przez cookie/middleware)
- **Request Body:**
  ```json
  {
    "cards": [
      {
        "front": "Pytanie",
        "back": "Odpowiedź",
        "is_ai_generated": true
      }
    ]
  }
  ```

## 3. Wykorzystywane typy
Plik `src/types.ts` zawiera już niezbędne definicje:
- **Input DTO:** `BatchCreateFlashcardsDTO` (zawiera tablicę `CreateFlashcardDTO`)
- **Output DTO:** `BatchCreateFlashcardsResponseDTO`
- **Errors:** `ApiErrorResponse`

## 4. Szczegóły odpowiedzi

### Sukces (201 Created)
Zwraca tablicę identyfikatorów utworzonych fiszek w kolejności odpowiadającej tablicy wejściowej.
```json
{
  "ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

### Błędy
- **400 Bad Request:** Błąd walidacji danych (np. pusta tablica, przekroczony limit 100 elementów, zbyt długi tekst).
- **401 Unauthorized:** Brak sesji użytkownika.
- **500 Internal Server Error:** Błąd zapisu do bazy danych.

## 5. Przepływ danych
1. **Klient:** Wysyła żądanie POST z tablicą fiszek.
2. **Astro Page (API Route):**
   - Weryfikuje sesję użytkownika (`context.locals`).
   - Parsuje i waliduje body żądania używając `zod`.
3. **FlashcardService:**
   - Przyjmuje `user_id` oraz tablicę fiszek.
   - Mapuje dane, dodając `user_id` do każdego obiektu.
   - Wywołuje klienta Supabase.
4. **Supabase:**
   - Wykonuje pojedynczy `insert` (bulk insert).
   - Baza danych automatycznie nadaje wartości domyślne dla pól FSRS (`stability`, `difficulty`, etc.) oraz `due` i `state`.
   - Zwraca utworzone rekordy (tylko kolumnę `id`).
5. **Astro Page:** Zwraca sformatowaną odpowiedź JSON.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie:** Endpoint dostępny tylko dla zalogowanych użytkowników. `user_id` jest pobierane z bezpiecznej sesji po stronie serwera (nie z body żądania).
- **Limitowanie:** Twardy limit 100 fiszek na jedno żądanie zapobiega przeciążeniu bazy danych i timeoutom.
- **Walidacja:** Rygorystyczne sprawdzanie długości pól `front` (500 znaków) i `back` (1000 znaków) zapobiega wstrzykiwaniu nadmiarowych danych.

## 7. Obsługa błędów
- **Zod Validation Errors:** Zwracane jako 400 z detalicznym opisem, które pole nie spełnia wymagań.
- **Database Errors:** Przechwytywane w serwisie, logowane na konsoli serwera, a do klienta zwracany jest generyczny błąd 500 lub specyficzny komunikat, jeśli to bezpieczne.

## 8. Rozważania dotyczące wydajności
- **Bulk Insert:** Kluczowe jest użycie pojedynczego zapytania SQL (`supabase.from('flashcards').insert([...])`) zamiast pętli insertów. Zredukuje to narzut sieciowy i obciążenie bazy.
- **Select:** W zapytaniu insert należy poprosić tylko o zwrot kolumny `id` (`.select('id')`), aby zminimalizować przesył danych.

## 9. Etapy wdrożenia

### Krok 1: Aktualizacja `FlashcardService`
Plik: `src/lib/services/flashcard.service.ts`
- Dodać metodę `createBatch(userId: string, cards: CreateFlashcardDTO[])`.
- Metoda musi przygotować tablicę obiektów zawierających `user_id` oraz dane fiszki.
- Wykonać operację na bazie danych i obsłużyć błędy.

### Krok 2: Definicja schematu walidacji Zod
Plik: `src/pages/api/flashcards/batch.ts` (lub dedykowany plik z walidatorami, jeśli taki powstanie)
- Zdefiniować schemat dla pojedynczej fiszki (min/max length).
- Zdefiniować schemat dla body (tablica `cards`, min 1, max 100 elementów).

### Krok 3: Implementacja Endpointu
Plik: `src/pages/api/flashcards/batch.ts`
- Utworzyć handler `POST`.
- Ustawić `prerender = false`.
- Zaimplementować pobieranie użytkownika z kontekstu.
- Użyć `FlashcardService`.
- Zwrócić odpowiedź 201 lub błędy.
