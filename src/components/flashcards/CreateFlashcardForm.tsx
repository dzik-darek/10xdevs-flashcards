import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import type { ApiErrorResponse, CreateFlashcardDTO, FlashcardDTO } from "@/types";
import { VALIDATION_CONSTRAINTS } from "@/types";

// Form values type matching the schema
interface CreateFlashcardFormValues {
  front: string;
  back: string;
}

// Zod validation schema
const formSchema = z.object({
  front: z
    .string()
    .min(VALIDATION_CONSTRAINTS.flashcard.front.min, "Treść pytania jest wymagana")
    .max(
      VALIDATION_CONSTRAINTS.flashcard.front.max,
      `Przekroczono limit znaków (max ${VALIDATION_CONSTRAINTS.flashcard.front.max})`
    ),
  back: z
    .string()
    .min(VALIDATION_CONSTRAINTS.flashcard.back.min, "Treść odpowiedzi jest wymagana")
    .max(
      VALIDATION_CONSTRAINTS.flashcard.back.max,
      `Przekroczono limit znaków (max ${VALIDATION_CONSTRAINTS.flashcard.back.max})`
    ),
});

export function CreateFlashcardForm() {
  const form = useForm<CreateFlashcardFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      front: "",
      back: "",
    },
    mode: "onChange", // Validate on change for real-time feedback
  });

  const { isSubmitting } = form.formState;

  // Handle API call to create flashcard
  const createFlashcard = async (values: CreateFlashcardFormValues): Promise<FlashcardDTO> => {
    const payload: CreateFlashcardDTO = {
      front: values.front,
      back: values.back,
      is_ai_generated: false,
    };

    const response = await fetch("/api/flashcards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json();

      // Handle validation errors by setting them on form fields
      if (errorData.details) {
        Object.entries(errorData.details).forEach(([field, errors]) => {
          form.setError(field as keyof CreateFlashcardFormValues, {
            type: "server",
            message: errors.join(", "),
          });
        });
      }

      throw new Error(errorData.error || "Nie udało się zapisać fiszki");
    }

    const data = await response.json();
    return data.data;
  };

  // Handle "Save" button - save and redirect
  const onSave = async (values: CreateFlashcardFormValues) => {
    try {
      await createFlashcard(values);

      if (typeof window !== "undefined") {
        // eslint-disable-next-line react-compiler/react-compiler
        window.location.href = "/flashcards";
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Nie udało się zapisać fiszki. Spróbuj ponownie później.");
      }
    }
  };

  // Handle "Save & Add Next" button - save, show toast, reset form
  const onSaveAndAddNext = async (values: CreateFlashcardFormValues) => {
    try {
      await createFlashcard(values);
      toast.success("Fiszka została dodana");
      form.reset();
      // Focus on the front field after reset
      setTimeout(() => {
        const frontField = document.querySelector('textarea[name="front"]') as HTMLTextAreaElement;
        if (frontField) {
          frontField.focus();
        }
      }, 0);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Nie udało się zapisać fiszki. Spróbuj ponownie później.");
      }
    }
  };

  // Handle cancel - redirect back to list
  const onCancel = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/flashcards";
    }
  };

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Dodaj nową fiszkę</CardTitle>
        <CardDescription>Wprowadź treść pytania i odpowiedzi dla swojej fiszki</CardDescription>
      </CardHeader>

      <Form {...form}>
        <form>
          <CardContent className="space-y-6">
            {/* Front field */}
            <FormField
              control={form.control}
              name="front"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Przód (Pytanie)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Wprowadź pytanie..." className="resize-none" rows={4} {...field} />
                  </FormControl>
                  <div className="flex items-center justify-between">
                    <FormMessage />
                    <span
                      className={`text-sm ${
                        field.value.length > VALIDATION_CONSTRAINTS.flashcard.front.max
                          ? "text-red-500"
                          : "text-gray-500"
                      }`}
                    >
                      {field.value.length}/{VALIDATION_CONSTRAINTS.flashcard.front.max}
                    </span>
                  </div>
                </FormItem>
              )}
            />

            {/* Back field */}
            <FormField
              control={form.control}
              name="back"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tył (Odpowiedź)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Wprowadź odpowiedź..." className="resize-none" rows={6} {...field} />
                  </FormControl>
                  <div className="flex items-center justify-between">
                    <FormMessage />
                    <span
                      className={`text-sm ${
                        field.value.length > VALIDATION_CONSTRAINTS.flashcard.back.max
                          ? "text-red-500"
                          : "text-gray-500"
                      }`}
                    >
                      {field.value.length}/{VALIDATION_CONSTRAINTS.flashcard.back.max}
                    </span>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Anuluj
            </Button>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={form.handleSubmit(onSaveAndAddNext)}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Zapisz i dodaj kolejną
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit(onSave)}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Zapisz
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
