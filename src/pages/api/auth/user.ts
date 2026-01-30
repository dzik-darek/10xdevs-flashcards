import type { APIRoute } from "astro";

import { createSupabaseAdminClient, createSupabaseServerInstance } from "@/db/supabase.client";

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

    // Delete user account (requires the service role key)
    const adminSupabase = createSupabaseAdminClient();
    const { error } = await adminSupabase.auth.admin.deleteUser(locals.user.id);

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
