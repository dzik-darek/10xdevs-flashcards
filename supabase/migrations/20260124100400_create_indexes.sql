-- Migration: Create Performance Indexes
-- Purpose: Optimize frequent queries for dashboard, search, and analytics
-- Date: 2026-01-24
-- Tables Affected: public.flashcards, public.review_logs

-- Index: Optimize dashboard queries (cards due for review today)
-- This composite index enables efficient filtering by user_id and due date
-- Used for: "Show me all cards due for review today"
create index idx_flashcards_user_due 
on public.flashcards (user_id, due);

-- Index: Enable full-text search across flashcard content
-- Uses trigram matching (pg_trgm) to support ILIKE and wildcard searches
-- Searches concatenated front and back text
-- Used for: "Search flashcards containing keyword X"
create index idx_flashcards_search 
on public.flashcards 
using gin ((front || ' ' || back) gin_trgm_ops);

-- Index: Optimize fetching review history for a specific card
-- Sorted by reviewed_at DESC for chronological display
-- Used for: "Show review history for this card"
create index idx_review_logs_card_reviewed 
on public.review_logs (card_id, reviewed_at desc);

-- Index: Optimize user-level analytics queries
-- Enables fast aggregations and time-series queries per user
-- Used for: Heat maps, streaks, daily review counts
create index idx_review_logs_user_reviewed 
on public.review_logs (user_id, reviewed_at desc);

-- Note: PostgreSQL automatically creates indexes for:
-- - PRIMARY KEY constraints (all tables)
-- - FOREIGN KEY constraints (Supabase default behavior)
