/**
 * ReviewStep - Third step of AI Generator Wizard
 * Displays generated drafts in editable cards for review before saving
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DraftCard } from "./DraftCard";
import type { DraftViewModel } from "./types";
import { VALIDATION_CONSTRAINTS } from "@/types";

interface ReviewStepProps {
  /**
   * Array of draft flashcards to review
   */
  drafts: DraftViewModel[];

  /**
   * Callback to save valid drafts to database
   */
  onSave: () => Promise<void>;

  /**
   * Callback to discard all drafts and start over
   */
  onDiscard: () => void;

  /**
   * Callback when a draft is updated
   */
  onUpdateDraft: (id: string, data: Partial<DraftViewModel>) => void;

  /**
   * Callback when a draft is deleted
   */
  onDeleteDraft: (id: string) => void;

  /**
   * Whether save operation is in progress
   */
  isSaving?: boolean;

  /**
   * Error message to display
   */
  error?: string | null;
}

export function ReviewStep({
  drafts,
  onSave,
  onDiscard,
  onUpdateDraft,
  onDeleteDraft,
  isSaving = false,
  error = null,
}: ReviewStepProps) {
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Validate all drafts
  const validDrafts = drafts.filter((draft) => {
    const { front: frontConstraints, back: backConstraints } = VALIDATION_CONSTRAINTS.flashcard;

    const isFrontValid =
      draft.front.trim().length >= frontConstraints.min && draft.front.length <= frontConstraints.max;

    const isBackValid = draft.back.trim().length >= backConstraints.min && draft.back.length <= backConstraints.max;

    return isFrontValid && isBackValid;
  });

  const hasInvalidDrafts = validDrafts.length !== drafts.length;
  const canSave = validDrafts.length > 0 && !hasInvalidDrafts && !isSaving;

  const handleSave = async () => {
    try {
      await onSave();
      setSaveSuccess(true);
    } catch (err) {
      // Error is handled by parent component
      if (err instanceof Error) {
        throw err;
      }
    }
  };

  if (drafts.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 space-y-6 text-center">
        <Alert>
          <AlertDescription>Brak fiszek do wyświetlenia. Wszystkie zostały usunięte.</AlertDescription>
        </Alert>
        <Button onClick={onDiscard} variant="outline">
          Wróć do początku
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 pb-32">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Sprawdź wygenerowane fiszki</h2>
          <p className="text-muted-foreground">
            Możesz edytować, usuwać lub zapisać fiszki poniżej. Wygenerowano {drafts.length}{" "}
            {drafts.length === 1 ? "fiszkę" : "fiszek"}.
          </p>
        </div>

        {/* Error alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success alert */}
        {saveSuccess && (
          <Alert>
            <AlertDescription>
              ✅ Zapisano {validDrafts.length} {validDrafts.length === 1 ? "fiszkę" : "fiszek"}!
            </AlertDescription>
          </Alert>
        )}

        {/* Validation warning */}
        {hasInvalidDrafts && (
          <Alert variant="destructive">
            <AlertDescription>
              ⚠️ Niektóre fiszki zawierają błędy. Popraw je lub usuń przed zapisaniem. ({validDrafts.length}/
              {drafts.length} poprawnych)
            </AlertDescription>
          </Alert>
        )}

        {/* Grid of draft cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onUpdate={(field, value) => onUpdateDraft(draft.id, { [field]: value })}
              onDelete={() => onDeleteDraft(draft.id)}
            />
          ))}
        </div>
      </div>

      {/* Sticky action panel at bottom */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full max-w-6xl mx-auto p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">
              {validDrafts.length} / {drafts.length}
            </span>
            <span>poprawnych fiszek</span>
          </div>

          <div className="flex gap-3">
            <Button onClick={onDiscard} variant="outline" disabled={isSaving}>
              Odrzuć wszystkie
            </Button>

            <Button onClick={handleSave} disabled={!canSave} size="lg">
              {isSaving ? "Zapisuję..." : `Zapisz fiszki (${validDrafts.length})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
