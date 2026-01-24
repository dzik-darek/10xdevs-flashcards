# API Endpoint Implementation Plan: Delete Flashcard

## 1. Przegląd punktu końcowego
Endpoint umożliwia trwałe usunięcie pojedynczej fiszki z bazy danych. Operacja ta jest nieodwracalna i automatycznie usuwa powiązane logi powtórek (dzięki kaskadowaniu w bazie danych). Użytkownik może usunąć tylko fiszki, których jest właścicielem.

## 2. Szczegóły żądania
- **Metoda HTTP:** `DELETE`
- **Struktura URL:** `/api/flashcards/{id}`
- **Parametry:**
  - **Wymagane:**
    - `id` (path param): UUID fiszki do usunięcia.
  - **Opcjonalne:** Brak.
- **Request Body:** Puste.

## 3. Wykorzystywane typy
- **Walidacja:** Regex dla UUID (istniejący `UUID_PATTERN`).
- **Serwis:** Nowa sygnatura metody w serwisie (zwracająca `boolean` lub `void`).

## 4. Szczegóły odpowiedzi
- **Sukces (204 No Content):** Operacja powiodła się, brak treści w odpowiedzi.
- **Błędy:**
  - `400 Bad Request`: Nieprawidłowy format ID.
  - `401 Unauthorized`: Użytkownik nie jest zalogowany.
  - `404 Not Found`: Fiszka nie istnieje lub użytkownik nie ma do niej praw.
  - `500 Internal Server Error`: Błąd serwera/bazy danych.

## 5. Przepływ danych
1.  **Klient** wysyła żądanie `DELETE /api/flashcards/{uuid}`.
2.  **Endpoint (`[id].ts`)** waliduje format UUID.
3.  **Endpoint** pobiera `user_id` z kontekstu autoryzacji (Supabase Auth).
4.  **Service (`deleteFlashcard`)** wykonuje zapytanie do Supabase:
    - `DELETE FROM flashcards WHERE id = {id} AND user_id = {userId}`.
5.  **Supabase** wykonuje usunięcie i zwraca liczbę usuniętych wierszy.
    - Baza danych automatycznie usuwa powiązane rekordy w `review_logs` (`ON DELETE CASCADE`).
6.  **Service** zwraca informację, czy rekord został usunięty.
7.  **Endpoint** zwraca status 204 (jeśli usunięto) lub 404 (jeśli nic nie usunięto).

## 6. Względy bezpieczeństwa
- **Autoryzacja:** Wymagana sesja użytkownika.
- **Kontrola dostępu (IDOR):** Zapytanie DELETE **musi** zawierać warunek `user_id`, aby uniemożliwić usunięcie fiszek innych użytkowników.
- **Walidacja danych:** Sprawdzenie poprawności formatu UUID przed wykonaniem zapytania do bazy.

## 7. Obsługa błędów
| Scenariusz | Kod HTTP | Kod błędu (JSON) | Opis |
| match | match | match | match |
| Pomyślne usunięcie | 204 | - | Fiszka usunięta. |
| Brak ID / Zły format | 400 | `INVALID_UUID` / `MISSING_ID` | Podano błędny identyfikator. |
| Brak autoryzacji | 401 | `UNAUTHORIZED` | Brak aktywnej sesji. |
| Nie znaleziono / Brak uprawnień | 404 | `NOT_FOUND` | Fiszka nie istnieje lub należy do innego usera. |
| Błąd bazy danych | 500 | `INTERNAL_ERROR` | Nieoczekiwany błąd serwera. |

## 8. Rozważania dotyczące wydajności
- Operacja usuwania jest szybka dzięki indeksowi na kluczu głównym `id`.
- Kaskadowe usuwanie w bazie danych jest wydajniejsze niż wielokrotne zapytania z poziomu aplikacji.
- Nie jest wymagane zwracanie danych usuniętego obiektu, co minimalizuje narzut sieciowy.

## 9. Etapy wdrożenia

### Krok 1: Aktualizacja serwisu (`src/lib/services/flashcard.service.ts`)
Dodać funkcję `deleteFlashcard`:
- Przyjmuje: `supabase`, `id`, `userId`.
- Wykonuje: `delete().eq('id', id).eq('user_id', userId)`.
- Zwraca: `boolean` (true jeśli `count > 0`, false w przeciwnym razie).

### Krok 2: Implementacja Handlera (`src/pages/api/flashcards/[id].ts`)
Dodać eksport `DELETE`:
- Walidacja ID (wykorzystać istniejący `UUID_PATTERN`).
- Pobranie `user_id` (obecnie `DEFAULT_USER_ID` dla dev, przygotowane pod auth).
- Wywołanie serwisu.
- Obsługa odpowiedzi 204/404/500.
