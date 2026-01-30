/**
 * StudySessionContainer - Main container for study session
 *
 * Manages:
 * - Session state via useStudySession hook
 * - Keyboard shortcuts (1-4 for ratings, Space/Enter for flip)
 * - Conditional rendering based on session status
 * - Integration of all study components
 */

import { useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useStudySession } from "@/hooks/useStudySession";
import { StudyProgressBar } from "./StudyProgressBar";
import { StudyCard } from "./StudyCard";
import { RatingControls } from "./RatingControls";
import { SessionSummary } from "./SessionSummary";

import type { Rating } from "@/types";

/**
 * StudySessionContainer component - main study session logic
 */
export function StudySessionContainer() {
  const { state, flip, rate, retry } = useStudySession();

  // ========================================================================
  // Keyboard Shortcuts
  // ========================================================================

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Guard: Ignore if typing in input/textarea
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Space/Enter: Flip card (only if not flipped yet)
      if ((event.key === " " || event.key === "Enter") && !state.isFlipped) {
        event.preventDefault();
        flip();
        return;
      }

      // Numbers 1-4: Rate card (only if flipped)
      if (state.isFlipped && ["1", "2", "3", "4"].includes(event.key)) {
        event.preventDefault();
        const rating = parseInt(event.key) as Rating;
        rate(rating);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [state.isFlipped, flip, rate]);

  // ========================================================================
  // Render States
  // ========================================================================

  // Loading State
  if (state.status === "loading") {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <Card className="min-h-[300px] flex items-center justify-center">
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              <p className="text-muted-foreground">Ładowanie fiszek...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error State
  if (state.status === "error") {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>Nie udało się pobrać fiszek do nauki.</span>
            <Button onClick={retry} variant="outline" size="sm">
              Spróbuj ponownie
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Empty State
  if (state.status === "empty") {
    return <SessionSummary reviewedCards={0} wasEmpty={true} />;
  }

  // Finished State
  if (state.status === "finished") {
    return <SessionSummary reviewedCards={state.reviewedCards} wasEmpty={false} />;
  }

  // Active State - Study in Progress
  if (state.status === "active" && state.currentCard) {
    return (
      <div className="space-y-6">
        {/* Progress Bar */}
        <StudyProgressBar reviewedCards={state.reviewedCards} totalCards={state.totalCards} />

        {/* Flashcard */}
        <StudyCard card={state.currentCard} isFlipped={state.isFlipped} onFlip={flip} />

        {/* Rating Controls */}
        <RatingControls onRate={rate} disabled={!state.isFlipped} />
      </div>
    );
  }

  // Fallback (should not reach here)
  return null;
}
