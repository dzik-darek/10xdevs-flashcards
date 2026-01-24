-- Migration: Create Flashcards Table
-- Purpose: Store user flashcards with FSRS algorithm parameters
-- Date: 2026-01-24
-- Tables Affected: public.flashcards (created)
-- Relationships: Many-to-One with public.profiles
-- Algorithm: FSRS (Free Spaced Repetition Scheduler)

-- Create flashcards table with FSRS parameters
-- This table stores flashcard content and all parameters required by the ts-fsrs library
create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  
  -- Flashcard content
  front text not null check (length(front) <= 500),
  back text not null check (length(back) <= 1000),
  is_ai_generated boolean not null default false,
  
  -- FSRS algorithm parameters
  -- These fields are used by the ts-fsrs library to calculate optimal review intervals
  due timestamptz not null default now(),
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  elapsed_days integer not null default 0,
  scheduled_days integer not null default 0,
  reps integer not null default 0,
  lapses integer not null default 0,
  
  -- State: 0=New, 1=Learning, 2=Review, 3=Relearning
  state smallint not null default 0 check (state >= 0 and state <= 3),
  
  -- Review tracking
  last_review timestamptz,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security on flashcards table
-- Ensures complete data isolation between users
alter table public.flashcards enable row level security;

-- RLS Policy: Allow users to view only their own flashcards
create policy "Users can view own flashcards"
on public.flashcards
for select
using (auth.uid() = user_id);

-- RLS Policy: Allow users to create flashcards assigned to themselves
-- WITH CHECK ensures user_id matches the authenticated user
create policy "Users can insert own flashcards"
on public.flashcards
for insert
with check (auth.uid() = user_id);

-- RLS Policy: Allow users to update only their own flashcards
-- Both USING and WITH CHECK prevent ownership transfer
create policy "Users can update own flashcards"
on public.flashcards
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- RLS Policy: Allow users to delete only their own flashcards
-- Deletion will cascade to review_logs table
create policy "Users can delete own flashcards"
on public.flashcards
for delete
using (auth.uid() = user_id);

-- Function: Automatically update updated_at timestamp
-- This function is triggered before any UPDATE operation on flashcards
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger: Update updated_at before each flashcard update
-- Ensures updated_at always reflects the last modification time
create trigger set_updated_at
  before update on public.flashcards
  for each row
  execute function public.update_updated_at_column();
