import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { loginSchema, type LoginFormValues } from "./schemas";

export function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setServerError(null);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        setServerError(data.error || "Wystąpił błąd podczas logowania");
        return;
      }

      // Success - redirect to dashboard
      toast.success("Zalogowano pomyślnie!");
      window.location.href = "/dashboard";
    } catch (error) {
      if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError("Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.");
      }
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md" data-testid="login-form-card">
      <CardHeader>
        <CardTitle className="text-2xl">Logowanie</CardTitle>
        <CardDescription>
          Wprowadź swoje dane, aby uzyskać dostęp do aplikacji
        </CardDescription>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} data-testid="login-form">
          <CardContent className="space-y-4">
            {serverError && (
              <Alert variant="destructive" data-testid="login-error-alert">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="twoj@email.pl"
                      autoComplete="email"
                      disabled={isSubmitting}
                      data-testid="login-email-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hasło</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={isSubmitting}
                      data-testid="login-password-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
              data-testid="login-submit-button"
            >
              {isSubmitting ? "Logowanie..." : "Zaloguj się"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Nie masz konta?{" "}
              <a 
                href="/register" 
                className="text-primary underline-offset-4 hover:underline"
                data-testid="register-link"
              >
                Zarejestruj się
              </a>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
