import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface LogoutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  children?: React.ReactNode;
}

export function LogoutButton({ variant = "outline", className, children = "Wyloguj się" }: LogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Nie udało się wylogować");
      }

      // Success - redirect to login
      toast.success("Wylogowano pomyślnie");
      window.location.href = "/login";
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.");
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Button variant={variant} onClick={handleLogout} disabled={isLoggingOut} className={className}>
      {isLoggingOut ? "Wylogowywanie..." : children}
    </Button>
  );
}
