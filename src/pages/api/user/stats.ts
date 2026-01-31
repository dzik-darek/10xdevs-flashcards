/**
 * User Statistics API Endpoint
 * GET /api/user/stats
 *
 * Returns counts of user's flashcards (total and due) without fetching actual data.
 * Used for efficient badge display in navigation and dashboard.
 */
import type { APIRoute } from "astro";

import { getStats } from "@/lib/services/flashcard.service";
import type { UserStatsDTO, ApiErrorResponse } from "@/types";

export const prerender = false;

/**
 * GET /api/user/stats
 *
 * Returns flashcard statistics for the authenticated user
 *
 * Response:
 * - 200: { totalCount: number, studyCount: number }
 * - 401: User not authenticated
 * - 500: Server error
 */
export const GET: APIRoute = async ({ locals }) => {
  // ========================================================================
  // Step 1: Authentication Check
  // ========================================================================

  // Guard: Check if user is authenticated
  // Middleware should have already checked this, but we double-check
  if (!locals.supabase || !locals.user) {
    const errorResponse: ApiErrorResponse = {
      error: "Unauthorized - please log in",
      code: "UNAUTHORIZED",
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { supabase, user } = locals;

  // ========================================================================
  // Step 2: Fetch Statistics
  // ========================================================================

  try {
    const stats: UserStatsDTO = await getStats(supabase, user.id);

    // ========================================================================
    // Step 3: Return Success Response
    // ========================================================================

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // ========================================================================
    // Step 4: Error Handling
    // ========================================================================

    if (error instanceof Error) {
      throw error;
    }

    const errorResponse: ApiErrorResponse = {
      error: error instanceof Error ? error.message : "Failed to fetch statistics",
      code: "STATS_FETCH_ERROR",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
