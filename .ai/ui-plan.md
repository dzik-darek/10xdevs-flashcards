# Architektura UI dla 10xdevs Flashcards

## 1. Przegląd struktury UI

Architektura interfejsu użytkownika opiera się na modelu **Hybrid Rendering** wykorzystującym framework **Astro** jako szkielet aplikacji (routing, layouty, SEO, szybki pierwszy render) oraz **React** w postaci "interaktywnych wysp" dla dynamicznych funkcjonalności (formularze, proces nauki, generator AI).

Projekt realizuje podejście **Desktop-First**, skupiając się na obsłudze za pomocą myszki i klawiatury. Stylistyka oparta jest na systemie **Shadcn/ui** oraz **Tailwind CSS** (tryb jasny).

### Główne założenia architektoniczne:
*   **Routing:** Oparty na plikach (Astro Pages).
*   **Ochrona tras:** Middleware po stronie serwera (Astro) weryfikujący sesję Supabase.
*   **Zarządzanie stanem:**
    *   **Serwerowy (Server State):** React Query (lub SWR) do pobierania danych z API (fiszki, statystyki).
    *   **Lokalny (Client State):** React `useState`/`useReducer` dla formularzy i interakcji UI.
    *   **Sesyjny (Persisted State):** `sessionStorage` do przechowywania wygenerowanych draftów fiszek (zapobieganie utracie danych przy odświeżeniu).
*   **Komunikacja z użytkownikiem:** Centralny system powiadomień (Toast) dla błędów i sukcesów.

---

## 2. Lista widoków

### A. Widoki Publiczne

#### 1. Logowanie
*   **Ścieżka:** `/login`
*   **Cel:** Umożliwienie dostępu zarejestrowanym użytkownikom.
*   **Kluczowe informacje:** Formularz logowania, link do rejestracji.
*   **Komponenty:** `LoginForm` (React Hook Form + Zod).
*   **UX/Bezpieczeństwo:** Walidacja formatu email, obsługa błędów autoryzacji (401), przekierowanie na Dashboard po sukcesie.

#### 2. Rejestracja
*   **Ścieżka:** `/register`
*   **Cel:** Założenie nowego konta.
*   **Kluczowe informacje:** Formularz (Email, Hasło, Potwierdź hasło).
*   **Komponenty:** `RegisterForm`.
*   **UX/Bezpieczeństwo:** Walidacja długości hasła (min. 6 znaków), sprawdzenie czy email istnieje (409), autologowanie po rejestracji.

### B. Widoki Prywatne (Chronione)

Wszystkie poniższe widoki wykorzystują wspólny `AppLayout` zawierający stały Sidebar.

#### 3. Dashboard (Strona Główna)
*   **Ścieżka:** `/`
*   **Cel:** Centrum dowodzenia i punkt wejścia do nauki.
*   **Kluczowe informacje:**
    *   Licznik fiszek do powtórki na dziś (Due Review).
    *   Licznik wszystkich fiszek w bazie.
    *   Stan "Zero Inbox" (jeśli brak powtórek).
    *   CTA do dodawania fiszek (jeśli baza pusta).
*   **Komponenty:** `ReviewCounter`, `StartStudyButton`, `EmptyStateWelcome`.
*   **UX:** Przycisk "Rozpocznij naukę" jest głównym elementem wzywającym do działania (Call to Action). Ukryty, gdy licznik = 0.

#### 4. Lista Fiszek
*   **Ścieżka:** `/flashcards`
*   **Cel:** Przeglądanie i zarządzanie bazą wiedzy (CRUD).
*   **Kluczowe informacje:** Tabela/Lista fiszek (Pytanie, Odpowiedź, Data powtórki).
*   **Komponenty:** `FlashcardList` (Interaktywna tabela React), `SearchInput` (Debounced), `EditFlashcardModal`.
*   **UX:** Ładowanie danych z wykorzystaniem Skeleton UI. Wyszukiwanie filtruje listę w czasie rzeczywistym. Edycja i usuwanie dostępne z poziomu wiersza tabeli.
*   **API:** `GET /api/flashcards?mode=all`

#### 5. Dodawanie Fiszki (Ręczne)
*   **Ścieżka:** `/flashcards/new`
*   **Cel:** Ręczne wprowadzenie specyficznej wiedzy.
*   **Kluczowe informacje:** Formularz (Przód - max 500 znaków, Tył - max 1000 znaków).
*   **Komponenty:** `CreateFlashcardForm`.
*   **UX:** Dwa przyciski akcji:
    1.  "Zapisz" -> wraca do listy.
    2.  "Zapisz i dodaj kolejną" -> czyści formularz, zostaje na stronie, pokazuje Toast sukcesu. Walidacja limitów znaków w czasie rzeczywistym.

#### 6. Generator AI
*   **Ścieżka:** `/ai/generate`
*   **Cel:** Tworzenie serii fiszek z notatek przy pomocy LLM.
*   **Kluczowe informacje:**
    *   Krok 1: Duże pole tekstowe na notatki.
    *   Krok 2: Ekran ładowania z animacją (oczekiwanie na LLM).
    *   Krok 3: "Poczekalnia" (Drafty) - lista wygenerowanych propozycji.
*   **Komponenty:** `AIGeneratorWizard` (Zarządza stanem kroków), `CircularProgressTimer` (odliczanie 120s), `DraftList` (Grid edytowalnych kart).
*   **UX:**
    *   Blokada przycisku "Generuj" dla zbyt krótkiego tekstu.
    *   Obsługa timeoutu (API limit 2 min).
    *   Ostrzeżenie przed opuszczeniem strony, jeśli są niezapisane drafty (`window.confirm`).
    *   Przechowywanie draftów w `sessionStorage`.

#### 7. Sesja Nauki
*   **Ścieżka:** `/study`
*   **Cel:** Wykonywanie powtórek metodą spaced repetition.
*   **Kluczowe informacje:**
    *   Aktualna karta (tylko Przód).
    *   Odsłonięta karta (Przód + Tył).
    *   Panel oceniania (Again, Hard, Good, Easy).
    *   Licznik postępu (np. 5/20).
*   **Komponenty:** `StudySession` (Komponent React przejmujący cały widok), `FlashcardDisplay`, `RatingControls`.
*   **UX:**
    *   **Optimistic UI:** Po kliknięciu oceny natychmiast pokazujemy kolejną kartę, request leci w tle.
    *   Obsługa wyłącznie myszką (duże przyciski).
    *   Po zakończeniu sesji ekran podsumowania z przyciskiem powrotu do Dashboardu.

#### 8. Ustawienia
*   **Ścieżka:** `/settings`
*   **Cel:** Zarządzanie kontem.
*   **Kluczowe informacje:** Adres email użytkownika (tylko do odczytu), sekcja "Strefa niebezpieczna".
*   **Komponenty:** `DeleteAccountSection`, `DestructiveConfirmDialog`.
*   **UX:** Usuwanie konta wymaga wpisania frazy potwierdzającej (Hard Delete).

---

## 3. Mapa podróży użytkownika (User Journey)

### Scenariusz A: Nauka (Główna pętla)
1.  Użytkownik loguje się i trafia na **Dashboard**.
2.  Widzi licznik "15 fiszek do powtórki". Przycisk "Rozpocznij naukę" jest aktywny.
3.  Klika "Rozpocznij naukę" -> Przejście do widoku **Sesja Nauki**.
4.  Widzi pytanie pierwszej fiszki. Myśli nad odpowiedzią.
5.  Klika w kartę lub przycisk "Pokaż odpowiedź".
6.  Karta "odwraca się", widać odpowiedź i przyciski ocen (Again/Hard/Good/Easy).
7.  Klika "Good".
8.  System natychmiast pokazuje pytanie kolejnej fiszki (Optimistic UI).
9.  Kroki 4-8 powtarzają się aż do wyczerpania kolejki.
10. Wyświetla się ekran "Gratulacje, to wszystko na teraz".
11. Użytkownik klika "Wróć do Dashboardu".

### Scenariusz B: Tworzenie materiałów z AI
1.  Użytkownik na Dashboardzie klika w Sidebarze "Generator AI".
2.  Wkleja notatki z wykładu do pola tekstowego.
3.  Klika "Generuj fiszki".
4.  Widzi animację postępu (trwa to ok. 30-60 sekund).
5.  Pojawia się widok "Poczekalnia" z siatką 10 wygenerowanych fiszek.
6.  Użytkownik przegląda fiszki. Zauważa błąd w jednej -> klika, poprawia treść inline.
7.  Jedna fiszka jest nieprzydatna -> klika ikonę kosza na karcie (usuwa ją z draftu).
8.  Klika główny przycisk "Zapisz 9 fiszek".
9.  System zapisuje fiszki w bazie (API batch) i czyści `sessionStorage`.
10. Przekierowanie do **Listy Fiszek** z komunikatem "Pomyślnie dodano 9 fiszek".

---

## 4. Układ i struktura nawigacji

### Globalny Layout (AppShell)
Strona podzielona jest na dwie główne sekcje:
1.  **Sidebar (Pasek boczny)** - lewa strona, stała szerokość (np. 250px), sticky.
2.  **Main Content (Obszar roboczy)** - prawa strona, scrollowalna.

### Menu Nawigacyjne (Sidebar)
*   **Nagłówek:** Logo "10xdevs Flashcards".
*   **Sekcja Główna:**
    *   `Dashboard` (Ikona Home)
*   **Sekcja Nauka:**
    *   `Moje Fiszki` (Ikona List) - prowadzi do `/flashcards`
    *   `Generator AI` (Ikona Sparkles) - prowadzi do `/ai/generate`
    *   `Dodaj ręcznie` (Ikona Plus) - prowadzi do `/flashcards/new`
*   **Sekcja Konto (dół paska):**
    *   `Ustawienia` (Ikona Settings)
    *   `Wyloguj` (Ikona LogOut)

### Nawigacja mobilna
*   W wersji MVP aplikacja nie wspiera dedykowanego widoku mobilnego (zgodnie z PRD), ale layout powinien być responsywny (Sidebar zwija się do ikony hamburgera lub znika na bardzo małych ekranach, zachowując minimalną użyteczność).

---

## 5. Kluczowe komponenty (Reusable UI)

Poniższe komponenty będą budowane w oparciu o **Shadcn/ui** i wykorzystywane w wielu miejscach:

1.  **`Card` (Panel):** Podstawowy kontener treści (używany w Dashboardzie, Formularzach, Poczekalni AI).
2.  **`Button`:** Warianty: `default` (akcje główne), `secondary` (anuluj), `destructive` (usuwanie), `ghost` (ikony w tabelach).
3.  **`DataTable`:** Komponent tabeli z obsługą ładowania (Skeletons) i pustych stanów.
4.  **`FlashcardPreview`:** Wizualna reprezentacja fiszki (używana w Generatorze AI i Sesji Nauki). Obsługuje stan "odwrócenia".
5.  **`Toaster`:** Globalny komponent powiadomień (prawy górny róg) wyświetlający sukcesy (zielony) i błędy (czerwony).
6.  **`Dialog` (Modal):** Używany do edycji fiszki, potwierdzania usunięcia i alertów krytycznych.
7.  **`Loader/Spinner`:** Wskaźnik ładowania dla operacji asynchronicznych.
8.  **`ProgressCircle`:** Specyficzny komponent dla generatora AI, wizualizujący upływ czasu (countdown).

---

## 6. Obsługa Błędów i Stanów Granicznych

*   **Błąd API (500):** Wyświetlenie Toasta "Wystąpił błąd serwera, spróbuj ponownie później". Aplikacja nie powinna się "wysypać" (Crash).
*   **Błąd Walidacji (422):** Podświetlenie pól formularza na czerwono + komunikat pod polem (React Hook Form).
*   **Brak sieci:** Jeśli użytkownik spróbuje zapisać dane offline, otrzyma komunikat o błędzie połączenia.
*   **Utrata sesji:** Automatyczne przekierowanie do `/login` przy próbie dostępu do chronionych zasobów (obsługa w interceptorze fetch/axios lub middleware).
