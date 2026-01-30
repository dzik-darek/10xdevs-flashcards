import type { APIRoute } from "astro";
import { z } from "zod";

import { createSupabaseServerInstance } from "@/db/supabase.client";

const registerSchema = z.object({
  firstName: z.string().min(1, "Imię jest wymagane").max(100, "Imię jest za długie"),
  surname: z.string().min(1, "Nazwisko jest wymagane").max(100, "Nazwisko jest za długie"),
  email: z.string().email("Nieprawidłowy format email"),
  password: z.string().min(6, "Hasło musi mieć minimum 6 znaków"),
});

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Step 1: Create auth user with profile metadata
    // The metadata will be used by the handle_new_user() trigger
    // to automatically create a profile entry
    const { data, error } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        data: {
          first_name: validatedData.firstName,
          surname: validatedData.surname,
        },
      },
    });

    if (error) {
      // Handle specific error cases
      if (error.message.includes("already registered")) {
        return new Response(
          JSON.stringify({
            error: "Użytkownik o podanym adresie email już istnieje",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          error: error.message,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Guard: Ensure user was created
    if (!data.user) {
      return new Response(
        JSON.stringify({
          error: "Nie udało się utworzyć użytkownika",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Note: Profile is automatically created by the handle_new_user() trigger
    // No need for manual INSERT here

    return new Response(
      JSON.stringify({
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowe dane wejściowe",
          details: error.issues,
        }),
        {
          status: 422,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        error: "Wystąpił nieoczekiwany błąd",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
