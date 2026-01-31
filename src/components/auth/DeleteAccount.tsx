import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function DeleteAccount() {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);

      const response = await fetch("/api/auth/user", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Nie udało się usunąć konta");
      }

      // Success - redirect to login
      toast.success("Konto zostało usunięte");
      window.location.href = "/login";
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-destructive/50 bg-destructive/5 p-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-destructive">Strefa niebezpieczna</h3>
        <p className="text-sm text-muted-foreground">
          Usunięcie konta jest nieodwracalne. Wszystkie Twoje fiszki, postępy w nauce i dane zostaną trwale usunięte.
        </p>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={isDeleting}>
            Usuń konto
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć konto?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja jest nieodwracalna. Wszystkie Twoje dane, w tym fiszki i postępy w nauce, zostaną trwale
              usunięte z naszych serwerów.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Usuwanie..." : "Tak, usuń konto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
