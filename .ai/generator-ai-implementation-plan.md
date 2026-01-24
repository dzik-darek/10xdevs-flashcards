# API Endpoint Implementation Plan: Generowanie Fiszek AI

## 1. Przegląd punktu końcowego
Punkt końcowy `POST /api/ai/generate` służy do generowania propozycji fiszek (draftów) na podstawie notatek dostarczonych przez użytkownika. Wykorzystuje zewnętrzne API (OpenRouter) do przetworzenia tekstu i zwraca ustrukturyzowane dane JSON. Endpoint jest bezstanowy – nie zapisuje wyników w bazie danych; decyzję o zapisie podejmuje użytkownik w kolejnym kroku.

## 2. Szczegóły żądania
- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/ai/generate`
- **Nagłówki:**
  - `Content-Type: application/json`
  - Cookie sesyjne (wymagane przez middleware autentykacji)
- **Request Body:**
  ```json
  {
    "note_content": "Treść notatki użytkownika..."
  }
  ```

## 3. Wykorzystywane typy
Plik źródłowy: `src/types.ts`

- **DTO wejściowe:** `GenerateFlashcardsDTO`
  - Wykorzystuje: `VALIDATION_CONSTRAINTS.ai.noteContent` (min: 10, max: 20000)
- **DTO wyjściowe:** `GenerateFlashcardsResponseDTO`
- **DTO składowe:** `FlashcardDraftDTO`
  - Wykorzystuje: `VALIDATION_CONSTRAINTS.flashcard` (front max: 500, back max: 1000)

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)
```json
{
  "drafts": [
    {
      "front": "Pytanie wygenerowane przez AI",
      "back": "Odpowiedź wygenerowana przez AI"
    },
    ...
  ]
}
```

### Kody statusu
- `200 OK` – Pomyślnie wygenerowano fiszki.
- `400 Bad Request` – Nieprawidłowy format JSON w żądaniu.
- `401 Unauthorized` – Użytkownik nie jest zalogowany.
- `422 Unprocessable Entity` – Treść notatki nie spełnia wymogów walidacji (za krótka/za długa).
- `500 Internal Server Error` – Błąd komunikacji z OpenRouter, błąd parsowania odpowiedzi AI lub błąd konfiguracyjny.
- `504 Gateway Timeout` – Przekroczono czas oczekiwania na odpowiedź od AI.

## 5. Przepływ danych
1. **Klient** wysyła żądanie `POST` z treścią notatki.
2. **Astro Middleware** weryfikuje sesję użytkownika (Supabase Auth).
3. **API Route Handler** (`src/pages/api/ai/generate.ts`) odbiera żądanie.
4. **Walidacja Zod** sprawdza poprawność `note_content` (długość).
5. **AiService** (`src/lib/services/ai.service.ts`):
    - Konstruuje prompt systemowy wymuszający format JSON.
    - Wysyła żądanie do OpenRouter API (model `gpt-4o-mini` lub inny zdefiniowany).
6. **OpenRouter** przetwarza tekst i zwraca odpowiedź, prompt AI żąda, aby odpowiedź zawierała jedynie wygenerowane fiszki w formacie JSON.
7. **AiService**:
    - Parsuje odpowiedź tekstową na JSON.
    - Waliduje strukturę otrzymanego JSONa (czy zawiera tablicę `drafts`).
    - Sanityzuje dane (np. przycina zbyt długie odpowiedzi, choć prompt powinien temu zapobiec).
8. **API Route Handler** zwraca obiekt `GenerateFlashcardsResponseDTO` do klienta.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie:** Endpoint dostępny tylko dla zalogowanych użytkowników (weryfikacja `locals.user` lub `supabase.auth.getUser`).
- **Secrets Management:** Klucz API OpenRouter przechowywany w zmiennych środowiskowych (`OPENROUTER_API_KEY`). Nie może być widoczny po stronie klienta.
- **Prompt Injection:** Treść użytkownika powinna być wyraźnie oddzielona od instrukcji systemowych w prompcie (np. poprzez odpowiednie tagowanie lub strukturę wiadomości `system` vs `user`).
- **Walidacja danych:** Strict validation na wejściu (Zod) oraz walidacja odpowiedzi od AI przed wysłaniem do klienta.

## 7. Obsługa błędów
- **Błędy walidacji (Zod):** Zwracamy czytelny komunikat `422` wskazujący na nieprawidłową długość tekstu.
- **Błędy OpenRouter:**
  - Jeśli API zwróci błąd (np. brak środków, błąd serwera), logujemy go po stronie serwera i zwracamy ogólny `500`.
  - Obsługa timeoutów (`AbortController`) dla fetch requestu (np. 60 sekund).
- **Halucynacje formatu:** Jeśli AI zwróci tekst zamiast JSON, serwis powinien rzucić błąd `500` (AI response parsing failed).

## 8. Rozważania dotyczące wydajności
- **Czas odpowiedzi:** Generowanie może trwać od kilku do kilkunastu sekund. Frontend musi wyświetlać stan ładowania (spinner/skeleton).
- **Prerender:** Endpoint musi być dynamiczny (`export const prerender = false`), ponieważ zależy od inputu użytkownika i zewnętrznego API.
- **Wybór modelu:** `gpt-4o-mini` jest zalecany ze względu na dobry stosunek jakości do szybkości i ceny dla tego typu zadań.

## 9. Etapy wdrożenia

### Krok 1: Konfiguracja Środowiska
1. Upewnij się, że `OPENROUTER_API_KEY` znajduje się w pliku `.env` (i `.env.example`).
2. Do komunikacji z OpenRouter wykorzystaj natywnego klienta REST (`fetch`) — nie instaluj dodatkowych SDK.

### Krok 2: Implementacja AiService
1. Utworzyć `src/lib/services/ai.service.ts`.
2. Zdefiniować interfejsy dla odpowiedzi z OpenRouter.
3. Zaimplementować funkcję `generateFlashcards(content: string): Promise<FlashcardDraftDTO[]>`.
4. Stworzyć prompt inżynierski:
   - Rola: Ekspert od nauki/fiszki.
   - Zadanie: Stwórz pary pytanie-odpowiedź.
   - Format: Czysty JSON array w polu `drafts`.
   - Ograniczenia: Długość pól.

### Krok 3: Implementacja API Route
1. Utworzyć plik `src/pages/api/ai/generate.ts`.
2. Ustawić `export const prerender = false`.
3. Zaimplementować handler `POST`.
4. Dodać walidację inputu za pomocą `zod` (schema zgodna z `GenerateFlashcardsDTO`).
5. Wywołać `AiService`.
6. Obsłużyć błędy i zwrócić odpowiednie kody HTTP.
