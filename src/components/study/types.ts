/**
 * Types for Study Session components
 */

import type { FlashcardDTO } from "@/types";

/**
 * Status of the study session lifecycle
 */
export type StudySessionStatus = "loading" | "error" | "active" | "empty" | "finished";

/**
 * State of the study session
 */
export interface StudyState {
  /**
   * Queue of flashcards to review
   */
  queue: FlashcardDTO[];

  /**
   * Currently displayed flashcard (first in queue)
   */
  currentCard: FlashcardDTO | null;

  /**
   * Whether the current card is flipped (showing back)
   */
  isFlipped: boolean;

  /**
   * Current status of the session
   */
  status: StudySessionStatus;

  /**
   * Total number of cards at session start (for progress bar)
   */
  totalCards: number;

  /**
   * Number of cards reviewed so far
   */
  reviewedCards: number;
}
