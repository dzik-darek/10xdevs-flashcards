/**
 * SessionSummary - Displayed when study queue is empty
 *
 * Shows:
 * - Congratulatory message
 * - Session statistics
 * - Button to return to dashboard
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SessionSummaryProps {
  /**
   * Number of cards reviewed in this session
   */
  reviewedCards: number;

  /**
   * Whether the queue was empty from the start (no cards due)
   */
  wasEmpty?: boolean;
}

/**
 * SessionSummary component - displays end of session message
 */
export function SessionSummary({ reviewedCards, wasEmpty = false }: SessionSummaryProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto mb-4 text-6xl">{wasEmpty ? "📚" : "🎉"}</div>
          <CardTitle className="text-2xl">{wasEmpty ? "Wszystko na dziś zrobione!" : "Świetna robota!"}</CardTitle>
          <CardDescription className="text-base mt-2">
            {wasEmpty
              ? "Nie masz żadnych fiszek do powtórki. Wróć później lub utwórz nowe fiszki."
              : `Ukończyłeś sesję nauki. Przejrzałeś ${reviewedCards} ${
                  reviewedCards === 1 ? "fiszkę" : reviewedCards < 5 ? "fiszki" : "fiszek"
                }.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!wasEmpty && (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                Algorytm FSRS automatycznie zaplanował kolejne powtórki na podstawie Twoich ocen.
              </p>
            </div>
          )}
          <div className="flex gap-3 justify-center pt-2">
            <Button asChild variant="default" size="lg">
              <a href="/flashcards">Zarządzaj fiszkami</a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="/">Strona główna</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
