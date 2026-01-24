# REST API Plan - 10xdevs Flashcards

Ten dokument przedstawia plan API REST dla aplikacji "10xdevs Flashcards". API zostało zaprojektowane z uwzględnieniem architektury Astro (Server Side Rendering / API Routes) oraz Supabase jako warstwy bazy danych i autentykacji.

## 1. Zasoby

| Zasób | Tabela Bazy Danych | Opis |
|-------|--------------------|------|
| **Auth** | `auth.users`, `public.profiles` | Zarządzanie sesją i kontem użytkownika. |
| **Flashcards** | `public.flashcards` | Główne jednostki treści (fiszki). |
| **Reviews** | `public.review_logs` | Logika powtórek i historia nauki. |
| **AI** | *Brak (Stateless)* | Generowanie treści przy użyciu LLM. |

---

## 2. Endpointy

### 2.2. Fiszki (`/api/flashcards`)

Zarządzanie kolekcją fiszek (CRUD).

#### **Pobierz listę fiszek**
*   **Metoda:** `GET`
*   **Ścieżka:** `/api/flashcards`
*   **Opis:** Pobiera wszystkie fiszki użytkownika. Obsługuje wyszukiwanie i filtrowanie pod kątem nauki.
*   **Parametry zapytania (Query Params):**
    *   `q` (opcjonalny): Fraza wyszukiwania (szuka w `front` i `back` używając trigramów).
    *   `mode` (opcjonalny):
        *   `all` (domyślnie): Wszystkie fiszki (np. do widoku listy).
        *   `study`: Tylko fiszki do powtórki na dziś (`due <= NOW()`).
*   **Odpowiedź Sukcesu (200 OK):**
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
           // ...pozostałe pola FSRS
        }
      ],
      "count": 42
    }
    ```

#### **Utwórz fiszkę**
*   **Metoda:** `POST`
*   **Ścieżka:** `/api/flashcards`
*   **Opis:** Tworzy nową fiszkę (ręcznie lub zatwierdzoną z AI).
*   **Body Żądania:**
    ```json
    {
      "front": "Treść pytania (max 500)",
      "back": "Treść odpowiedzi (max 1000)",
      "is_ai_generated": boolean
    }
    ```
*   **Walidacja:**
    *   `front`: string, min 1, max 500 znaków.
    *   `back`: string, min 1, max 1000 znaków.
*   **Odpowiedź Sukcesu (201 Created):**
    ```json
    {
      "data": { "id": "uuid", ... } // Utworzony obiekt
    }
    ```

#### **Utwórz wiele fiszek jednocześnie**
*   **Metoda:** `POST`
*   **Ścieżka:** `/api/flashcards/batch`
*   **Opis:** Tworzy wiele fiszek naraz (np. wygenerowane przez AI lub importowane przez użytkownika).
*   **Body Żądania:**
    ```json
    {
      "cards": [
        { "front": "Treść pytania 1", "back": "Treść odpowiedzi 1", "is_ai_generated": true },
        { "front": "Treść pytania 2", "back": "Treść odpowiedzi 2", "is_ai_generated": true }
        // ...kolejne fiszki
      ]
    }
    ```
*   **Walidacja:**
    *   `cards`: tablica 1-100 elementów.
    *   Każda fiszka:
        *   `front`: string, min 1, max 500 znaków.
        *   `back`: string, min 1, max 1000 znaków.
        *   `is_ai_generated`: boolean.
*   **Odpowiedź Sukcesu (201 Created):**
    ```json
    {
      "ids": ["uuid-1", "uuid-2", "..."]
    }
    ```

#### **Edytuj fiszkę**
*   **Metoda:** `PATCH`
*   **Ścieżka:** `/api/flashcards/{id}`
*   **Opis:** Aktualizuje treść fiszki. Nie modyfikuje parametrów FSRS (chyba że resetujemy postęp - poza zakresem MVP).
*   **Body Żądania:**
    ```json
    {
      "front": "Zaktualizowane pytanie",
      "back": "Zaktualizowana odpowiedź"
    }
    ```
*   **Odpowiedź Sukcesu (200 OK):** Zaktualizowany obiekt.

#### **Usuń fiszkę**
*   **Metoda:** `DELETE`
*   **Ścieżka:** `/api/flashcards/{id}`
*   **Opis:** Trwale usuwa fiszkę.
*   **Odpowiedź Sukcesu (204 No Content).**

---

### 2.3. Nauka i Powtórki (`/api/reviews`)

Obsługa logiki algorytmu Spaced Repetition (FSRS).

#### **Zarejestruj powtórkę (Oceń fiszkę)**
*   **Metoda:** `POST`
*   **Ścieżka:** `/api/reviews`
*   **Opis:** Przyjmuje ocenę użytkownika, oblicza nowe parametry FSRS (server-side), aktualizuje fiszkę i dodaje wpis do logów.
*   **Body Żądania:**
    ```json
    {
      "card_id": "uuid",
      "rating": 3 // 1=Again, 2=Hard, 3=Good, 4=Easy
    }
    ```
*   **Logika Biznesowa:**
    1.  Pobierz aktualny stan fiszki (`stability`, `difficulty`, etc.).
    2.  Użyj biblioteki `ts-fsrs` do obliczenia nowych parametrów na podstawie `rating`.
    3.  W ramach transakcji:
        *   `UPDATE flashcards SET ...` (nowe parametry FSRS, `due`, `last_review`).
        *   `INSERT INTO review_logs ...` (snapshot stanu przed zmianą, ocena).
*   **Odpowiedź Sukcesu (200 OK):**
    ```json
    {
      "card": { ... }, // Zaktualizowana fiszka (do ewentualnego undo lub odświeżenia UI)
      "next_due": "2026-01-25T..."
    }
    ```
*   **Błędy:** `400 Bad Request` (nieprawidłowa ocena), `404 Not Found` (fiszka nie istnieje/brak dostępu).

---

### 2.4. Generator AI (`/api/ai`)

Interakcja z modelami językowymi.

#### **Generuj propozycje fiszek**
*   **Metoda:** `POST`
*   **Ścieżka:** `/api/ai/generate`
*   **Opis:** Przetwarza notatki użytkownika i zwraca listę propozycji fiszek (draftów). Nie zapisuje nic w bazie danych.
*   **Body Żądania:**
    ```json
    {
      "note_content": "Długi tekst notatki..."
    }
    ```
*   **Logika Biznesowa:**
    1.  Sprawdzenie długości tekstu wejściowego (zapobieganie nadużyciom).
    2.  Wysłanie zapytania do OpenRouter (model `gpt-4o-mini`).
    3.  Prompt inżynieria wymuszająca format JSON.
    4.  Parsowanie i walidacja odpowiedzi modelu (schema Zod).
*   **Odpowiedź Sukcesu (200 OK):**
    ```json
    {
      "drafts": [
        {
          "front": "Co to jest SOLID?",
          "back": "Zbiór 5 zasad programowania obiektowego..."
        },
        ...
      ]
    }
    ```
*   **Ograniczenia:** Timeout 2 minuty (serwer musi obsługiwać long-running request).
*   **Błędy:** `422 Unprocessable Entity` (tekst zbyt krótki/długi), `504 Gateway Timeout`, `500 AI Error`.

---

## 3. Uwierzytelnianie i Autoryzacja

*   **Mechanizm:** Supabase Auth (JWT).
*   **Header:** Każde zapytanie do API musi zawierać nagłówek:
    `Authorization: Bearer <access_token>`
*   **Weryfikacja:**
    *   Dla zapytań bezpośrednio do bazy (Client -> Supabase): Obsługiwane przez PostgreSQL Row Level Security (RLS).
    *   Dla zapytań do API Routes (Client -> Astro Server -> Logic): Serwer weryfikuje token JWT, wyciąga `user_id` i używa go do zapytań w imieniu użytkownika lub sprawdza uprawnienia.

## 4. Walidacja i Logika Biznesowa

### 4.1. Warunki Walidacji (zgodne z DB Schema)

| Pole | Typ | Reguły |
|------|-----|--------|
| `flashcards.front` | Text | Required, Max 500 znaków. |
| `flashcards.back` | Text | Required, Max 1000 znaków. |
| `flashcards.state` | Int | 0 (New), 1 (Learning), 2 (Review), 3 (Relearning). |
| `review_logs.rating`| Int | 1 (Again), 2 (Hard), 3 (Good), 4 (Easy). |
| `ai.note_content` | Text | Min 10 znaków, Max limit tokenów modelu (~10-20k znaków bezpiecznie). |

### 4.2. Implementacja Logiki

1.  **FSRS (Algorytm Powtórek):**
    *   Logika obliczania daty następnej powtórki jest scentralizowana w endpoincie `POST /api/reviews`.
    *   Zapobiega to manipulacji harmonogramem przez klienta.
    *   Wykorzystuje bibliotekę `ts-fsrs` na backendzie.

2.  **Drafty AI:**
    *   Zgodnie z PRD, wygenerowane fiszki są "ulotne" (in-memory).
    *   API `/api/ai/generate` zwraca czysty JSON.
    *   Dopiero akcja użytkownika "Zapisz" na frontendzie wywołuje `POST /api/flashcards` dla wybranych elementów.

3.  **Dostęp do danych:**
    *   Wszystkie endpointy implementują ścisłą izolację użytkowników. Nie ma endpointów administracyjnych zwracających dane wszystkich użytkowników.
