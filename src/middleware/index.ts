import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "@/db/supabase.client";

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
];

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  // Create Supabase instance for this request
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Make supabase available to all routes
  locals.supabase = supabase;

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Set user in locals
  if (user) {
    // Fetch user profile data (first_name, surname)
    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, surname")
      .eq("id", user.id)
      .maybeSingle(); // Use maybeSingle() to handle missing profiles gracefully

    // If profile doesn't exist (for old users), create a default one
    if (!profile && !profileError) {
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          first_name: "Użytkownik",
          surname: "",
        })
        .select("first_name, surname")
        .single();
      
      profile = newProfile;
    }

    // Log profile fetch errors for debugging
    if (profileError) {
      console.error("Error fetching user profile:", profileError);
    }

    locals.user = {
      id: user.id,
      email: user.email,
      firstName: profile?.first_name || null,
      surname: profile?.surname || null,
    };
  } else {
    locals.user = null;
  }

  // Check if the current path is public
  const isPublicPath = PUBLIC_PATHS.includes(url.pathname);

  // If user is logged in and trying to access login/register, redirect to dashboard
  if (user && (url.pathname === "/login" || url.pathname === "/register")) {
    return redirect("/dashboard");
  }

  // If user is not logged in and trying to access protected route, redirect to login
  if (!user && !isPublicPath) {
    return redirect("/login");
  }

  return next();
});
