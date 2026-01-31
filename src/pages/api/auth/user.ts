import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "@/db/supabase.client";

export const prerender = false;

export const DELETE: APIRoute = async ({ request, cookies, locals }) => {
  try {
    // Check if user is authenticated
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: "Nieautoryzowany dostęp",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Delete user account using custom database function (this will cascade delete all related data due to ON DELETE CASCADE)
    const { error } = await supabase.rpc('deleteUser' as any);

    if (error) {
      return new Response(
        JSON.stringify({
          error: "Nie udało się usunąć konta",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Sign out the user
    await supabase.auth.signOut();

    return new Response(null, {
      status: 200,
    });
  } catch (error) {
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
