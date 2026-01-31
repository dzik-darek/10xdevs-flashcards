# Plan implementacji widoku Tworzenia Fiszki

## 1. Przegląd
Widok służy do ręcznego dodawania nowych fiszek do systemu przez użytkownika. Umożliwia wprowadzenie treści pytania ("Przód") i odpowiedzi ("Tył"), z walidacją długości tekstu w czasie rzeczywistym. Oferuje dwie ścieżki zapisu: zapis z powrotem do listy oraz zapis z wyczyszczeniem formularza w celu natychmiastowego dodania kolejnej fiszki.

## 2. Routing widoku
- **Ścieżka:** `/flashcards/new`
- **Plik Astro:** `src/pages/flashcards/new.astro`
- **Dostęp:** Tylko dla zalogowanych użytkowników (chronione przez middleware).

## 3. Struktura komponentów
```text
src/pages/flashcards/new.astro (Layout Wrapper)
└── CreateFlashcardForm.tsx (Główny komponent React)
    ├── Card (Shadcn UI - Kontener formularza)
    ├── Form (React Hook Form + Zod - Logika)
    │   ├── FormField (Front)
    │   │   ├── Textarea
    │   │   └── CharacterCounter
    │   └── FormField (Back)
    │       ├── Textarea
    │       └── CharacterCounter
    └── ButtonGroup
        ├── Button (Cancel - variant: outline)
        ├── Button (Save & Add Next - variant: secondary)
        └── Button (Save - variant: default)
```

## 4. Szczegóły komponentów

### `src/pages/flashcards/new.astro`
- **Opis:** Strona Astro renderująca layout aplikacji i osadzająca komponent formularza.
- **Główne elementy:** `<Layout>`, `<CreateFlashcardForm client:load />`.
- **Propsy:** Brak.

### `src/components/flashcards/CreateFlashcardForm.tsx`
- **Opis:** Interaktywny formularz React obsługujący wprowadzanie danych, walidację i komunikację z API.
- **Biblioteki:** `react-hook-form`, `zod`, `sonner` (do powiadomień).
- **Główne elementy:**
    - `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter` (struktura).
    - `Form`, `FormControl`, `FormField`, `FormItem`, `FormLabel`, `FormMessage` (obsługa formularza).
    - `Textarea` (pola tekstowe).
- **Obsługiwane interakcje:**
    - Wpisanie tekstu: Aktualizacja stanu i licznika znaków.
    - Kliknięcie "Anuluj": Przekierowanie do `/flashcards`.
    - Kliknięcie "Zapisz": Walidacja -> API -> Przekierowanie do `/flashcards`.
    - Kliknięcie "Zapisz i dodaj kolejną": Walidacja -> API -> Toast "Sukces" -> Reset formularza -> Focus na pole "Przód".
- **Obsługiwana walidacja:**
    - **Front:** Wymagane, min 1 znak, max 500 znaków.
    - **Back:** Wymagane, min 1 znak, max 1000 znaków.
- **Typy:** `CreateFlashcardDTO` (jako input), `CreateFlashcardFormValues` (wewnętrzny typ formularza).
- **Propsy:** Brak.

## 5. Typy

### `CreateFlashcardFormValues`
Model danych używany przez `react-hook-form`.
```typescript
{
  front: string;
  back: string;
}
```

Wykorzystane zostaną istniejące typy z `src/types.ts`:
- `VALIDATION_CONSTRAINTS` - do ustawienia limitów w schemacie Zod i UI.
- `CreateFlashcardDTO` - do wysłania danych do API (pole `is_ai_generated` ustawione na `false`).
- `ApiSuccessResponse` - do typowania odpowiedzi.

## 6. Zarządzanie stanem
Stan formularza będzie zarządzany przez bibliotekę **React Hook Form** (`useForm`).
- **Wartości:** `front`, `back`.
- **Status:** `isSubmitting`, `isValid`, `errors`.
- **Lokalny stan:** Brak dodatkowego stanu React (chyba że potrzebny do obsługi logiki "który przycisk kliknięto", chociaż można to rozwiązać handlerami).

## 7. Integracja API

**Endpoint:** `POST /api/flashcards`

**Żądanie:**
```typescript
// Headers: Content-Type: application/json
{
  front: string;
  back: string;
  is_ai_generated: false;
}
```

**Odpowiedź Sukcesu (201):**
```typescript
{
  data: FlashcardDTO
}
```

**Odpowiedź Błędu (400/500):**
```typescript
{
  error: string;
  details?: Record<string, string[]>; // błędy walidacji
}
```

## 8. Interakcje użytkownika

1.  **Wejście na stronę:** Użytkownik widzi pusty formularz.
2.  **Wprowadzanie danych:**
    -   Użytkownik wpisuje pytanie w pole "Przód". Licznik znaków pola "Przód" aktualizuje się (np. "45/500").
    -   Użytkownik wpisuje pytanie w pole "Tył". Licznik znaków pola "Tył" aktualizuje się (np. "45/500").
    -   Jeśli przekroczy limit pola "Przód" lub "Tył", licznik danego pola zmienia kolor na czerwony, a formularz blokuje submit (lub Zod zwraca błąd).
3.  **Zapisz (Standardowy):**
    -   Użytkownik klika "Zapisz".
    -   Przyciski zostają zablokowane (`disabled`).
    -   Po sukcesie następuje przekierowanie `window.location.href = '/flashcards'`.
4.  **Zapisz i dodaj kolejną:**
    -   Użytkownik klika "Zapisz i dodaj kolejną".
    -   Przyciski zablokowane.
    -   Po sukcesie:
        -   Pojawia się powiadomienie (Toast) "Fiszka została dodana".
        -   Formularz jest czyszczony (`form.reset()`).
        -   Przyciski odblokowane.
5.  **Anuluj:**
    -   Kliknięcie przenosi użytkownika z powrotem do listy fiszek (`/flashcards`) bez zapisywania.

## 9. Warunki i walidacja

Schemat walidacji Zod (klient):
```typescript
const formSchema = z.object({
  front: z.string()
    .min(1, "Treść pytania jest wymagana")
    .max(VALIDATION_CONSTRAINTS.flashcard.front.max, "Przekroczono limit znaków"),
  back: z.string()
    .min(1, "Treść odpowiedzi jest wymagana")
    .max(VALIDATION_CONSTRAINTS.flashcard.back.max, "Przekroczono limit znaków"),
});
```
Walidacja następuje w momencie submitu (lub `onChange`/`onBlur` w zależności od konfiguracji `mode` w hook form - zalecane `onChange` dla feedbacku o limitach).

## 10. Obsługa błędów

- **Błędy walidacji formularza:** Wyświetlane bezpośrednio pod polami input (`FormMessage` z Shadcn).
- **Błędy API (400):** Jeśli serwer odrzuci dane (np. mimo walidacji po stronie klienta), wyświetl ogólny Toast z błędem lub przypisz błędy do konkretnych pól formularza (`form.setError`).
- **Błędy serwera/sieci (500/Network):** Wyświetl Toast z komunikatem "Nie udało się zapisać fiszki. Spróbuj ponownie później." (`sonner`).

## 11. Kroki implementacji

1.  **Stworzenie komponentu formularza:** Utwórz plik `src/components/flashcards/CreateFlashcardForm.tsx`.
    -   Zaimplementuj UI przy użyciu komponentów Shadcn (`Card`, `Form`, `Textarea`, `Button`).
    -   Skonfiguruj `react-hook-form` z `zodResolver`.
    -   Dodaj liczniki znaków korzystając z `VALIDATION_CONSTRAINTS`.
2.  **Obsługa API:** Zaimplementuj funkcję `onSubmit` wewnątrz komponentu.
    -   Dodaj logikę rozróżniającą akcję "Zapisz" od "Zapisz i dodaj kolejną" (np. dwa osobne handlery wywołujące tę samą funkcję save z flagą).
    -   Dodaj obsługę `fetch` do `/api/flashcards`.
    -   Podepnij `toast` z `sonner` do obsługi sukcesu i błędów.
3.  **Stworzenie strony Astro:** Utwórz plik `src/pages/flashcards/new.astro`.
    -   Zaimportuj `Layout` i `CreateFlashcardForm`.
    -   Ustaw odpowiedni tytuł strony.
