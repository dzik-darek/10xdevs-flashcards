# Schemat Bazy Danych - 10xdevs Flashcards

## 1. Tabele

### 1.1. `public.profiles`

Tabela rozszerzająca dane użytkownika z `auth.users` (Supabase Auth). Relacja 1:1.

| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| `id` | `UUID` | `PRIMARY KEY`, `REFERENCES auth.users(id) ON DELETE CASCADE` | Identyfikator użytkownika (ten sam co w auth.users) |
| `first_name` | `VARCHAR(100)` | `NOT NULL` | Imię użytkownika |
| `surname` | `VARCHAR(100)` | `NOT NULL` | Nazwisko użytkownika |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Data utworzenia profilu |

**Uwagi:**
- Klucz główny `id` jest jednocześnie kluczem obcym do `auth.users(id)`.
- `ON DELETE CASCADE` zapewnia automatyczne usunięcie profilu przy usunięciu konta w Supabase Auth.

---

### 1.2. `public.flashcards`

Główna tabela przechowująca fiszki użytkowników wraz z parametrami algorytmu FSRS.

| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unikalny identyfikator fiszki |
| `user_id` | `UUID` | `NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE` | Właściciel fiszki |
| `front` | `TEXT` | `NOT NULL CHECK (length(front) <= 500)` | Przód fiszki (pytanie), max 500 znaków |
| `back` | `TEXT` | `NOT NULL CHECK (length(back) <= 1000)` | Tył fiszki (odpowiedź), max 1000 znaków |
| `is_ai_generated` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Czy fiszka została wygenerowana przez AI |
| `due` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Data następnej powtórki |
| `stability` | `DOUBLE PRECISION` | `NOT NULL DEFAULT 0` | Stabilność pamięci (FSRS) |
| `difficulty` | `DOUBLE PRECISION` | `NOT NULL DEFAULT 0` | Trudność fiszki (FSRS) |
| `elapsed_days` | `INTEGER` | `NOT NULL DEFAULT 0` | Dni od ostatniej powtórki (FSRS) |
| `scheduled_days` | `INTEGER` | `NOT NULL DEFAULT 0` | Zaplanowane dni do następnej powtórki (FSRS) |
| `reps` | `INTEGER` | `NOT NULL DEFAULT 0` | Liczba powtórek (FSRS) |
| `lapses` | `INTEGER` | `NOT NULL DEFAULT 0` | Liczba niepowodzeń (FSRS) |
| `state` | `SMALLINT` | `NOT NULL DEFAULT 0 CHECK (state >= 0 AND state <= 3)` | Stan fiszki: 0-New, 1-Learning, 2-Review, 3-Relearning (FSRS) |
| `last_review` | `TIMESTAMPTZ` | `NULL` | Data ostatniej powtórki |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Data utworzenia fiszki |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Data ostatniej modyfikacji |

**Uwagi:**
- Pola FSRS używają typów zgodnych z biblioteką `ts-fsrs` (JavaScript/TypeScript).
- `DOUBLE PRECISION` zapewnia precyzję liczb zmiennoprzecinkowych zgodną z IEEE 754 (64-bit).
- `state` jako `SMALLINT` z `CHECK` zamiast ENUM dla uproszczenia MVP.
- Wartości domyślne ustawione tak, aby nowe fiszki były dostępne natychmiast (due=NOW(), state=0).
- `ON DELETE CASCADE` automatycznie usuwa fiszki przy usunięciu profilu użytkownika.

---

### 1.3. `public.review_logs`

Tabela append-only przechowująca historię wszystkich powtórek. Umożliwia przyszłą analitykę (poza zakresem MVP).

| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unikalny identyfikator logu |
| `card_id` | `UUID` | `NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE` | Odniesienie do fiszki |
| `user_id` | `UUID` | `NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE` | Właściciel fiszki (denormalizacja dla wydajności) |
| `rating` | `SMALLINT` | `NOT NULL CHECK (rating >= 1 AND rating <= 4)` | Ocena: 1-Again, 2-Hard, 3-Good, 4-Easy |
| `state` | `SMALLINT` | `NOT NULL CHECK (state >= 0 AND state <= 3)` | Stan fiszki w momencie powtórki |
| `due` | `TIMESTAMPTZ` | `NOT NULL` | Scheduled date przed powtórką |
| `stability` | `DOUBLE PRECISION` | `NOT NULL` | Stabilność przed powtórką |
| `difficulty` | `DOUBLE PRECISION` | `NOT NULL` | Trudność przed powtórką |
| `elapsed_days` | `INTEGER` | `NOT NULL` | Dni, które upłynęły od ostatniej powtórki |
| `last_elapsed_days` | `INTEGER` | `NOT NULL` | Poprzednia wartość elapsed_days (FSRS) |
| `scheduled_days` | `INTEGER` | `NOT NULL` | Zaplanowana liczba dni do następnej powtórki |
| `review_duration_ms` | `INTEGER` | `NULL` | Czas spędzony na powtórce (milisekundy, opcjonalne) |
| `reviewed_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Timestamp wykonania powtórki |

**Uwagi:**
- Tabela tylko do zapisu (INSERT), bez UPDATE ani DELETE (z wyjątkiem kaskadowego usuwania).
- `user_id` jest zdenormalizowane dla szybszych zapytań analitycznych w przyszłości.
- `rating` mapuje się na przyciski interfejsu: Again(1), Hard(2), Good(3), Easy(4).
- Pola `stability`, `difficulty` itp. przechowują stan **przed** zastosowaniem ratingu (snapshot).

---

## 2. Relacje

### 2.1. `auth.users` ← 1:1 → `public.profiles`
- Każdy użytkownik w `auth.users` ma dokładnie jeden profil w `public.profiles`.
- Klucz główny w `profiles` (`id`) jest jednocześnie kluczem obcym do `auth.users(id)`.
- `ON DELETE CASCADE` - usunięcie użytkownika w Supabase Auth usuwa profil.

### 2.2. `public.profiles` ← 1:N → `public.flashcards`
- Jeden użytkownik może mieć wiele fiszek.
- `flashcards.user_id` → `profiles.id`
- `ON DELETE CASCADE` - usunięcie profilu usuwa wszystkie fiszki użytkownika.

### 2.3. `public.flashcards` ← 1:N → `public.review_logs`
- Jedna fiszka może mieć wiele logów powtórek.
- `review_logs.card_id` → `flashcards.id`
- `ON DELETE CASCADE` - usunięcie fiszki usuwa jej historię.

### 2.4. `public.profiles` ← 1:N → `public.review_logs`
- Jeden użytkownik może mieć wiele logów (zdenormalizowane dla wydajności).
- `review_logs.user_id` → `profiles.id`
- `ON DELETE CASCADE` - usunięcie profilu usuwa wszystkie logi użytkownika.

---

## 3. Indeksy

### 3.1. Indeksy Wydajnościowe

#### `idx_flashcards_user_due`
```sql
CREATE INDEX idx_flashcards_user_due 
ON public.flashcards (user_id, due);
```
**Cel:** Optymalizacja zapytań dashboardu (liczba fiszek do powtórki na dziś). Indeks B-Tree pozwala na szybkie filtrowanie po `user_id` i sortowanie/filtrowanie po `due`.

#### `idx_flashcards_search`
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_flashcards_search 
ON public.flashcards 
USING GIN ((front || ' ' || back) gin_trgm_ops);
```
**Cel:** Pełnotekstowe wyszukiwanie w treści fiszek (front + back). Indeks GIN z rozszerzeniem `pg_trgm` wspiera operacje `ILIKE` i `%` (wildcards).

#### `idx_review_logs_card_reviewed`
```sql
CREATE INDEX idx_review_logs_card_reviewed 
ON public.review_logs (card_id, reviewed_at DESC);
```
**Cel:** Szybkie pobieranie historii powtórek dla konkretnej fiszki (przydatne w przyszłych statystykach).

#### `idx_review_logs_user_reviewed`
```sql
CREATE INDEX idx_review_logs_user_reviewed 
ON public.review_logs (user_id, reviewed_at DESC);
```
**Cel:** Analityka per użytkownik (heat mapy, streaki itp.) - poza zakresem MVP, ale przygotowanie na przyszłość.

---

### 3.2. Indeksy Automatyczne (Klucze Główne i Obce)

PostgreSQL automatycznie tworzy indeksy dla:
- `PRIMARY KEY` na wszystkich tabelach (`id`)
- `FOREIGN KEY` - Supabase/PostgreSQL domyślnie indeksuje klucze obce

---

## 4. Row Level Security (RLS)

Wszystkie tabele w schemacie `public` mają włączony RLS, aby zapewnić izolację danych między użytkownikami.

### 4.1. `public.profiles`

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Użytkownik może odczytać tylko swój profil
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Użytkownik może zaktualizować tylko swój profil
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Tworzenie profilu (zazwyczaj przez trigger po rejestracji)
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Usuwanie profilu (Hard Delete)
CREATE POLICY "Users can delete own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = id);
```

---

### 4.2. `public.flashcards`

```sql
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

-- Użytkownik widzi tylko swoje fiszki
CREATE POLICY "Users can view own flashcards" 
ON public.flashcards 
FOR SELECT 
USING (auth.uid() = user_id);

-- Użytkownik może tworzyć tylko fiszki przypisane do siebie
CREATE POLICY "Users can insert own flashcards" 
ON public.flashcards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Użytkownik może edytować tylko swoje fiszki
CREATE POLICY "Users can update own flashcards" 
ON public.flashcards 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Użytkownik może usuwać tylko swoje fiszki
CREATE POLICY "Users can delete own flashcards" 
ON public.flashcards 
FOR DELETE 
USING (auth.uid() = user_id);
```

---

### 4.3. `public.review_logs`

```sql
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;

-- Użytkownik widzi tylko swoje logi
CREATE POLICY "Users can view own review logs" 
ON public.review_logs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Użytkownik może dodawać tylko własne logi
CREATE POLICY "Users can insert own review logs" 
ON public.review_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Brak możliwości UPDATE/DELETE (append-only, z wyjątkiem CASCADE)
```

---

## 5. Triggery i Funkcje Pomocnicze

### 5.1. Automatyczne Tworzenie Profilu po Rejestracji

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, surname)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'surname', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Cel:** Automatyczne utworzenie rekordu w `public.profiles` po rejestracji użytkownika w Supabase Auth.

---

### 5.2. Automatyczna Aktualizacja `updated_at` dla Fiszek

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.flashcards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

**Cel:** Automatyczne ustawienie `updated_at` przy każdej modyfikacji fiszki.

---

## 6. Rozszerzenia PostgreSQL

### 6.1. `uuid-ossp` lub `pgcrypto`
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```
**Cel:** Generowanie UUID (`gen_random_uuid()`).

### 6.2. `pg_trgm`
```sql
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```
**Cel:** Obsługa trigramów dla pełnotekstowego wyszukiwania (`ILIKE`, `%`).

---

## 7. Dodatkowe Uwagi i Decyzje Projektowe

### 7.1. Obsługa Draftów
- **Decyzja:** Fiszki wygenerowane przez AI w trybie "Poczekalnia" (Draft Mode) **nie są zapisywane do bazy danych**.
- Drafty są przechowywane w pamięci klienta (React state) do momentu zatwierdzenia przez użytkownika.
- Po zatwierdzeniu, fiszki są wstawiane do `public.flashcards` z flagą `is_ai_generated = TRUE`.
- Eliminuje to potrzebę kolumny `status` i upraszcza schemat.

### 7.2. Płaska Struktura (Brak Talii/Tagów)
- **Decyzja:** MVP nie wspiera organizacji fiszek w talie (decks) ani tagów.
- Wszystkie fiszki użytkownika są w jednej wspólnej puli.
- Przyszłe rozszerzenie: Dodanie tabeli `decks` i tabeli łączącej `deck_flashcards` (Many-to-Many).

### 7.3. Typy Danych dla FSRS
- **Decyzja:** Typy dobrano na podstawie specyfikacji biblioteki `ts-fsrs`:
  - `stability`, `difficulty` → `DOUBLE PRECISION` (64-bit float, zgodny z JavaScript `number`)
  - Liczniki (`reps`, `lapses`, `elapsed_days`, `scheduled_days`) → `INTEGER`
  - Daty (`due`, `last_review`, `reviewed_at`) → `TIMESTAMPTZ` (z timezone)
  - Stany/Oceny → `SMALLINT` z `CHECK` (zamiast ENUM dla uproszczenia)

### 7.4. Normalizacja
- Schemat jest w **3NF** (Third Normal Form) z jednym wyjątkiem:
  - `review_logs.user_id` jest zdenormalizowane (można wyprowadzić z `flashcards.user_id`).
  - **Uzasadnienie:** Wydajność zapytań analitycznych w przyszłości (zapytania na `review_logs` bez JOIN z `flashcards`).

### 7.5. Bezpieczeństwo
- **RLS (Row Level Security)** jest włączony na wszystkich tabelach `public.*`.
- Użytkownicy mają dostęp **wyłącznie** do swoich danych (`auth.uid() = user_id`).
- Klucze obce z `ON DELETE CASCADE` zapewniają **Hard Delete** - usunięcie konta usuwa wszystkie powiązane dane.

### 7.6. Limity i Ograniczenia
- **Limity treści:** `front` (500 znaków), `back` (1000 znaków) wymuszane przez `CHECK` constraints.
- **Timeout:** API endpoint do generowania AI ma timeout 2 minuty (obsługiwany na poziomie aplikacji, nie bazy).

### 7.7. Skalowalność
- Indeksy zostały dobrane pod kątem najczęstszych zapytań (dashboard, wyszukiwanie).
- Tabela `review_logs` jest append-only, co umożliwia łatwe archiwizowanie/partycjonowanie w przyszłości.
- Brak kolumn `JSONB` ani relacji Many-to-Many upraszcza schemat i redukuje ryzyko problemów z wydajnością w MVP.

### 7.8. Migracje
- Schemat powinien być wdrożony jako seria migracji (Supabase Migrations).
- Kolejność tworzenia:
  1. Rozszerzenia (`pgcrypto`, `pg_trgm`)
  2. Tabela `profiles`
  3. Tabela `flashcards`
  4. Tabela `review_logs`
  5. Indeksy
  6. Polityki RLS
  7. Triggery i funkcje

---

## 8. Przykładowe Wartości Domyślne (Nowa Fiszka)

Gdy użytkownik ręcznie tworzy nową fiszkę lub zatwierdza fiszkę z draftu AI:

```sql
INSERT INTO public.flashcards (user_id, front, back, is_ai_generated)
VALUES (
  'uuid-użytkownika',
  'Jakie są zasady SOLID?',
  'Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion',
  TRUE
);
```

Automatyczne wartości:
- `id` → `gen_random_uuid()`
- `due` → `NOW()` (dostępna natychmiast)
- `stability` → `0`
- `difficulty` → `0`
- `elapsed_days` → `0`
- `scheduled_days` → `0`
- `reps` → `0`
- `lapses` → `0`
- `state` → `0` (New)
- `last_review` → `NULL`
- `created_at` → `NOW()`
- `updated_at` → `NOW()`

---

## 9. Mapowanie Stanów FSRS

### 9.1. Stan Fiszki (`state`)
| Wartość | Nazwa | Opis |
|---------|-------|------|
| `0` | New | Nowa fiszka, nigdy nie przerabiana |
| `1` | Learning | W trakcie początkowej nauki |
| `2` | Review | W regularnych powtórkach |
| `3` | Relearning | Ponowna nauka po niepowodzeniu |

### 9.2. Ocena Powtórki (`rating` w review_logs)
| Wartość | Przycisk | Znaczenie |
|---------|----------|-----------|
| `1` | Again | Nie pamiętam (niepowodzenie) |
| `2` | Hard | Trudne (pamiętam, ale z wysiłkiem) |
| `3` | Good | Dobre (normalnie przypomniałem) |
| `4` | Easy | Łatwe (bardzo łatwo) |

---
