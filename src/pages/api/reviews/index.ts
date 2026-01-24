/**
 * API Endpoint: Submit Flashcard Review
 *
 * POST /api/reviews
 *
 * This endpoint is the core of the spaced repetition system. It processes user's
 * rating of how well they remembered a flashcard and updates the card's FSRS parameters.
 *
 * Flow:
 * 1. Authenticate user
 * 2. Validate request (card_id, rating)
 * 3. Fetch current card state
 * 4. Calculate new FSRS parameters
 * 5. Update card in database
 * 6. Log review for analytics
 * 7. Return updated card
 *
 * Authentication: DEV MODE - Using hardcoded DEFAULT_USER_ID (auth implementation pending)
 */

import type { APIRoute } from "astro";
import { z } from "zod";

import type { CreateReviewDTO, CreateReviewResponseDTO, ApiErrorResponse } from "../../../types";
import { submitReview } from "../../../lib/services/review.service";
import { DEFAULT_USER_ID } from "../../../db/supabase.client";

// ============================================================================
// Configuration
// ============================================================================

export const prerender = false; // Dynamic endpoint - depends on database state

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Zod schema for request body validation
 */
const CreateReviewSchema = z.object({
  card_id: z.string().uuid("Invalid flashcard ID format"),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)], {
    errorMap: () => ({ message: "Rating must be 1, 2, 3, or 4" }),
  }),
  review_duration_ms: z.number().int().positive("Review duration must be positive").optional(),
}) satisfies z.ZodType<CreateReviewDTO>;

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * POST handler for submitting a flashcard review
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // ========================================================================
    // Step 1: Authentication Check
    // ========================================================================

    // DEV MODE: Using hardcoded user ID for development/testing
    // TODO: Uncomment the real authentication code below when auth is implemented
    const userId = DEFAULT_USER_ID;

    // PRODUCTION CODE (currently commented out):
    // const supabase = locals.supabase;
    // if (!supabase) {
    //   return createErrorResponse(500, "Supabase client not initialized", "INTERNAL_ERROR");
    // }
    //
    // // Verify user session
    // const {
    //   data: { user },
    //   error: authError,
    // } = await supabase.auth.getUser();
    //
    // if (authError || !user) {
    //   return createErrorResponse(
    //     401,
    //     "Authentication required. Please log in to submit reviews.",
    //     "UNAUTHORIZED"
    //   );
    // }
    //
    // const userId = user.id;

    // Get Supabase client from locals
    const supabase = locals.supabase;
    if (!supabase) {
      return createErrorResponse(500, "Supabase client not initialized", "INTERNAL_ERROR");
    }

    // ========================================================================
    // Step 2: Parse and Validate Request Body
    // ========================================================================

    let requestBody: unknown;

    try {
      requestBody = await request.json();
    } catch {
      return createErrorResponse(400, "Invalid JSON in request body", "INVALID_JSON");
    }

    // Validate with Zod
    const validationResult = CreateReviewSchema.safeParse(requestBody);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten();
      return createErrorResponse(
        422,
        "Validation failed",
        "VALIDATION_ERROR",
        errors.fieldErrors as Record<string, string[]>
      );
    }

    const dto: CreateReviewDTO = validationResult.data;

    // ========================================================================
    // Step 3: Process Review via Service
    // ========================================================================

    let updatedCard;

    try {
      updatedCard = await submitReview(supabase, userId, dto);
    } catch (error) {
      // Handle service errors
      if (error instanceof Error) {
        // Card not found or unauthorized
        if (error.message.includes("not found") || error.message.includes("don't have access")) {
          return createErrorResponse(404, error.message, "NOT_FOUND");
        }

        // Database errors
        if (error.message.includes("Failed to fetch") || error.message.includes("Failed to update")) {
          return createErrorResponse(500, "Database error occurred. Please try again.", "DATABASE_ERROR");
        }
      }

      // Generic error fallback
      return createErrorResponse(500, "An unexpected error occurred while processing the review", "INTERNAL_ERROR");
    }

    // ========================================================================
    // Step 4: Return Success Response
    // ========================================================================

    const response: CreateReviewResponseDTO = {
      card: updatedCard,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch {
    // Catch-all for unexpected errors
    return createErrorResponse(500, "An unexpected error occurred", "INTERNAL_ERROR");
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a standardized error response
 *
 * @param status - HTTP status code
 * @param message - Error message
 * @param code - Error code for client-side handling
 * @param details - Optional validation error details
 */
function createErrorResponse(
  status: number,
  message: string,
  code: string,
  details?: Record<string, string[]>
): Response {
  const errorResponse: ApiErrorResponse = {
    error: message,
    code,
    ...(details && { details }),
  };

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
