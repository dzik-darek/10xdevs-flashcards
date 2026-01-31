/**
 * RatingControls - Panel with 4 FSRS rating buttons
 *
 * Displays buttons for user to rate how well they remembered a card:
 * - Again (1): Forgot completely
 * - Hard (2): Remembered with difficulty
 * - Good (3): Remembered correctly
 * - Easy (4): Remembered easily
 */

import { Button } from "@/components/ui/button";
import type { Rating } from "@/types";

interface RatingControlsProps {
  /**
   * Callback when user selects a rating
   */
  onRate: (rating: Rating) => void;

  /**
   * Whether the rating buttons are disabled
   * (e.g., when card is not flipped yet)
   */
  disabled: boolean;
}

/**
 * Button configuration for each rating
 */
const RATING_BUTTONS = [
  {
    rating: 1 as Rating,
    label: "Again",
    description: "Nie pamiętam",
    variant: "destructive" as const,
    className: "flex-1",
  },
  {
    rating: 2 as Rating,
    label: "Hard",
    description: "Z trudem",
    variant: "outline" as const,
    className: "flex-1",
  },
  {
    rating: 3 as Rating,
    label: "Good",
    description: "Dobrze",
    variant: "default" as const,
    className: "flex-1",
  },
  {
    rating: 4 as Rating,
    label: "Easy",
    description: "Łatwo",
    variant: "outline" as const,
    className:
      "flex-1 border-green-600 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-950",
  },
] as const;

/**
 * RatingControls component - displays rating buttons
 */
export function RatingControls({ onRate, disabled }: RatingControlsProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex gap-2">
        {RATING_BUTTONS.map(({ rating, label, description, variant, className }) => (
          <Button
            key={rating}
            onClick={() => onRate(rating)}
            disabled={disabled}
            variant={variant}
            className={className}
            size="lg"
          >
            <div className="flex flex-col items-center gap-1">
              <span className="font-semibold">{label}</span>
              <span className="text-xs opacity-80">{description}</span>
            </div>
          </Button>
        ))}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-3 text-center text-sm text-muted-foreground">
        <p>Skróty klawiszowe: 1 (Again) · 2 (Hard) · 3 (Good) · 4 (Easy)</p>
      </div>
    </div>
  );
}
