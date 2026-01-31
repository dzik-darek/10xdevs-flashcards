/**
 * Custom hook for managing AI Generator Wizard state
 * Handles state persistence, API integration, and business logic
 */

import { useState, useEffect, useCallback } from "react";
import type { GeneratorState, DraftViewModel } from "@/components/ai/types";
import type {
  GenerateFlashcardsDTO,
  GenerateFlashcardsResponseDTO,
  BatchCreateFlashcardsDTO,
  BatchCreateFlashcardsResponseDTO,
  CreateFlashcardDTO,
} from "@/types";

const SESSION_STORAGE_KEY = "ai-generator-state";

const DEFAULT_STATE: GeneratorState = {
  step: "input",
  noteContent: "",
  drafts: [],
  isSaving: false,
  error: null,
};

/**
 * Loads state from sessionStorage if available
 */
function loadStateFromStorage(): GeneratorState {
  if (typeof window === "undefined") return DEFAULT_STATE;

  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return DEFAULT_STATE;

    const parsed = JSON.parse(stored) as GeneratorState;
    return parsed;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    return DEFAULT_STATE;
  }
}

/**
 * Saves state to sessionStorage
 */
function saveStateToStorage(state: GeneratorState): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
  }
}

/**
 * Clears state from sessionStorage
 */
function clearStateFromStorage(): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
  }
}

export function useGeneratorState() {
  const [state, setState] = useState<GeneratorState>(loadStateFromStorage);

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    saveStateToStorage(state);
  }, [state]);

  // Add beforeunload listener when drafts exist (but not when saving)
  useEffect(() => {
    // Don't block if no drafts or if we're in the process of saving
    if (state.drafts.length === 0 || state.isSaving) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [state.drafts.length, state.isSaving]);

  /**
   * Updates note content
   */
  const setNoteContent = useCallback((content: string) => {
    setState((prev) => ({
      ...prev,
      noteContent: content,
      error: null,
    }));
  }, []);

  /**
   * Generates flashcard drafts from note content
   * Calls POST /api/ai/generate
   */
  const generateDrafts = useCallback(async () => {
    if (state.noteContent.length < 10) {
      setState((prev) => ({
        ...prev,
        error: "Tekst jest zbyt krótki. Minimum 10 znaków.",
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      step: "loading",
      error: null,
    }));

    try {
      const requestBody: GenerateFlashcardsDTO = {
        note_content: state.noteContent,
      };

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(120000), // 120s timeout
      });

      if (!response.ok) {
        if (response.status === 422) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Tekst jest nieprawidłowy");
        }
        if (response.status === 504) {
          throw new Error("Generowanie trwało zbyt długo. Spróbuj z krótszym fragmentem tekstu.");
        }
        throw new Error("Wystąpił błąd podczas generowania. Spróbuj ponownie.");
      }

      const data: GenerateFlashcardsResponseDTO = await response.json();

      // Map drafts to ViewModels with frontend IDs
      const draftsWithIds: DraftViewModel[] = data.drafts.map((draft) => ({
        ...draft,
        id: crypto.randomUUID(),
      }));

      setState((prev) => ({
        ...prev,
        step: "review",
        drafts: draftsWithIds,
        error: null,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Wystąpił błąd podczas generowania. Spróbuj ponownie.";

      setState((prev) => ({
        ...prev,
        step: "input",
        error: errorMessage,
      }));
    }
  }, [state.noteContent]);

  /**
   * Updates a specific draft by ID
   */
  const updateDraft = useCallback((id: string, changes: Partial<DraftViewModel>) => {
    setState((prev) => ({
      ...prev,
      drafts: prev.drafts.map((draft) => (draft.id === id ? { ...draft, ...changes } : draft)),
    }));
  }, []);

  /**
   * Removes a draft by ID
   */
  const removeDraft = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      drafts: prev.drafts.filter((draft) => draft.id !== id),
    }));
  }, []);

  /**
   * Saves all valid drafts to database
   * Calls POST /api/flashcards/batch
   */
  const saveBatch = useCallback(async () => {
    // Filter out invalid drafts
    const validDrafts = state.drafts.filter(
      (draft) =>
        draft.front.trim().length > 0 &&
        draft.front.length <= 500 &&
        draft.back.trim().length > 0 &&
        draft.back.length <= 1000
    );

    if (validDrafts.length === 0) {
      setState((prev) => ({
        ...prev,
        error: "Brak poprawnych fiszek do zapisania",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isSaving: true, error: null }));

    try {
      // Map to CreateFlashcardDTO
      const cards: CreateFlashcardDTO[] = validDrafts.map((draft) => ({
        front: draft.front,
        back: draft.back,
        is_ai_generated: true,
      }));

      const requestBody: BatchCreateFlashcardsDTO = { cards };

      const response = await fetch("/api/flashcards/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Wystąpił błąd podczas zapisywania");
      }

      const data: BatchCreateFlashcardsResponseDTO = await response.json();

      // Success - reset state and clear storage
      clearStateFromStorage();
      setState(DEFAULT_STATE);

      return data.ids;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Wystąpił błąd podczas zapisywania. Spróbuj ponownie.";

      setState((prev) => ({
        ...prev,
        isSaving: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [state.drafts]);

  /**
   * Resets state to default and clears storage
   */
  const reset = useCallback(() => {
    clearStateFromStorage();
    setState(DEFAULT_STATE);
  }, []);

  return {
    state,
    setNoteContent,
    generateDrafts,
    updateDraft,
    removeDraft,
    saveBatch,
    reset,
  };
}
