# Dokument wymagań produktu (PRD) - 10xdevs Flashcards

## 1. Przegląd produktu

10xdevs Flashcards to aplikacja webowa służąca do efektywnej nauki metodą spaced repetition (powtórki w odstępach czasu). Głównym wyróżnikiem produktu jest integracja z generatywną sztuczną inteligencją (OpenAI), która automatyzuje proces tworzenia materiałów edukacyjnych. Zamiast ręcznego wpisywania pytań i odpowiedzi, użytkownik dostarcza notatki, a system generuje gotowe fiszki.

Aplikacja jest skierowana do studentów i osób uczących się, które chcą zminimalizować czas poświęcony na przygotowanie materiałów, a zmaksymalizować czas na samą naukę. Platforma działa w modelu webowym (desktop first), wykorzystując algorytm FSRS (Free Spaced Repetition Scheduler) do optymalizacji harmonogramu powtórek.

## 2. Problem użytkownika

Głównym problemem, który rozwiązuje aplikacja, jest wysoka bariera wejścia w korzystanie z systemów spaced repetition, wynikająca z czasochłonności tworzenia materiałów.

- Manualne tworzenie wysokiej jakości fiszek zajmuje więcej czasu niż sama nauka.
- Użytkownicy często rezygnują z systematycznych powtórek, ponieważ proces dodawania nowej wiedzy do systemu jest zbyt żmudny.
- Istniejące rozwiązania są albo zbyt skomplikowane w konfiguracji (np. Anki), albo nie oferują wystarczająco dobrej jakości generowania treści przez AI.
- Użytkownicy potrzebują kontroli nad treściami wygenerowanymi przez AI przed ich dodaniem do bazy wiedzy, aby uniknąć błędów merytorycznych (halucynacji).

## 3. Wymagania funkcjonalne

### 3.1. Uwierzytelnianie i Zarządzanie Kontem
- Rejestracja i logowanie przy użyciu adresu email i hasła (Supabase Auth).
- Sesja użytkownika utrzymywana po stronie klienta/serwera.
- Możliwość trwałego usunięcia konta wraz ze wszystkimi danymi (Hard Delete).
- Brak funkcji resetowania hasła przez email w MVP (obsługa ręczna przez administratora).

### 3.2. Generator AI
- Pole tekstowe przyjmujące dowolne notatki użytkownika (brak sztywnego limitu znaków wejściowych, limit logiczny wynikający z tokenów modelu).
- Wykorzystanie modelu gpt-4o-mini (poprzez API OpenRouter) do analizy tekstu i ekstrakcji pytań/odpowiedzi.
- Odpowiedź w formacie JSON walidowana schematem Zod.
- Przód wygenerowanej fiszki może mieć maksymalnie 500 znaków, tył wygenerowanej fiszki może mieć maksymalnie 1000 znaków.
- Tryb "Poczekalnia" (Draft Mode): Prezentacja wygenerowanych fiszek przed zapisaniem.
- Możliwość edycji treści (przód/tył) w trybie podglądu.
- Możliwość odrzucenia poszczególnych fiszek lub całego zestawu.
- Ograniczenie techniczne: Timeout requestu ustawiony na 2 minuty.

### 3.3. Zarządzanie Fiszkami (CRUD)
- Płaska struktura danych: Wszystkie fiszki trafiają do jednej wspólnej puli użytkownika (brak podziału na talie/kategorie w MVP).
- Widok listy wszystkich fiszek (MVP nie uwzględnia paginacji albo infinite scroll).
- Wyszukiwanie fiszek po frazie (przeszukiwanie treści pytań i odpowiedzi).
- Ręczne dodawanie pojedynczej fiszki.
- Edycja istniejącej fiszki (zmiana treści).
- Usuwanie pojedynczej fiszki.

### 3.4. System Nauki (Spaced Repetition)
- Implementacja algorytmu ts-fsrs do wyznaczania kolejnych powtórek (użycie biblioteki open source).
- Dashboard wyświetlający liczbę fiszek do powtórzenia na dziś.
- Przycisk "Rozpocznij naukę" aktywny tylko w przypadku dostępności fiszek na dany dzień.
- Interfejs nauki:
    - Wyświetlanie przodu fiszki (Pytanie).
    - Odsłonięcie tyłu fiszki (Odpowiedź) na kliknięcie/spację.
    - Ocenianie znajomości: Again (Powtórz), Hard (Trudne), Good (Dobre), Easy (Łatwe).
- Algorytm aktualizuje parametry fiszki (stability, difficulty, due_date) natychmiast po ocenie.

### 3.5. Interfejs Użytkownika
- Aplikacja typu Desktop Web (responsywna, ale zoptymalizowana pod myszkę/klawiaturę).
- Tryb jasny (Light Mode) jako jedyny dostępny motyw.
- Stylistyka oparta o komponenty Shadcn/ui i Tailwind CSS.

## 4. Granice produktu

### W ZAKRESIE (In Scope)
- Aplikacja webowa (Astro + React).
- Uwierzytelnianie email/hasło.
- Generator fiszek z tekstu (AI).
- Manualny CRUD fiszek.
- Algorytm powtórek FSRS (biblioteka open source [tf-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)).
- Obsługa błędów generowania i walidacji danych.

### POZA ZAKRESEM (Out of Scope)
- Aplikacja mobilna (iOS/Android).
- Logowanie przez dostawców tożsamości (Google, GitHub itp.).
- Resetowanie hasła (flow "zapomniałem hasła").
- Import plików (PDF, DOCX, obrazy).
- Organizacja fiszek w talie (Decks) lub tagi.
- Statystyki postępów nauki (wykresy).
- Współdzielenie fiszek z innymi użytkownikami.
- Tryb ciemny (Dark Mode).
- Obsługa obrazków w fiszkach.

## 5. Historyjki użytkowników

### Uwierzytelnianie i Bezpieczeństwo

ID: US-001
Tytuł: Rejestracja nowego użytkownika
Opis: Jako nowy użytkownik, chcę utworzyć konto podając email i hasło, aby móc zapisywać swoje fiszki.
Kryteria akceptacji:
- Użytkownik może wprowadzić email i hasło w formularzu rejestracji.
- System waliduje format adresu email i minimalną długość hasła (6 znaków).
- Po udanej rejestracji użytkownik jest automatycznie logowany i przekierowany do dashboardu.
- Próba rejestracji na istniejący email wyświetla czytelny komunikat błędu.

ID: US-002
Tytuł: Logowanie do systemu
Opis: Jako zarejestrowany użytkownik, chcę zalogować się na swoje konto, aby uzyskać dostęp do moich materiałów.
Kryteria akceptacji:
- Użytkownik może wprowadzić email i hasło.
- Błędne dane logowania skutkują komunikatem "Nieprawidłowy email lub hasło".
- Udane logowanie przekierowuje do dashboardu.

ID: US-003
Tytuł: Usunięcie konta
Opis: Jako użytkownik, chcę mieć możliwość trwałego usunięcia mojego konta i wszystkich danych, aby zrezygnować z usług serwisu.
Kryteria akceptacji:
- W ustawieniach konta dostępny jest przycisk "Usuń konto".
- System wymaga dodatkowego potwierdzenia decyzji (np. modal).
- Po potwierdzeniu, rekord użytkownika i wszystkie powiązane fiszki są trwale usuwane z bazy (hard delete).
- Użytkownik zostaje wylogowany i przekierowany na stronę główną.

### Generator AI

ID: US-004
Tytuł: Generowanie fiszek z notatek
Opis: Jako użytkownik, chcę wkleić tekst moich notatek, aby system automatycznie utworzył propozycje fiszek.
Kryteria akceptacji:
- Użytkownik widzi duże pole tekstowe na notatki.
- Po kliknięciu "Generuj", przycisk zostaje zablokowany i pojawia się wskaźnik ładowania.
- System wysyła zapytanie do API i przetwarza odpowiedź w tle.
- Jeśli generowanie trwa dłużej niż 2 minuty, wyświetlany jest komunikat o przekroczeniu czasu i prośba o spróbowanie z mniejszą porcją tekstu.

ID: US-005
Tytuł: Weryfikacja i edycja wygenerowanych fiszek (Poczekalnia)
Opis: Jako użytkownik, chcę przejrzeć i ewentualnie poprawić fiszki stworzone przez AI przed ich zapisaniem, aby uniknąć błędów.
Kryteria akceptacji:
- Po zakończeniu generowania, użytkownik widzi listę propozycji w trybie "Draft".
- Każda fiszka w drafcie ma edytowalne pola "Pytanie" i "Odpowiedź".
- Użytkownik może usunąć pojedynczą propozycję z listy draftów.
- Użytkownik może edytować treść propozycji.
- Przycisk "Zapisz wybrane" przenosi fiszki z draftu do głównej bazy danych.

### Zarządzanie Fiszkami

ID: US-006
Tytuł: Przeglądanie listy fiszek
Opis: Jako użytkownik, chcę widzieć listę wszystkich moich fiszek, aby móc nimi zarządzać.
Kryteria akceptacji:
- Dashboard lub dedykowana podstrona wyświetla tabelę/listę fiszek.
- Lista zawiera skrót pytania i odpowiedzi.

ID: US-007
Tytuł: Wyszukiwanie fiszek
Opis: Jako użytkownik, chcę wyszukać konkretną fiszkę po słowie kluczowym, aby szybko ją edytować.
Kryteria akceptacji:
- Nad listą fiszek znajduje się pole wyszukiwania.
- Wpisanie frazy filtruje listę w czasie rzeczywistym lub po zatwierdzeniu.
- Wyszukiwanie obejmuje zarówno treść pytań, jak i odpowiedzi.

ID: US-008
Tytuł: Manualne dodawanie fiszki
Opis: Jako użytkownik, chcę ręcznie dodać fiszkę, której AI nie wygenerowało lub która jest specyficzna.
Kryteria akceptacji:
- Dostępny jest formularz z polami "Przód" i "Tył".
- Obie wartości są wymagane.
- Po zapisaniu fiszka trafia do bazy z domyślnym stanem początkowym algorytmu FSRS.

ID: US-009
Tytuł: Edycja i usuwanie istniejącej fiszki
Opis: Jako użytkownik, chcę poprawić błąd w fiszce lub ją usunąć, jeśli jest już niepotrzebna.
Kryteria akceptacji:
- Przy każdej fiszce na liście są opcje "Edytuj" i "Usuń".
- Edycja otwiera formularz z obecną treścią i pozwala zapisać zmiany.
- Usunięcie wymaga potwierdzenia i trwale kasuje fiszkę.

### Sesja Nauki

ID: US-010
Tytuł: Rozpoczęcie sesji nauki
Opis: Jako użytkownik, chcę rozpocząć naukę tylko tych fiszek, które algorytm wyznaczył na dziś.
Kryteria akceptacji:
- Na dashboardzie widoczny jest licznik fiszek "Do powtórki" (Due).
- Przycisk "Rozpocznij naukę" jest aktywny tylko, gdy licznik > 0.
- Jeśli licznik = 0, wyświetlany jest komunikat "Wszystko na dziś zrobione!".

ID: US-011
Tytuł: Interakcja z fiszką (Przód/Tył)
Opis: Jako użytkownik, chcę widzieć najpierw przód, a potem tył, aby sprawdzić swoją wiedzę.
Kryteria akceptacji:
- W trybie nauki wyświetlany jest tylko przód.
- Kliknięcie w kartę odsłania tył (odwraca kartę).
- Po odsłonięciu tyłu pojawiają się przyciski oceny.

ID: US-012
Tytuł: Ocenianie fiszki
Opis: Jako użytkownik, chcę ocenić, jak łatwo poszło mi przypomnienie sobie odpowiedzi, aby algorytm zaplanował kolejną powtórkę.
Kryteria akceptacji:
- Dostępne są 4 oceny: Again (Nie pamiętam), Hard, Good, Easy.
- Wybranie oceny natychmiast przenosi do następnej fiszki w kolejce.
- Algorytm FSRS przelicza nową datę powtórki w oparciu o ocenę.
- Po przerobieniu wszystkich fiszek sesja kończy się podsumowaniem lub powrotem do dashboardu.

## 6. Metryki sukcesu

Aby uznać wdrożenie MVP za sukces, projekt musi spełnić następujące mierzalne wskaźniki:

1.  Wskaźnik adopcji AI
    - Definicja: Procent fiszek w bazie danych oznaczonych flagą `is_ai_generated` w stosunku do wszystkich fiszek.
    - Cel: Powyżej 75%.
    - Znaczenie: Potwierdza, że generator rozwiązuje główny problem (czasochłonność) i użytkownicy mu ufają.
