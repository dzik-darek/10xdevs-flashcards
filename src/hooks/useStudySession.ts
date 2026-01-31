/**
 * Custom hook for managing study session state and logic
 *
 * Handles:
 * - Fetching flashcards due for review
 * - Managing card queue
 * - Flipping cards
 * - Submitting reviews with optimistic UI updates
 */

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import type { Rating, CreateReviewDTO, GetFlashcardsResponseDTO } from "@/types";
import type { StudyState } from "@/components/study/types";

/**
 * Hook for managing study session
 */
export function useStudySession() {
  const [state, setState] = useState<StudyState>({
    queue: [],
    currentCard: null,
    isFlipped: false,
    status: "loading",
    totalCards: 0,
    reviewedCards: 0,
  });

  const [startTime, setStartTime] = useState<number>(Date.now());

  // ========================================================================
  // Fetch Queue
  // ========================================================================

  /**
   * Fetches flashcards due for review from the API
   */
  const fetchQueue = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, status: "loading" }));

      const response = await fetch("/api/flashcards?mode=study");

      if (!response.ok) {
        throw new Error("Failed to fetch flashcards");
      }

      const data: GetFlashcardsResponseDTO = await response.json();

      // Guard: Empty queue - nothing to study
      if (data.data.length === 0) {
        setState((prev) => ({
          ...prev,
          status: "empty",
          queue: [],
          currentCard: null,
        }));
        return;
      }

      // Happy path: Set queue and start session
      setState({
        queue: data.data,
        currentCard: data.data[0],
        isFlipped: false,
        status: "active",
        totalCards: data.data.length,
        reviewedCards: 0,
      });
      setStartTime(Date.now());
    } catch (error) {
      if (error instanceof Error) {
        toast.error("Nie udało się pobrać fiszek do nauki");
      }
      setState((prev) => ({
        ...prev,
        status: "error",
        queue: [],
        currentCard: null,
      }));
      toast.error("Nie udało się pobrać fiszek do nauki");
    }
  }, []);

  // ========================================================================
  // Effects
  // ========================================================================

  /**
   * Fetch queue on mount
   */
  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // ========================================================================
  // Actions
  // ========================================================================

  /**
   * Flips the current card to show the answer
   */
  const flip = useCallback(() => {
    setState((prev) => ({ ...prev, isFlipped: true }));
  }, []);

  /**
   * Submits a review rating for the current card
   * Uses optimistic UI - moves to next card immediately
   *
   * @param rating - User's rating (1-4)
   */
  const rate = useCallback(
    async (rating: Rating) => {
      const { currentCard, queue, reviewedCards } = state;

      // Guard: No current card
      if (!currentCard) {
        return;
      }

      // Calculate review duration
      const reviewDuration = Date.now() - startTime;

      // Prepare review payload
      const reviewPayload: CreateReviewDTO = {
        card_id: currentCard.id,
        rating,
        review_duration_ms: reviewDuration,
      };

      // ====================================================================
      // Optimistic UI Update
      // ====================================================================

      // Remove current card from queue
      const newQueue = queue.slice(1);
      const newCurrentCard = newQueue.length > 0 ? newQueue[0] : null;

      // Update state immediately (optimistic)
      setState({
        queue: newQueue,
        currentCard: newCurrentCard,
        isFlipped: false,
        status: newQueue.length > 0 ? "active" : "finished",
        totalCards: state.totalCards,
        reviewedCards: reviewedCards + 1,
      });

      // Reset start time for next card
      setStartTime(Date.now());

      // ====================================================================
      // Background API Call
      // ====================================================================

      // Send review to API in the background (non-blocking)
      try {
        const response = await fetch("/api/reviews", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(reviewPayload),
        });

        if (!response.ok) {
          throw new Error("Failed to submit review");
        }
      } catch (error) {
        // Error handling: Show toast but don't block UI
        if (error instanceof Error) {
          toast.error("Nie udało się zapisać oceny fiszki");
        }
      }
    },
    [state, startTime]
  );

  /**
   * Retries fetching the queue (used on error state)
   */
  const retry = useCallback(() => {
    fetchQueue();
  }, [fetchQueue]);

  return {
    state,
    flip,
    rate,
    retry,
  };
}
