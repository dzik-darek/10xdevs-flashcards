/**
 * DeleteFlashcardAlert Component
 * Confirmation dialog for deleting a flashcard
 */

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { FlashcardDTO } from "@/types";

interface DeleteFlashcardAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcard: FlashcardDTO | null;
  onConfirm: (id: string) => Promise<void>;
}

export function DeleteFlashcardAlert({ open, onOpenChange, flashcard, onConfirm }: DeleteFlashcardAlertProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!flashcard) return;

    setIsDeleting(true);
    try {
      await onConfirm(flashcard.id);
      onOpenChange(false);
    } catch (error) {
      // Error is handled by parent component (toast)
      if (error instanceof Error) {
        throw error;
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Czy na pewno chcesz usunąć tę fiszkę?</AlertDialogTitle>
          <AlertDialogDescription>
            Ta operacja jest nieodwracalna. Fiszka zostanie trwale usunięta z twojej bazy wiedzy.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Usuwanie..." : "Usuń"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
