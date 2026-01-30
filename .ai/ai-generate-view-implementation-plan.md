# Plan implementacji widoku Generatora AI

## 1. Przegląd
Widok Generatora AI (`/ai/generate`) to kluczowy element MVP, pozwalający użytkownikom na automatyczne tworzenie fiszek na podstawie notatek tekstowych. Proces jest podzielony na 3 etapy (Wizard):
1. **Input**: Wprowadzenie notatek.
2. **Processing**: Oczekiwanie na generację przez LLM.
3. **Review (Draft)**: Edycja, usuwanie i zatwierdzanie wygenerowanych fiszek przed zapisem do bazy.

## 2. Routing widoku
- **Ścieżka:** `/ai/generate`
- **Dostęp:** Tylko dla zalogowanych użytkowników (chronione przez middleware sesji).

## 3. Struktura komponentów
Głównym kontenerem jest strona Astro, która renderuje interaktywną wyspę React (Wizard).

```text
src/pages/ai/generate.astro (Astro Page + Layout)
└── AIGeneratorWizard (React Container)
    ├── InputStep (Component)
    │   ├── NoteTextarea (Shadcn Textarea)
    │   └── GenerateButton (Shadcn Button)
    ├── LoadingStep (Component)
    │   └── CircularTimer (Custom Component)
    └── ReviewStep (Component)
        ├── DraftList (Grid Container)
        │   └── DraftCard (Component - repeated)
        │       ├── FrontTextarea (Shadcn Textarea)
        │       ├── BackTextarea (Shadcn Textarea)
        │       └── Actions (Delete Button)
        └── ActionPanel (Save/Cancel Buttons)
```

## 4. Szczegóły komponentów

### `AIGeneratorWizard` (Container)
- **Opis:** Główny komponent zarządzający stanem procesu (krok, dane, błędy). Odpowiada za komunikację z API i synchronizację z `sessionStorage`.
- **Główne elementy:** `div` (wrapper), `InputStep` | `LoadingStep` | `ReviewStep` (renderowanie warunkowe).
- **Obsługiwane interakcje:**
  - Zmiana kroku.
  - Obsługa globalnych błędów.
  - Wywołanie akcji `saveBatch`.
- **Typy:** `GeneratorState`, `DraftViewModel`.
- **Propsy:** Brak (pobiera dane z kontekstu/stanu lokalnego).

### `InputStep`
- **Opis:** Formularz do wprowadzenia notatek źródłowych.
- **Główne elementy:** `Textarea`, `Button`, `Label`, licznik znaków.
- **Obsługiwane interakcje:**
  - Wpisanie tekstu (aktualizacja stanu rodzica).
  - Kliknięcie "Generuj" (uruchomienie walidacji i przejście do `LoadingStep`).
- **Obsługiwana walidacja:**
  - Min. 10 znaków.
  - Max. 20000 znaków (miękki limit UI).
- **Propsy:**
  - `content`: string
  - `onContentChange`: (val: string) => void
  - `onGenerate`: () => void
  - `isValid`: boolean

### `LoadingStep`
- **Opis:** Ekran oczekiwania z wizualizacją upływu czasu (ważne dla UX przy długich requestach).
- **Główne elementy:** Animowany spinner lub pasek postępu, timer odliczający do timeoutu (np. 120s).
- **Obsługiwane interakcje:**
  - Anulowanie operacji (`AbortController`).
- **Propsy:**
  - `startTime`: number (timestamp rozpoczęcia)

### `ReviewStep`
- **Opis:** Widok "Poczekalni". Pozwala edytować wygenerowane fiszki i wybrać te do zapisu.
- **Główne elementy:** Siatka (Grid) komponentów `DraftCard`, pasek akcji na dole (sticky bottom).
- **Obsługiwane interakcje:**
  - Zapisz wybrane (`handleSave`).
  - Odrzuć wszystkie (powrót do początku).
- **Propsy:**
  - `drafts`: DraftViewModel[]
  - `onSave`: () => Promise<void>
  - `onDiscard`: () => void
  - `onUpdateDraft`: (id: string, data: Partial<DraftViewModel>) => void
  - `onDeleteDraft`: (id: string) => void

### `DraftCard`
- **Opis:** Karta reprezentująca pojedynczą fiszkę w trybie edycji.
- **Główne elementy:** `Card` (Shadcn), `Textarea` (przód), `Textarea` (tył), `Button` (usuń).
- **Obsługiwane interakcje:**
  - Edycja pola `front`.
  - Edycja pola `back`.
  - Usunięcie fiszki.
- **Obsługiwana walidacja:**
  - `front`: max 500 znaków, wymagane.
  - `back`: max 1000 znaków, wymagane.
  - Wyświetlanie błędu walidacji (czerwona ramka/tekst).
- **Propsy:**
  - `draft`: DraftViewModel
  - `onUpdate`: (field: 'front'|'back', value: string) => void
  - `onDelete`: () => void

## 5. Typy

Należy zdefiniować typy w pliku `src/components/ai/types.ts` lub wewnątrz komponentu (jeśli lokalne).

```typescript
// Importowane z src/types.ts
import type { FlashcardDraftDTO } from '@/types';

// ViewModel rozszerza DTO o unikalny ID na potrzeby renderowania listy w React
// oraz stan walidacji lokalnej.
export interface DraftViewModel extends FlashcardDraftDTO {
  id: string; // UUID generowane na frontendzie
  isDeleted?: boolean; // Opcjonalnie do animacji usuwania
}

export type WizardStep = 'input' | 'loading' | 'review';

export interface GeneratorState {
  step: WizardStep;
  noteContent: string;
  drafts: DraftViewModel[];
  isSaving: boolean;
  error: string | null;
}
```

## 6. Zarządzanie stanem

Zarządzanie stanem będzie oparte na **Custom Hook `useGeneratorState`**.

- **Przeznaczenie:** Oddzielenie logiki biznesowej od widoku.
- **Funkcjonalności:**
  - `useState` dla `GeneratorState`.
  - `useEffect`: Zapisywanie stanu w `sessionStorage` przy każdej zmianie (klucz: `ai-generator-state`), aby przetrwać odświeżenie strony.
  - `useEffect`: Dodanie listenera `beforeunload`, jeśli w tablicy `drafts` są elementy (ochrona przed utratą danych).
  - Funkcje eksportowane:
    - `setNoteContent(text: string)`
    - `generateDrafts()`: Wywołuje API `/api/ai/generate`, mapuje odpowiedź na `DraftViewModel` (dodaje UUID), zmienia krok na `review`.
    - `updateDraft(id, changes)`
    - `removeDraft(id)`
    - `saveBatch()`: Filtruje poprawne drafty, mapuje na `CreateFlashcardDTO`, wysyła do `/api/flashcards/batch`, czyści stan.
    - `reset()`: Czyści stan do domyślnego.

## 7. Integracja API

### Generowanie (Krok 2 -> 3)
- **Endpoint:** `POST /api/ai/generate`
- **Request:** `GenerateFlashcardsDTO` (`{ note_content: string }`)
- **Response:** `GenerateFlashcardsResponseDTO` (`{ drafts: [{front, back}, ...] }`)
- **Obsługa:** W hooku `generateDrafts`. Należy dodać mapowanie odpowiedzi, aby do każdego draftu dodać frontendowe `id` (np. `crypto.randomUUID()`).

### Zapisywanie (Krok 3 -> Koniec)
- **Endpoint:** `POST /api/flashcards/batch`
- **Request:** `BatchCreateFlashcardsDTO`
  ```json
  {
    "cards": [
      { "front": "...", "back": "...", "is_ai_generated": true },
      ...
    ]
  }
  ```
- **Response:** `BatchCreateFlashcardsResponseDTO` (`{ ids: [...] }`)
- **Obsługa:** W hooku `saveBatch`. Sukces powinien wyświetlić Toast "Zapisano X fiszek" i wyczyścić stan do domyślnego.

## 8. Interakcje użytkownika

1. **Wpisanie notatki:** Użytkownik wkleja tekst. Przycisk "Generuj" aktywuje się po wpisaniu 10 znaków.
2. **Generowanie:** Kliknięcie blokuje interfejs, pokazuje loader.
3. **Sukces generowania:** Przejście do widoku kart.
4. **Edycja draftu:** Użytkownik klika w pole tekstowe na karcie, poprawia treść. Jeśli przekroczy limit znaków, pole podświetla się na czerwono.
5. **Usuwanie draftu:** Kliknięcie ikony kosza usuwa kartę z listy.
6. **Zapis:** Kliknięcie "Zapisz fiszki" wysyła request. Po sukcesie następuje przekierowanie.

## 9. Warunki i walidacja

Walidacja odbywa się na dwóch poziomach:

1. **Poziom InputStep:**
   - `noteContent.length >= 10`: Blokada przycisku Generuj.
   - `noteContent.length <= 20000`: Ostrzeżenie wizualne.

2. **Poziom DraftCard (ReviewStep):**
   - `front`: Niepuste, max 500 znaków.
   - `back`: Niepuste, max 1000 znaków.
   - **Wpływ na stan:** Przycisk "Zapisz fiszki" w `ReviewStep` powinien być zablokowany, jeśli którykolwiek z draftów zawiera błędy walidacji. Draft z przekroczoną liczbą znaków powinien podświetlić sie na czerwono.

## 10. Obsługa błędów

- **Timeout (504) / Zbyt długi czas:**
  - Jeśli request trwa > 120s (lub API zwróci timeout), wyświetl komunikat: "Generowanie trwało zbyt długo. Spróbuj z krótszym fragmentem tekstu."
  - Stan wraca do `input`, zachowując wpisany tekst.
- **Błąd walidacji API (422):**
  - Wyświetlenie komunikatu z błędem walidacji (np. "Tekst jest zbyt krótki").
- **Błąd serwera (500):**
  - Wyświetlenie ogólnego komunikatu "Wystąpił błąd podczas generowania. Spróbuj ponownie."
- **Błąd zapisu (Batch):**
  - Toast z błędem. Stan `review` pozostaje aktywny, aby użytkownik nie stracił pracy i mógł ponowić próbę.

## 11. Kroki implementacji

1. **Przygotowanie typów:** Utworzenie `src/components/ai/types.ts` z definicjami ViewModel.
2. **Implementacja Hooka:** Stworzenie `src/hooks/useGeneratorState.ts` z logiką stanu, `sessionStorage` i mockowanymi wywołaniami API.
3. **Komponenty UI - InputStep:** Implementacja widoku wejściowego z walidacją długości.
4. **Komponenty UI - LoadingStep:** Implementacja timera i spinnera.
5. **Komponenty UI - ReviewStep:**
   - Implementacja `DraftCard` z edycją.
   - Implementacja listy i przycisków akcji.
6. **Integracja API (Service):**
   - Dodanie metod do serwisu frontendowego do komunikacji z `/api/ai/generate` i `/api/flashcards/batch`.
7. **Złożenie całości:** Osadzenie komponentów w `AIGeneratorWizard` i podłączenie do strony Astro.
