-- Migration: Disable All RLS Policies
-- Purpose: Drop all Row Level Security policies from all tables
-- Date: 2026-01-24
-- Tables Affected: public.profiles, public.flashcards, public.review_logs
-- WARNING: This will remove all access control policies, allowing unrestricted access to data

-- ============================================================================
-- Drop policies from public.profiles table
-- ============================================================================

-- Drop policy for viewing own profile
drop policy if exists "Users can view own profile" on public.profiles;

-- Drop policy for inserting own profile
drop policy if exists "Users can insert own profile" on public.profiles;

-- Drop policy for updating own profile
drop policy if exists "Users can update own profile" on public.profiles;

-- Drop policy for deleting own profile
drop policy if exists "Users can delete own profile" on public.profiles;

-- ============================================================================
-- Drop policies from public.flashcards table
-- ============================================================================

-- Drop policy for viewing own flashcards
drop policy if exists "Users can view own flashcards" on public.flashcards;

-- Drop policy for inserting own flashcards
drop policy if exists "Users can insert own flashcards" on public.flashcards;

-- Drop policy for updating own flashcards
drop policy if exists "Users can update own flashcards" on public.flashcards;

-- Drop policy for deleting own flashcards
drop policy if exists "Users can delete own flashcards" on public.flashcards;

-- ============================================================================
-- Drop policies from public.review_logs table
-- ============================================================================

-- Drop policy for viewing own review logs
drop policy if exists "Users can view own review logs" on public.review_logs;

-- Drop policy for inserting own review logs
drop policy if exists "Users can insert own review logs" on public.review_logs;

-- ============================================================================
-- Note: RLS is still ENABLED on all tables, but with no policies defined
-- This means NO access will be granted by default (deny-all)
-- To allow full access, you would also need to disable RLS with:
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.flashcards DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.review_logs DISABLE ROW LEVEL SECURITY;
-- ============================================================================
