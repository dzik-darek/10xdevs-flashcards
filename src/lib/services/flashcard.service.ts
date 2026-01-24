/**
 * Flashcard Service - Handles flashcard CRUD operations
 *
 * This service manages flashcard creation, retrieval, and updates.
 * FSRS parameters are initialized with database defaults on creation.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../db/database.types";
import type { CreateFlashcardDTO, FlashcardDTO, BatchCreateFlashcardsResponseDTO } from "../../types";

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

/**
 * Creates multiple flashcards in a single batch operation
 *
 * Flow:
 * 1. Validate input (handled by Zod at endpoint level)
 * 2. Prepare array of flashcard objects with user_id
 * 3. Perform single bulk insert into database
 * 4. Database applies default FSRS parameters automatically for all cards
 * 5. Return array of created flashcard IDs
 *
 * @param supabase - Supabase client instance (from context.locals)
 * @param userId - ID of the authenticated user
 * @param cards - Array of flashcard data (1-100 items)
 * @returns Array of created flashcard IDs in same order as input
 * @throws Error if database insert fails or if input array is empty/too large
 */
export async function createFlashcardBatch(
  supabase: SupabaseClientType,
  userId: string,
  cards: CreateFlashcardDTO[]
): Promise<BatchCreateFlashcardsResponseDTO> {
  // ========================================================================
  // Step 1: Prepare Batch Insert Data
  // ========================================================================

  // Map cards to database insert format with user_id
  const cardsToInsert = cards.map((card) => ({
    user_id: userId,
    front: card.front,
    back: card.back,
    is_ai_generated: card.is_ai_generated,
  }));

  // ========================================================================
  // Step 2: Perform Bulk Insert
  // ========================================================================

  // Single insert query for all cards
  // Database will apply default values for FSRS parameters for each card:
  // - state: 0 (New)
  // - difficulty: 0
  // - stability: 0
  // - due: NOW() (immediately available for study)
  // - elapsed_days: 0
  // - scheduled_days: 0
  // - reps: 0
  // - lapses: 0
  // - last_review: NULL
  const { data: createdCards, error: insertError } = await supabase
    .from("flashcards")
    .insert(cardsToInsert)
    .select("id");

  // Guard: Check for insert errors
  if (insertError || !createdCards) {
    throw new Error(`Failed to create flashcards: ${insertError?.message || "Unknown error"}`);
  }

  // ========================================================================
  // Step 3: Return Created Flashcard IDs
  // ========================================================================

  // Extract IDs in same order as input
  const ids = createdCards.map((card) => card.id);

  return { ids };
}
