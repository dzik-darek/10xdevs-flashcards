/**
 * Types for AI Generator Wizard
 * ViewModels and state management types for the flashcard generation flow
 */

import type { FlashcardDraftDTO } from '@/types';

/**
 * ViewModel extends DTO with frontend-specific fields for React rendering
 * and local validation state
 */
export interface DraftViewModel extends FlashcardDraftDTO {
  /**
   * UUID generated on frontend for React key prop
   */
  id: string;
  
  /**
   * Optional flag for deletion animation
   */
  isDeleted?: boolean;
}

/**
 * Wizard steps for the AI generator flow
 * - input: User enters note content
 * - loading: AI is generating flashcards
 * - review: User reviews and edits generated drafts
 */
export type WizardStep = 'input' | 'loading' | 'review';

/**
 * Complete state for the AI Generator Wizard
 */
export interface GeneratorState {
  /**
   * Current step in the wizard flow
   */
  step: WizardStep;
  
  /**
   * User's input note content
   */
  noteContent: string;
  
  /**
   * Generated flashcard drafts (with frontend IDs)
   */
  drafts: DraftViewModel[];
  
  /**
   * Flag indicating if batch save is in progress
   */
  isSaving: boolean;
  
  /**
   * Error message to display (null if no error)
   */
  error: string | null;
}
