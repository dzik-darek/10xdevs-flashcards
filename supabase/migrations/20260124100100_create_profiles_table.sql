-- Migration: Create Profiles Table
-- Purpose: Extend auth.users with additional user profile information (first_name, surname)
-- Date: 2026-01-24
-- Tables Affected: public.profiles (created)
-- Relationships: 1:1 with auth.users

-- Create profiles table with 1:1 relationship to auth.users
-- This table stores extended user information beyond the default Supabase Auth fields
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name varchar(100) not null,
  surname varchar(100) not null,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security on profiles table
-- This ensures users can only access their own profile data
alter table public.profiles enable row level security;

-- RLS Policy: Allow users to view their own profile
-- Uses auth.uid() to match the authenticated user's ID
create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

-- RLS Policy: Allow users to insert their own profile
-- Typically triggered automatically after user registration
create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

-- RLS Policy: Allow users to update their own profile
-- Both USING and WITH CHECK ensure the user owns the profile before and after update
create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- RLS Policy: Allow users to delete their own profile
-- Enables hard delete functionality (will cascade to flashcards and review_logs)
create policy "Users can delete own profile"
on public.profiles
for delete
using (auth.uid() = id);

-- Function: Automatically create profile after user registration
-- This function extracts first_name and surname from auth.users.raw_user_meta_data
-- and creates a corresponding profile record
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, surname)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'surname', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: Execute handle_new_user() after new user registration
-- This ensures every new auth.users record gets a corresponding profiles record
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
