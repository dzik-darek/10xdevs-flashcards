-- Migration: Create Review Logs Table
-- Purpose: Append-only log of all flashcard reviews for analytics and history
-- Date: 2026-01-24
-- Tables Affected: public.review_logs (created)
-- Relationships: Many-to-One with public.flashcards, Many-to-One with public.profiles
-- Special: user_id is denormalized for query performance

-- Create review_logs table (append-only)
-- This table stores a snapshot of flashcard state and user response for each review
-- Data is immutable (no UPDATE/DELETE except CASCADE) to maintain audit trail
create table public.review_logs (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.flashcards(id) on delete cascade,
  
  -- Denormalized user_id for faster analytics queries (avoids JOIN with flashcards)
  user_id uuid not null references public.profiles(id) on delete cascade,
  
  -- User rating: 1=Again, 2=Hard, 3=Good, 4=Easy
  rating smallint not null check (rating >= 1 and rating <= 4),
  
  -- Snapshot of card state BEFORE applying the rating
  -- These values represent the card's state at review time
  state smallint not null check (state >= 0 and state <= 3),
  due timestamptz not null,
  stability double precision not null,
  difficulty double precision not null,
  elapsed_days integer not null,
  last_elapsed_days integer not null,
  scheduled_days integer not null,
  
  -- Optional: Time spent reviewing (in milliseconds)
  review_duration_ms integer,
  
  -- Timestamp of when the review occurred
  reviewed_at timestamptz not null default now()
);

-- Enable Row Level Security on review_logs table
-- Ensures users can only access their own review history
alter table public.review_logs enable row level security;

-- RLS Policy: Allow users to view only their own review logs
create policy "Users can view own review logs"
on public.review_logs
for select
using (auth.uid() = user_id);

-- RLS Policy: Allow users to insert their own review logs
-- This is the only write operation allowed (append-only table)
create policy "Users can insert own review logs"
on public.review_logs
for insert
with check (auth.uid() = user_id);

-- Note: No UPDATE or DELETE policies are defined
-- This table is append-only by design (except for CASCADE deletes from parent tables)
