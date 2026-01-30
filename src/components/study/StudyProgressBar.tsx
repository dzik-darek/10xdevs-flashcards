/**
 * StudyProgressBar - Displays progress of the study session
 *
 * Shows:
 * - Number of cards reviewed / total cards
 * - Visual progress bar
 */

interface StudyProgressBarProps {
  /**
   * Number of cards reviewed so far
   */
  reviewedCards: number;

  /**
   * Total number of cards in the session
   */
  totalCards: number;
}

/**
 * StudyProgressBar component - displays session progress
 */
export function StudyProgressBar({ reviewedCards, totalCards }: StudyProgressBarProps) {
  const progressPercentage = totalCards > 0 ? (reviewedCards / totalCards) * 100 : 0;

  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">Postęp sesji</span>
        <span className="text-sm font-semibold">
          {reviewedCards} / {totalCards}
        </span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
          role="progressbar"
          aria-valuenow={reviewedCards}
          aria-valuemin={0}
          aria-valuemax={totalCards}
          aria-label={`Ukończono ${reviewedCards} z ${totalCards} fiszek`}
        />
      </div>
    </div>
  );
}
