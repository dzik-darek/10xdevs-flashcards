/**
 * EditFlashcardDialog Component
 * Modal dialog for editing flashcard content
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { FlashcardDTO, UpdateFlashcardDTO } from '@/types';
import { VALIDATION_CONSTRAINTS } from '@/types';

interface EditFlashcardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcard: FlashcardDTO | null;
  onSubmit: (id: string, data: UpdateFlashcardDTO) => Promise<void>;
}

interface ValidationErrors {
  front?: string;
  back?: string;
}

export function EditFlashcardDialog({
  open,
  onOpenChange,
  flashcard,
  onSubmit,
}: EditFlashcardDialogProps) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when flashcard changes or dialog opens
  useEffect(() => {
    if (flashcard && open) {
      setFront(flashcard.front);
      setBack(flashcard.back);
      setErrors({});
    }
  }, [flashcard, open]);

  // Validate front field
  const validateFront = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (trimmed.length < VALIDATION_CONSTRAINTS.flashcard.front.min) {
      return 'Pole wymagane';
    }
    if (value.length > VALIDATION_CONSTRAINTS.flashcard.front.max) {
      return `Maksymalnie ${VALIDATION_CONSTRAINTS.flashcard.front.max} znaków`;
    }
    return undefined;
  };

  // Validate back field
  const validateBack = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (trimmed.length < VALIDATION_CONSTRAINTS.flashcard.back.min) {
      return 'Pole wymagane';
    }
    if (value.length > VALIDATION_CONSTRAINTS.flashcard.back.max) {
      return `Maksymalnie ${VALIDATION_CONSTRAINTS.flashcard.back.max} znaków`;
    }
    return undefined;
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const frontError = validateFront(front);
    const backError = validateBack(back);

    setErrors({
      front: frontError,
      back: backError,
    });

    return !frontError && !backError;
  };

  // Handle front change with real-time validation
  const handleFrontChange = (value: string) => {
    setFront(value);
    if (errors.front) {
      setErrors(prev => ({ ...prev, front: validateFront(value) }));
    }
  };

  // Handle back change with real-time validation
  const handleBackChange = (value: string) => {
    setBack(value);
    if (errors.back) {
      setErrors(prev => ({ ...prev, back: validateBack(value) }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!flashcard) return;

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const data: UpdateFlashcardDTO = {
        front: front.trim(),
        back: back.trim(),
      };

      await onSubmit(flashcard.id, data);
      onOpenChange(false);
    } catch (error) {
      // Error is handled by parent component (toast)
      console.error('Update error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edytuj fiszkę</DialogTitle>
            <DialogDescription>
              Wprowadź zmiany w treści fiszki. Kliknij zapisz, aby zachować zmiany.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Front field */}
            <div className="grid gap-2">
              <Label htmlFor="front">
                Pytanie <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="front"
                value={front}
                onChange={e => handleFrontChange(e.target.value)}
                placeholder="Wpisz pytanie..."
                rows={3}
                disabled={isSaving}
                className={errors.front ? 'border-destructive' : ''}
              />
              <div className="flex items-center justify-between">
                {errors.front ? (
                  <p className="text-sm text-destructive">{errors.front}</p>
                ) : (
                  <div />
                )}
                <p className="text-sm text-muted-foreground">
                  {front.length}/{VALIDATION_CONSTRAINTS.flashcard.front.max}
                </p>
              </div>
            </div>

            {/* Back field */}
            <div className="grid gap-2">
              <Label htmlFor="back">
                Odpowiedź <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="back"
                value={back}
                onChange={e => handleBackChange(e.target.value)}
                placeholder="Wpisz odpowiedź..."
                rows={5}
                disabled={isSaving}
                className={errors.back ? 'border-destructive' : ''}
              />
              <div className="flex items-center justify-between">
                {errors.back ? (
                  <p className="text-sm text-destructive">{errors.back}</p>
                ) : (
                  <div />
                )}
                <p className="text-sm text-muted-foreground">
                  {back.length}/{VALIDATION_CONSTRAINTS.flashcard.back.max}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
