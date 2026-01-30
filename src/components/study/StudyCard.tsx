/**
 * StudyCard - Displays a flashcard with flip animation
 *
 * Shows the front (question) initially, and flips to show
 * the back (answer) when clicked.
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { FlashcardDTO } from "@/types";

interface StudyCardProps {
  /**
   * Flashcard data to display
   */
  card: FlashcardDTO;

  /**
   * Whether the card is showing the back (answer)
   */
  isFlipped: boolean;

  /**
   * Callback when card is clicked to flip
   */
  onFlip: () => void;
}

/**
 * StudyCard component - displays flashcard with flip interaction
 */
export function StudyCard({ card, isFlipped, onFlip }: StudyCardProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className="relative w-full cursor-pointer"
        onClick={!isFlipped ? onFlip : undefined}
        onKeyDown={(e) => {
          if (!isFlipped && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onFlip();
          }
        }}
        role="button"
        tabIndex={!isFlipped ? 0 : -1}
        aria-label={isFlipped ? "Widok odpowiedzi" : "Widok pytania - kliknij aby odsłonić"}
      >
        {/* Front Side */}
        {!isFlipped && (
          <Card className="min-h-[300px] animate-in fade-in duration-300">
            <CardHeader>
              <div className="text-sm text-muted-foreground font-medium">Pytanie</div>
            </CardHeader>
            <CardContent>
              <p className="text-xl leading-relaxed whitespace-pre-wrap">{card.front}</p>
            </CardContent>
            <div className="px-6 pb-4">
              <p className="text-sm text-muted-foreground italic">Kliknij aby odsłonić odpowiedź</p>
            </div>
          </Card>
        )}

        {/* Back Side */}
        {isFlipped && (
          <Card className="min-h-[300px] animate-in fade-in duration-300">
            <CardHeader>
              <div className="text-sm text-muted-foreground font-medium">Odpowiedź</div>
            </CardHeader>
            <CardContent>
              <p className="text-xl leading-relaxed whitespace-pre-wrap">{card.back}</p>
            </CardContent>
            <div className="px-6 pb-4">
              <p className="text-sm text-muted-foreground italic">Oceń jak dobrze znasz tę fiszkę</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
