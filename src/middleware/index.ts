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
    locals.user = {
      id: user.id,
      email: user.email,
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
