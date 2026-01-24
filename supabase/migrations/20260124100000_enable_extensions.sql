-- Migration: Enable Required PostgreSQL Extensions
-- Purpose: Enable pgcrypto for UUID generation and pg_trgm for full-text search
-- Date: 2026-01-24
-- Tables Affected: None (system-level extensions)

-- Enable pgcrypto extension for gen_random_uuid() function
-- This extension provides cryptographic functions including UUID generation
create extension if not exists "pgcrypto";

-- Enable pg_trgm extension for trigram-based text search
-- This extension enables ILIKE and wildcard search optimization using GIN indexes
create extension if not exists "pg_trgm";
