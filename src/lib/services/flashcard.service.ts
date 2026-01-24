/**
 * Flashcard Service - Handles flashcard CRUD operations
 *
 * This service manages flashcard creation, retrieval, and updates.
 * FSRS parameters are initialized with database defaults on creation.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../db/database.types";
import type { CreateFlashcardDTO, FlashcardDTO } from "../../types";

// ============================================================================
// Types
// ============================================================================

type SupabaseClientType = SupabaseClient<Database>;

// ============================================================================
// Service Implementation
// ============================================================================

/**
 * Creates a new flashcard for the authenticated user
 *
 * Flow:
 * 1. Validate input data (handled by Zod at endpoint level)
 * 2. Insert flashcard with user_id and provided content
 * 3. Database applies default FSRS parameters automatically
 * 4. Return created flashcard with all fields
 *
 * @param supabase - Supabase client instance (from context.locals)
 * @param userId - ID of the authenticated user
 * @param dto - Flashcard data (front, back, is_ai_generated)
 * @returns Created flashcard with all FSRS parameters
 * @throws Error if database insert fails
 */
export async function createFlashcard(
  supabase: SupabaseClientType,
  userId: string,
  dto: CreateFlashcardDTO
): Promise<FlashcardDTO> {
  const { front, back, is_ai_generated } = dto;

  // ========================================================================
  // Step 1: Insert Flashcard
  // ========================================================================

  // Insert with only required fields and user_id
  // Database will apply default values for FSRS parameters:
  // - state: 0 (New)
  // - difficulty: 0
  // - stability: 0
  // - due: NOW() (immediately available for study)
  // - elapsed_days: 0
  // - scheduled_days: 0
  // - reps: 0
  // - lapses: 0
  // - last_review: NULL
  const { data: createdCard, error: insertError } = await supabase
    .from("flashcards")
    .insert({
      user_id: userId,
      front: front,
      back: back,
      is_ai_generated: is_ai_generated,
    })
    .select()
    .single();

  // Guard: Check for insert errors
  if (insertError || !createdCard) {
    throw new Error(`Failed to create flashcard: ${insertError?.message || "Unknown error"}`);
  }

  // ========================================================================
  // Step 2: Return Created Flashcard
  // ========================================================================

  return createdCard;
}
