# Plan implementacji widoku Listy Fiszek

## 1. Przegląd
Widok "Lista Fiszek" (Flashcard List) to centralne miejsce do zarządzania bazą wiedzy użytkownika. Umożliwia przeglądanie wszystkich stworzonych fiszek w formie tabelarycznej, wyszukiwanie ich po treści (pytanie/odpowiedź) oraz wykonywanie operacji CRUD (edycja, usuwanie). Widok ten jest kluczowy dla realizacji historyjek użytkownika US-006, US-007, US-009.

## 2. Routing widoku
*   **Ścieżka:** `/flashcards`
*   **Plik Astro:** `src/pages/flashcards/index.astro`
*   **Zabezpieczenie:** Strona dostępna tylko dla zalogowanych użytkowników (weryfikacja w middleware).

## 3. Struktura komponentów

```text
src/pages/flashcards/index.astro (Page Wrapper)
└── Layout (Astro Layout)
    └── FlashcardDashboard (React Container - Smart Component)
        ├── PageHeader (Tytuł + Licznik)
        ├── SearchBar (Debounced Input)
        ├── FlashcardTable (Data Display)
        │   ├── TableHeader
        │   ├── TableRow (Iteracja po fiszkach)
        │   │   └── ActionMenu (Dropdown: Edytuj, Usuń)
        │   └── TableSkeleton (Loading State)
        ├── EditFlashcardDialog (Modal edycji - Shadcn Dialog)
        │   └── FlashcardForm (Reużywalny formularz)
        └── DeleteFlashcardAlert (Modal potwierdzenia - Shadcn Alert Dialog)
```

## 4. Szczegóły komponentów

### `FlashcardDashboard` (`src/components/flashcards/FlashcardDashboard.tsx`)
*   **Opis:** Główny komponent zarządzający stanem widoku. Odpowiada za pobieranie danych z API, obsługę stanu ładowania, przechowywanie frazy wyszukiwania i koordynację otwierania modali edycji/usuwania.
*   **Główne elementy:** `div` (wrapper), `SearchBar`, `FlashcardTable`, `EditFlashcardDialog`, `DeleteFlashcardAlert`.
*   **Obsługiwane zdarzenia:**
    *   `onSearch`: Aktualizacja query params i przeładowanie listy.
    *   `onEditClick`: Otwarcie modala z danymi wybranej fiszki.
    *   `onDeleteClick`: Otwarcie alertu potwierdzenia dla wybranej fiszki.
    *   `onFlashcardUpdate`: Odświeżenie listy po udanej edycji.
    *   `onFlashcardDelete`: Odświeżenie listy po usunięciu.
*   **Typy:** Wykorzystuje `FlashcardDTO`.
*   **Propsy:** Brak (pobiera dane samodzielnie lub przyjmuje dane początkowe z Astro).

### `SearchBar` (`src/components/ui/search-bar.tsx`)
*   **Opis:** Pole tekstowe z ikoną lupy, obsługujące debouncing (opóźnienie wysyłania zapytania).
*   **Główne elementy:** `Input` (Shadcn), `SearchIcon` (Lucide).
*   **Obsługiwane zdarzenia:** `onChange` (z debounce 300-500ms).
*   **Propsy:**
    *   `onSearch: (query: string) => void`
    *   `placeholder?: string`
    *   `defaultValue?: string`

### `FlashcardTable` (`src/components/flashcards/FlashcardTable.tsx`)
*   **Opis:** Komponent prezentacyjny wyświetlający listę fiszek.
*   **Główne elementy:** `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell` (Shadcn).
*   **Kolumny:**
    1.  **Pytanie (Front):** Tekst skrócony (truncate).
    2.  **Odpowiedź (Back):** Tekst skrócony (truncate).
    3.  **Następna powtórka:** Data sformatowana (`dd.MM.yyyy`) lub "Nowa".
    4.  **Akcje:** Przycisk z menu kontekstowym.
*   **Propsy:**
    *   `data: FlashcardDTO[]`
    *   `isLoading: boolean`
    *   `onEdit: (card: FlashcardDTO) => void`
    *   `onDelete: (card: FlashcardDTO) => void`

### `EditFlashcardDialog` (`src/components/flashcards/EditFlashcardDialog.tsx`)
*   **Opis:** Modal zawierający formularz edycji fiszki.
*   **Główne elementy:** `Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter`, `Input`/`Textarea`.
*   **Obsługiwana walidacja:**
    *   Front: min 1, max 500 znaków.
    *   Back: min 1, max 1000 znaków.
*   **Propsy:**
    *   `open: boolean`
    *   `onOpenChange: (open: boolean) => void`
    *   `flashcard: FlashcardDTO | null`
    *   `onSubmit: (data: UpdateFlashcardDTO) => Promise<void>`

## 5. Typy

Wykorzystujemy istniejące typy z `src/types.ts`. Nie ma potrzeby tworzenia nowych definicji domenowych, jedynie typy pomocnicze dla propsów komponentów.

Ważne typy do zaimportowania:
*   `FlashcardDTO`: Pełna struktura fiszki.
*   `UpdateFlashcardDTO`: Struktura do payloadu edycji (`{ front?: string, back?: string }`).
*   `GetFlashcardsResponseDTO`: Odpowiedź z endpointu GET.

## 6. Zarządzanie stanem

Zalecane stworzenie custom hooka `useFlashcardList` w `src/hooks/useFlashcardList.ts`.

**Stan hooka:**
*   `flashcards`: `FlashcardDTO[]`
*   `isLoading`: `boolean`
*   `error`: `string | null`
*   `searchQuery`: `string`

**Metody hooka:**
*   `setSearchQuery(query: string)`: Aktualizuje stan i triggeruje pobieranie.
*   `refresh()`: Wymusza ponowne pobranie danych.
*   `deleteCard(id: string)`: Woła API DELETE i odświeża listę.
*   `updateCard(id: string, data: UpdateFlashcardDTO)`: Woła API PATCH i odświeża listę.

## 7. Integracja API

### Pobieranie listy
*   **Endpoint:** `GET /api/flashcards`
*   **Parametry:** `?q={searchQuery}&mode=all`
*   **Typ odpowiedzi:** `GetFlashcardsResponseDTO` (`{ data: FlashcardDTO[], count: number }`)

### Edycja
*   **Endpoint:** `PATCH /api/flashcards/[id]`
*   **Body:** `UpdateFlashcardDTO` (JSON)
*   **Typ odpowiedzi:** `FlashcardDTO`

### Usuwanie
*   **Endpoint:** `DELETE /api/flashcards/[id]`
*   **Body:** Brak
*   **Odpowiedź:** 204 No Content

## 8. Interakcje użytkownika

1.  **Wejście na stronę:**
    *   Użytkownik widzi szkielet (skeleton) tabeli.
    *   Po załadowaniu widzi listę fiszek posortowaną domyślnie (np. po dacie dodania lub następnej powtórce).
2.  **Wyszukiwanie:**
    *   Użytkownik wpisuje frazę w `SearchBar`.
    *   Po 300-500ms następuje strzał do API.
    *   Tabela wchodzi w stan ładowania (można zachować poprzednie dane z opacity 50% lub pokazać spinner).
    *   Tabela odświeża się z przefiltrowanymi wynikami.
3.  **Edycja:**
    *   Kliknięcie ikony "..." -> "Edytuj".
    *   Otwiera się Modal z wypełnionymi polami.
    *   Kliknięcie "Zapisz" waliduje formularz i wysyła request.
    *   Po sukcesie modal się zamyka, a lista odświeża (lub element aktualizuje się optymistycznie).
4.  **Usuwanie:**
    *   Kliknięcie ikony "..." -> "Usuń".
    *   Otwiera się Alert Dialog ("Czy na pewno...?").
    *   Potwierdzenie wysyła request DELETE.
    *   Po sukcesie fiszka znika z listy.

## 9. Warunki i walidacja

**Walidacja formularza edycji (Frontend):**
*   **Pytanie (Front):** Wymagane, 1-500 znaków. Jeśli puste -> błąd "Pole wymagane". Jeśli za długie -> błąd "Maksymalnie 500 znaków".
*   **Odpowiedź (Back):** Wymagane, 1-1000 znaków. Zasady analogiczne.
*   Walidacja powinna odbywać się w czasie rzeczywistym lub przy próbie zapisu (`onSubmit`), blokując wysłanie requestu.
*   Wykorzystać `zod` po stronie klienta (tak samo jak na backendzie) do spójnej walidacji.

## 10. Obsługa błędów

*   **Błąd pobierania listy:** Wyświetlenie komunikatu w miejscu tabeli ("Nie udało się załadować fiszek. Spróbuj ponownie.") z przyciskiem "Odśwież".
*   **Błąd zapisu/edycji:** Toast (Shadcn `toast`) z komunikatem błędu ("Wystąpił błąd podczas zapisywania zmian"). Formularz nie zamyka się, aby użytkownik nie stracił danych.
*   **Błąd usuwania:** Toast z błędem ("Nie udało się usunąć fiszki").
*   **Pusta lista (Brak wyników):** Wyświetlenie stanu Empty State ("Nie znaleziono fiszek pasujących do zapytania" lub "Nie masz jeszcze żadnych fiszek").

## 11. Kroki implementacji

1.  **Przygotowanie strony Astro:** Utworzenie `src/pages/flashcards/index.astro` z podstawowym layoutem.
2.  **Przygotowanie Hooka:** Implementacja `useFlashcardList` w `src/hooks` (pobieranie danych `fetch`, stany `loading`, `error`, `data`).
3.  **Budowa tabeli:** Implementacja komponentu `FlashcardTable` z wykorzystaniem `shadcn/ui/table`. Obsługa wyświetlania danych i stanu pustego.
4.  **Implementacja wyszukiwania:** Dodanie `SearchBar` i podpięcie go pod stan hooka.
5.  **Implementacja usuwania:** Dodanie `DropdownMenu` w wierszach tabeli oraz `AlertDialog` do potwierdzania. Podpięcie funkcji usuwania z hooka.
6.  **Implementacja edycji:** Stworzenie `EditFlashcardDialog` z formularzem. Podpięcie funkcji edycji z hooka.
7.  **Integracja całości:** Złożenie komponentów w `FlashcardDashboard`, dodanie obsługi błędów (Toasty) i ostateczne stylowanie.
