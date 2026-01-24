/**
 * Shared types for backend and frontend (Entities, DTOs, Command Models)
 *
 * This file contains all Data Transfer Objects (DTOs) and Command Models
 * used in the API, derived from the database schema types.
 */

import type { Database } from "./db/database.types";

// ============================================================================
// Database Entity Aliases
// ============================================================================

/**
 * Flashcard entity - complete representation from database
 * Used in API responses that return full flashcard data
 */
export type FlashcardDTO = Database["public"]["Tables"]["flashcards"]["Row"];

/**
 * Profile entity - user profile information
 */
export type ProfileDTO = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Review Log entity - historical record of a flashcard review
 */
export type ReviewLogDTO = Database["public"]["Tables"]["review_logs"]["Row"];

// ============================================================================
// FSRS Constants & Utility Types
// ============================================================================

/**
 * Rating values for FSRS algorithm
 * 1 = Again (forgot), 2 = Hard, 3 = Good, 4 = Easy
 */
export type Rating = 1 | 2 | 3 | 4;

/**
 * Card state in FSRS algorithm
 * 0 = New, 1 = Learning, 2 = Review, 3 = Relearning
 */
export type CardState = 0 | 1 | 2 | 3;

/**
 * Query mode for fetching flashcards
 * - 'all': All user's flashcards
 * - 'study': Only cards due for review (due <= NOW())
 */
export type FlashcardQueryMode = "all" | "study";

// ============================================================================
// Flashcards API DTOs
// ============================================================================

/**
 * DTO for creating a single flashcard
 * POST /api/flashcards
 *
 * Derived from Insert type, only client-provided fields.
 * user_id is extracted from authentication context server-side.
 * FSRS parameters are initialized with default values server-side.
 */
export type CreateFlashcardDTO = Pick<
  Database["public"]["Tables"]["flashcards"]["Insert"],
  "front" | "back" | "is_ai_generated"
>;

/**
 * DTO for updating flashcard content
 * PATCH /api/flashcards/:id
 *
 * Only allows updating front and back text.
 * FSRS parameters are not modified directly (only through reviews).
 */
export type UpdateFlashcardDTO = Pick<Database["public"]["Tables"]["flashcards"]["Update"], "front" | "back">;

/**
 * Query parameters for fetching flashcards
 * GET /api/flashcards?q=...&mode=...
 */
export interface GetFlashcardsQueryDTO {
  /**
   * Search phrase - searches in front and back using trigrams
   */
  q?: string;

  /**
   * Filter mode - 'all' for all cards, 'study' for cards due today
   * @default 'all'
   */
  mode?: FlashcardQueryMode;
}

/**
 * Response DTO for fetching flashcards
 * GET /api/flashcards
 */
export interface GetFlashcardsResponseDTO {
  /**
   * Array of flashcard objects with all FSRS fields
   */
  data: FlashcardDTO[];

  /**
   * Total count of flashcards matching the query
   */
  count: number;
}

/**
 * DTO for batch creating flashcards
 * POST /api/flashcards/batch
 *
 * Used when saving multiple AI-generated flashcards or importing cards.
 */
export interface BatchCreateFlashcardsDTO {
  /**
   * Array of flashcards to create (1-100 items)
   * Each card must have front, back, and is_ai_generated fields
   */
  cards: CreateFlashcardDTO[];
}

/**
 * Response DTO for batch flashcard creation
 * POST /api/flashcards/batch
 */
export interface BatchCreateFlashcardsResponseDTO {
  /**
   * Array of created flashcard IDs, in same order as input
   */
  ids: string[];
}

// ============================================================================
// Reviews API DTOs
// ============================================================================

/**
 * Command model for creating a review (rating a flashcard)
 * POST /api/reviews
 *
 * Server-side will:
 * 1. Fetch current card state
 * 2. Calculate new FSRS parameters using ts-fsrs
 * 3. Update flashcard in transaction
 * 4. Insert review log entry
 */
export interface CreateReviewDTO {
  /**
   * UUID of the flashcard being reviewed
   */
  card_id: string;

  /**
   * User's rating of how well they remembered the card
   * 1 = Again (forgot), 2 = Hard, 3 = Good, 4 = Easy
   */
  rating: Rating;

  /**
   * Optional: Time taken to review in milliseconds
   * Used for analytics and future optimizations
   */
  review_duration_ms?: number;
}

/**
 * Response DTO for review submission
 * POST /api/reviews
 */
export interface CreateReviewResponseDTO {
  /**
   * Updated flashcard with new FSRS parameters
   * Useful for UI refresh or potential undo functionality
   */
  card: FlashcardDTO;

  /**
   * ISO timestamp of when the card is next due for review
   */
  next_due: string;
}

// ============================================================================
// AI Generator API DTOs
// ============================================================================

/**
 * Command model for AI flashcard generation
 * POST /api/ai/generate
 *
 * Generates flashcard suggestions from user notes.
 * Does NOT save anything to database - returns ephemeral drafts.
 */
export interface GenerateFlashcardsDTO {
  /**
   * User's note content to generate flashcards from
   * Min: 10 characters, Max: ~10-20k characters (model dependent)
   */
  note_content: string;
}

/**
 * Draft flashcard structure returned by AI
 *
 * These are not stored in database until user explicitly saves them
 * via POST /api/flashcards or POST /api/flashcards/batch
 */
export interface FlashcardDraftDTO {
  /**
   * Generated question/prompt text (max 500 chars when saving)
   */
  front: string;

  /**
   * Generated answer text (max 1000 chars when saving)
   */
  back: string;
}

/**
 * Response DTO for AI flashcard generation
 * POST /api/ai/generate
 */
export interface GenerateFlashcardsResponseDTO {
  /**
   * Array of generated flashcard drafts
   * User can review, edit, and select which ones to save
   */
  drafts: FlashcardDraftDTO[];
}

// ============================================================================
// Common API Response Wrappers
// ============================================================================

/**
 * Generic success response wrapper
 * Used for endpoints that return a single entity
 */
export interface ApiSuccessResponse<T> {
  data: T;
}

/**
 * Generic error response structure
 * Returned by all API endpoints on error
 */
export interface ApiErrorResponse {
  /**
   * Error message suitable for display or logging
   */
  error: string;

  /**
   * Optional error code for client-side handling
   */
  code?: string;

  /**
   * Optional validation errors for form fields
   */
  details?: Record<string, string[]>;
}

// ============================================================================
// Validation Constants
// ============================================================================

/**
 * Validation constraints matching database schema
 */
export const VALIDATION_CONSTRAINTS = {
  flashcard: {
    front: {
      min: 1,
      max: 500,
    },
    back: {
      min: 1,
      max: 1000,
    },
  },
  batch: {
    cards: {
      min: 1,
      max: 100,
    },
  },
  ai: {
    noteContent: {
      min: 10,
      max: 20000, // Safe limit for most LLM contexts
    },
  },
} as const;
