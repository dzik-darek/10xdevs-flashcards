/**
 * Review Service - Handles flashcard review logic with FSRS algorithm
 *
 * This service manages the core spaced repetition logic:
 * 1. Fetches current flashcard state from database
 * 2. Calculates new FSRS parameters based on user rating
 * 3. Updates flashcard with new parameters
 * 4. Logs review history for analytics
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../db/database.types";
import { FSRS, Rating, State, type Card, createEmptyCard } from "ts-fsrs";

import type { CreateReviewDTO, FlashcardDTO } from "../../types";

// ============================================================================
// Types
// ============================================================================

type SupabaseClientType = SupabaseClient<Database>;

// ============================================================================
// Constants
// ============================================================================

/**
 * Initialize FSRS algorithm with default parameters
 * The ts-fsrs library handles all the complexity of the spaced repetition algorithm
 */
const fsrs = new FSRS({});

// ============================================================================
// Service Implementation
// ============================================================================

/**
 * Processes a flashcard review - core function of the spaced repetition system
 *
 * Flow:
 * 1. Fetch current card state from database (with user_id verification)
 * 2. Convert DB representation to FSRS Card object
 * 3. Calculate new parameters using FSRS algorithm
 * 4. Update flashcard in database
 * 5. Insert review log entry for history/analytics
 *
 * @param supabase - Supabase client instance (from context.locals)
 * @param userId - ID of the authenticated user
 * @param dto - Review data (card_id, rating, optional duration)
 * @returns Updated flashcard with new FSRS parameters
 * @throws Error if card not found, unauthorized, or database error occurs
 */
export async function submitReview(
  supabase: SupabaseClientType,
  userId: string,
  dto: CreateReviewDTO
): Promise<FlashcardDTO> {
  const { card_id, rating, review_duration_ms } = dto;

  // ========================================================================
  // Step 1: Fetch Current Card State
  // ========================================================================

  // IMPORTANT: Include user_id filter for authorization
  // This prevents users from reviewing other users' cards
  const { data: currentCard, error: fetchError } = await supabase
    .from("flashcards")
    .select("*")
    .eq("id", card_id)
    .eq("user_id", userId) // Security: Only allow access to user's own cards
    .single();

  // Guard: Card not found or unauthorized
  if (fetchError || !currentCard) {
    if (fetchError?.code === "PGRST116") {
      // Supabase code for "no rows returned"
      throw new Error("Flashcard not found or you don't have access to it");
    }
    throw new Error(`Failed to fetch flashcard: ${fetchError?.message || "Unknown error"}`);
  }

  // ========================================================================
  // Step 2: Convert DB Representation to FSRS Card
  // ========================================================================

  const fsrsCard = convertDbCardToFsrsCard(currentCard);

  // ========================================================================
  // Step 3: Calculate New FSRS Parameters
  // ========================================================================

  const now = new Date();
  const fsrsRating = convertRatingToFsrsRating(rating);

  // Call FSRS algorithm - this returns a record with the new card state
  // The repeat() method returns an object with keys for each rating (Again, Hard, Good, Easy)
  const schedulingInfo = fsrs.repeat(fsrsCard, now);

  // Get the scheduling info for the user's rating
  // Access using bracket notation with Rating enum
  const recordLog =
    fsrsRating === Rating.Again
      ? schedulingInfo[Rating.Again]
      : fsrsRating === Rating.Hard
        ? schedulingInfo[Rating.Hard]
        : fsrsRating === Rating.Good
          ? schedulingInfo[Rating.Good]
          : schedulingInfo[Rating.Easy];

  // Extract the updated card
  const updatedFsrsCard = recordLog.card;

  // ========================================================================
  // Step 4: Update Flashcard in Database
  // ========================================================================

  const { data: updatedCard, error: updateError } = await supabase
    .from("flashcards")
    .update({
      // FSRS parameters
      state: updatedFsrsCard.state,
      difficulty: updatedFsrsCard.difficulty,
      stability: updatedFsrsCard.stability,
      due: updatedFsrsCard.due.toISOString(),
      elapsed_days: updatedFsrsCard.elapsed_days,
      scheduled_days: updatedFsrsCard.scheduled_days,
      reps: updatedFsrsCard.reps,
      lapses: updatedFsrsCard.lapses,
      last_review: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", card_id)
    .eq("user_id", userId) // Security: Double-check user ownership
    .select()
    .single();

  if (updateError || !updatedCard) {
    throw new Error(`Failed to update flashcard: ${updateError?.message || "Unknown error"}`);
  }

  // ========================================================================
  // Step 5: Insert Review Log Entry
  // ========================================================================

  // Log the review for history and analytics
  // We store the state BEFORE the update (from currentCard) to track transitions
  const { error: logError } = await supabase.from("review_logs").insert({
    card_id: card_id,
    user_id: userId,
    rating: rating,
    review_duration_ms: review_duration_ms ?? null,
    reviewed_at: now.toISOString(),
    // Snapshot of card state BEFORE this review
    state: currentCard.state,
    difficulty: currentCard.difficulty,
    stability: currentCard.stability,
    elapsed_days: currentCard.elapsed_days,
    scheduled_days: currentCard.scheduled_days,
    last_elapsed_days: recordLog.log.elapsed_days, // Time since last review
    due: currentCard.due,
  });

  if (logError) {
    // Log insertion failure should not block the main operation
    // The card update succeeded, so we return the updated card
    // but we should log this error for monitoring
    console.error("Failed to insert review log:", logError);
    // In production, you might want to:
    // - Send to error tracking service (Sentry, etc.)
    // - Retry the insert
    // - Queue for async retry
  }

  // ========================================================================
  // Step 6: Return Updated Card
  // ========================================================================

  return updatedCard;
}

// ============================================================================
// Helper Functions - DB <-> FSRS Conversion
// ============================================================================

/**
 * Converts database flashcard representation to FSRS Card object
 *
 * FSRS Card uses different property names and Date objects instead of ISO strings
 *
 * Note: learning_steps is not stored in DB (only needed during calculation),
 * so we use the default empty card to get the default value
 *
 * @param dbCard - Flashcard from database
 * @returns FSRS Card object ready for algorithm
 */
function convertDbCardToFsrsCard(dbCard: FlashcardDTO): Card {
  // Get default card to extract default learning_steps
  const defaultCard = createEmptyCard();

  return {
    due: new Date(dbCard.due),
    stability: dbCard.stability,
    difficulty: dbCard.difficulty,
    elapsed_days: dbCard.elapsed_days,
    scheduled_days: dbCard.scheduled_days,
    reps: dbCard.reps,
    lapses: dbCard.lapses,
    state: dbCard.state as State, // 0=New, 1=Learning, 2=Review, 3=Relearning
    last_review: dbCard.last_review ? new Date(dbCard.last_review) : undefined,
    learning_steps: defaultCard.learning_steps, // Use default value
  };
}

/**
 * Converts numeric rating (1-4) to FSRS Rating enum
 *
 * Rating values:
 * 1 = Again (forgot completely)
 * 2 = Hard (difficult to remember)
 * 3 = Good (remembered correctly)
 * 4 = Easy (remembered easily)
 *
 * @param rating - Numeric rating from user (1-4)
 * @returns FSRS Rating enum value
 */
function convertRatingToFsrsRating(rating: 1 | 2 | 3 | 4): Rating {
  switch (rating) {
    case 1:
      return Rating.Again;
    case 2:
      return Rating.Hard;
    case 3:
      return Rating.Good;
    case 4:
      return Rating.Easy;
    default:
      // This should never happen due to Zod validation, but TypeScript needs it
      throw new Error(`Invalid rating value: ${rating}`);
  }
}
