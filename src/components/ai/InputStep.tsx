/**
 * InputStep - First step of AI Generator Wizard
 * Allows user to input note content for flashcard generation
 */

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { VALIDATION_CONSTRAINTS } from "@/types";

interface InputStepProps {
  /**
   * Current note content
   */
  content: string;

  /**
   * Callback when content changes
   */
  onContentChange: (value: string) => void;

  /**
   * Callback when user clicks Generate button
   */
  onGenerate: () => void;

  /**
   * Whether the content is valid and can be generated
   */
  isValid: boolean;
}

export function InputStep({ content, onContentChange, onGenerate, isValid }: InputStepProps) {
  const { min, max } = VALIDATION_CONSTRAINTS.ai.noteContent;
  const charCount = content.length;
  const isOverLimit = charCount > max;

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Generuj fiszki z notatek</h1>
        <p className="text-muted-foreground">Wklej swoje notatki poniżej, a AI wygeneruje dla Ciebie fiszki.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note-content">Treść notatek</Label>
        <Textarea
          id="note-content"
          placeholder="Wklej tutaj swoje notatki... (minimum 10 znaków)"
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          className={`min-h-[300px] resize-y ${isOverLimit ? "border-red-500 focus-visible:ring-red-500" : ""}`}
        />

        <div className="flex items-center justify-between text-sm">
          <span
            className={`${
              isOverLimit
                ? "text-red-500 font-medium"
                : charCount < min
                  ? "text-muted-foreground"
                  : "text-muted-foreground"
            }`}
          >
            {charCount} / {max} znaków
            {charCount < min && ` (minimum ${min})`}
          </span>

          {isOverLimit && (
            <span className="text-red-500 font-medium">Przekroczono limit! Usuń {charCount - max} znaków.</span>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <Button onClick={onGenerate} disabled={!isValid || isOverLimit} size="lg" className="w-full sm:w-auto">
          Generuj fiszki
        </Button>
      </div>
    </div>
  );
}
