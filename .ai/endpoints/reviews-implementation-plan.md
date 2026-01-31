# API Endpoint Implementation Plan: Rejestracja Powtórki (Review)

## 1. Przegląd punktu końcowego
Punkt końcowy `POST /api/reviews` jest sercem systemu powtórek. Odpowiada za przetworzenie oceny użytkownika dotyczącej znajomości danej fiszki, przeliczenie parametrów algorytmu FSRS (Free Spaced Repetition Scheduler), zaktualizowanie stanu fiszki w bazie danych oraz zapisanie historii tej operacji w logach.

## 2. Szczegóły żądania
- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/reviews`
- **Nagłówki:**
  - `Content-Type`: `application/json`
  - `Cookie`: (wymagane dla sesji Supabase)
- **Request Body:** JSON zgodny z interfejsem `CreateReviewDTO`.

```json
{
  "card_id": "123e4567-e89b-12d3-a456-426614174000",
  "rating": 3,
  "review_duration_ms": 1500
}
```

## 3. Wykorzystywane typy
- **DTO (Data Transfer Objects):**
  - `CreateReviewDTO` (`src/types.ts`) - dane wejściowe.
  - `CreateReviewResponseDTO` (`src/types.ts`) - odpowiedź.
  - `FlashcardDTO` (`src/types.ts`) - odczyt i aktualizacja stanu fiszki.
  - `ReviewLogDTO` (`src/types.ts`) - zapis historii.
- **Typy biblioteczne (`ts-fsrs`):**
  - `Card` - wewnętrzna reprezentacja karty w algorytmie.
  - `Rating` - typ wyliczeniowy ocen (Again, Hard, Good, Easy).

## 4. Szczegóły odpowiedzi
- **Kod sukcesu:** `200 OK`
- **Struktura odpowiedzi:** JSON zgodny z `CreateReviewResponseDTO`.

```json
{
  "data": {
    "card": {
      "id": "...",
      "stability": 2.5,
      "difficulty": 6.1,
      "due": "2026-01-30T10:00:00Z",
      ...
    }
  }
}
```

## 5. Przepływ danych
1. **Klient:** Wysyła żądanie POST z `card_id` i `rating`.
2. **Astro Middleware:** Weryfikuje sesję użytkownika.
3. **Endpoint (`reviews/index.ts`):** Waliduje dane wejściowe (Zod) i przekazuje je do serwisu.
4. **ReviewService:**
   - Pobiera aktualny stan fiszki z tabeli `flashcards` dla danego `user_id`.
   - Konwertuje dane DB na obiekt `Card` biblioteki `ts-fsrs`.
   - Wywołuje funkcję `fsrs.repeat(card, now)` w celu obliczenia nowych parametrów.
   - Mapuje wynik obliczeń z powrotem na strukturę bazy danych.
5. **Supabase (Baza Danych):**
   - Wykonuje `UPDATE` na tabeli `flashcards` (nowe parametry FSRS, data `due`).
   - Wykonuje `INSERT` do tabeli `review_logs` (zrzut stanu przed zmianą, ocena).
6. **Endpoint:** Zwraca zaktualizowaną fiszkę i datę następnej powtórki.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie:** Endpoint dostępny tylko dla zalogowanych użytkowników. Weryfikacja przez `context.locals.user`.
- **Autoryzacja:** Zapytanie do bazy danych o fiszkę MUSI zawierać klauzulę `user_id = current_user_id`. Użytkownik nie może oceniać cudzych fiszek.
- **Walidacja danych:**
  - `card_id`: musi być poprawnym UUID.
  - `rating`: musi być liczbą całkowitą z zakresu 1-4.
  - `review_duration_ms`: opcjonalna liczba dodatnia.

## 7. Obsługa błędów
| Kod | Sytuacja | Komunikat błędu (przykład) |
|-----|----------|----------------------------|
| 400 | Błędne body / Walidacja Zod | `Invalid rating value` |
| 401 | Brak sesji | `Unauthorized` |
| 404 | Fiszka nie istnieje lub brak dostępu | `Flashcard not found` |
| 500 | Błąd bazy danych / algorytmu | `Internal Server Error` |

## 8. Rozważania dotyczące wydajności
- **Indeksy:** Tabela `flashcards` powinna mieć indeks na `id` (PK) oraz `user_id`. Tabela `review_logs` powinna mieć indeksy na `card_id` i `user_id`.
- **Algorytm:** Obliczenia `ts-fsrs` są bardzo szybkie (CPU-bound) i nie stanowią wąskiego gardła.
- **Baza danych:** Operacja wymaga dwóch zapytań (UPDATE + INSERT). Ze względu na użycie klienta JS, będą to dwa osobne calle sieciowe (chyba że użyjemy `rpc`, ale w MVP robimy to sekwencyjnie aplikacyjnie z `await`).

## 9. Etapy wdrożenia

### Krok 1: Utworzenie Serwisu (`src/lib/services/review.service.ts`)
Stwórz klasę lub zestaw funkcji odpowiedzialnych za logikę biznesową.
- Importuj `ts-fsrs` i skonfiguruj domyślny generator parametrów.
- Zaimplementuj funkcję `submitReview(userId: string, dto: CreateReviewDTO)`.
- Funkcja musi zawierać mapowanie pól DB <-> FSRS (uwaga na różnice w nazewnictwie, np. `snake_case` w DB vs parametry obiektu `Card` w bibliotece).
- Obsłuż logikę zapisu do dwóch tabel.

### Krok 2: Implementacja Endpointu (`src/pages/api/reviews/index.ts`)
- Skonfiguruj endpoint jako `export const prerender = false`.
- Zaimplementuj obsługę metody `POST`.
- Pobierz instancję Supabase z `context.locals`.
- Zweryfikuj użytkownika.
- Użyj `zod` do walidacji body żądania.
- Wywołaj `reviewService.submitReview`.
- Zwróć odpowiedź `200` lub odpowiedni kod błędu.
