# Plan implementacji widoku Sesji Nauki (Study Session)

## 1. Przegląd
Widok Sesji Nauki (`/study`) jest kluczowym elementem aplikacji realizującym proces powtórek metodą spaced repetition (FSRS). Umożliwia użytkownikowi przeglądanie fiszek wyznaczonych na dany dzień, odsłanianie odpowiedzi oraz ocenianie stopnia zapamiętania materiału. Implementacja kładzie nacisk na płynność działania ("Optimistic UI") i minimalizm interfejsu, aby zmaksymalizować skupienie na nauce.

## 2. Routing widoku
*   **Ścieżka URL:** `/study`
*   **Plik Astro:** `src/pages/study.astro`
*   **Dostęp:** Tylko dla zalogowanych użytkowników (chronione przez middleware).

## 3. Struktura komponentów

Widok zostanie zbudowany w oparciu o architekturę "Container/Presentational".

```text
src/pages/study.astro (Layout aplikacji)
└── StudySessionContainer.tsx (Główny komponent logiczny - client:only)
    ├── StudyProgressBar.tsx (Pasek postępu sesji)
    ├── StudyCard.tsx (Komponent wyświetlający kartę - Front/Back)
    │   └── CardContent.tsx (text)
    ├── RatingControls.tsx (Panel przycisków oceny)
    └── SessionSummary.tsx (Ekran końcowy po wyczerpaniu kolejki)
```

## 4. Szczegóły komponentów

### `StudySessionContainer` (`src/components/study/StudySessionContainer.tsx`)
*   **Opis:** Główny kontener zarządzający stanem sesji, pobieraniem danych i logiką biznesową.
*   **Główne elementy:** Wrapper logiczny, obsługa stanów ładowania (Skeleton), błędów i widoku właściwego.
*   **Obsługiwane zdarzenia:**
    *   `onMount`: Pobranie listy fiszek (`mode=study`).
    *   `onRate`: Obsługa oceny użytkownika (aktualizacja kolejki, wysyłka do API).
*   **Typy:** Zarządza `FlashcardDTO[]`.

### `StudyCard` (`src/components/study/StudyCard.tsx`)
*   **Opis:** Prezentuje treść fiszki. Obsługuje efekt odwracania karty (flip).
*   **Główne elementy:** `Card` (Shadcn), kontenery dla przodu i tyłu, animacja CSS/Framer Motion.
*   **Props:**
    *   `card: FlashcardDTO`
    *   `isFlipped: boolean`
    *   `onFlip: () => void`
*   **Interakcje:** Kliknięcie w kartę powoduje wywołanie `onFlip`.

### `RatingControls` (`src/components/study/RatingControls.tsx`)
*   **Opis:** Panel z 4 przyciskami oceny algorytmu FSRS.
*   **Główne elementy:** 4x `Button` (Shadcn) z odpowiednimi kolorami/etykietami (Again, Hard, Good, Easy).
*   **Props:**
    *   `onRate: (rating: Rating) => void`
    *   `disabled: boolean` (np. gdy karta nie jest odwrócona)

### `SessionSummary` (`src/components/study/SessionSummary.tsx`)
*   **Opis:** Wyświetlany gdy kolejka fiszek jest pusta.
*   **Główne elementy:** Komunikat gratulacyjny, statystyki sesji (opcjonalnie), przyciski "Wróć do dashboardu".

## 5. Typy

Wymagane zaimportowanie istniejących typów z `src/types.ts`:
*   `FlashcardDTO`
*   `Rating` (type alias: 1 | 2 | 3 | 4)
*   `CreateReviewDTO`

Dodatkowe typy lokalne (w pliku hooka lub components/study/types.ts):

```typescript
export type StudySessionStatus = 'loading' | 'error' | 'active' | 'empty' | 'finished';

export interface StudyState {
  queue: FlashcardDTO[];
  currentCard: FlashcardDTO | null;
  isFlipped: boolean;
  status: StudySessionStatus;
  totalCards: number; // Do paska postępu (początkowa wielkość kolejki)
  reviewedCards: number;
}
```

## 6. Zarządzanie stanem

Zalecane utworzenie custom hooka `useStudySession` w `src/hooks/useStudySession.ts`:

*   **State:**
    *   `queue`: Tablica fiszek do przerobienia.
    *   `isFlipped`: Boolean określający czy widzimy odpowiedź.
    *   `startTime`: Timestamp momentu wyświetlenia aktualnej karty (do obliczenia `review_duration_ms`).
    *   `status`: Stan cyklu życia sesji.
*   **Logika:**
    *   `fetchQueue`: Pobiera dane z API.
    *   `flip`: Zmienia stan `isFlipped`.
    *   `rate(rating)`:
        1.  Oblicza czas trwania (`Date.now() - startTime`).
        2.  **Optimistic UI:** Usuwa bieżącą kartę z kolejki (`queue.slice(1)`), resetuje `isFlipped`, aktualizuje liczniki.
        3.  Wysyła żądanie `POST /api/reviews` w tle (bez `await` blokującego UI).
        4.  W razie błędu API: wyświetla toast (Sonner).

## 7. Integracja API

### Pobieranie kolejki
*   **Endpoint:** `GET /api/flashcards`
*   **Query Params:** `?mode=study`
*   **Oczekiwana odpowiedź:** `{ data: FlashcardDTO[], count: number }`

### Wysyłanie oceny
*   **Endpoint:** `POST /api/reviews`
*   **Body:**
    ```typescript
    {
      card_id: string; // UUID
      rating: 1 | 2 | 3 | 4;
      review_duration_ms: number;
    }
    ```
*   **Odpowiedź:** Ignorowana w przypadku sukcesu (Optimistic UI), logowana w przypadku błędu.

## 8. Interakcje użytkownika

1.  **Start:** Użytkownik wchodzi na `/study`. Loader się kręci.
2.  **Widok Pytania:** Wyświetla się przód pierwszej karty. Przyciski oceny są ukryte lub nieaktywne.
3.  **Odsłonięcie:**
    *   Kliknięcie w obszar karty.
    *   Karta obraca się (pokazuje tył).
    *   Pojawiają się przyciski oceny (Again, Hard, Good, Easy).
4.  **Ocena:**
    *   Kliknięcie przycisku.
    *   Interfejs natychmiast przechodzi do następnej karty (reset do stanu "Widok Pytania").
5.  **Koniec:** Gdy kolejka się wyczerpie -> Widok podsumowania.

## 9. Warunki i walidacja

*   **Pusta kolejka:** Jeśli API zwróci pustą listę na starcie -> Pokaż od razu `SessionSummary` z komunikatem "Wszystko na dziś zrobione".
*   **Walidacja oceny:** Frontend musi zapewnić wysyłanie tylko wartości 1-4.
*   **Kolejność:** Nie można ocenić karty przed jej odsłonięciem (zapobiega przypadkowym kliknięciom).

## 10. Obsługa błędów

*   **Błąd pobierania kolejki:** Wyświetlenie komunikatu błędu z przyciskiem "Spróbuj ponownie" (Retry).
*   **Błąd zapisu oceny (API error):**
    *   Użytkownik nie jest zatrzymywany (sesja trwa dalej).
    *   Wyświetlany jest "Toast" (Sonner) z informacją o błędzie synchronizacji.
    *   Log błędu w konsoli.

## 11. Kroki implementacji

1.  **Przygotowanie Hooka:** Stworzenie `src/hooks/useStudySession.ts` z logiką pobierania danych (`mode=study`) i zarządzania kolejką.
2.  **Komponenty UI - Karta:** Implementacja `StudyCard.tsx` z obsługą `front`/`back` i stylami dla stanu odwróconego.
3.  **Komponenty UI - Kontrolki:** Implementacja `RatingControls.tsx` z mapowaniem klawiatury.
4.  **Kontener Sesji:** Złożenie `StudySessionContainer.tsx` integrującego hooka i komponenty prezentacyjne.
5.  **Obsługa API:** Podpięcie funkcji `submitReview` w serwisie `review.service.ts` (jeśli jeszcze nie istnieje obsługa frontowa) i wykorzystanie jej w hooku.
6.  **Strona Astro:** Utworzenie `src/pages/study.astro` i osadzenie kontenera.
