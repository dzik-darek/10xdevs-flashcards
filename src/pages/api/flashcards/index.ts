/**
 * Flashcards API Endpoint
 * POST /api/flashcards - Create a new flashcard
 *
 * This endpoint allows authenticated users to create flashcards.
 * It validates input, calls the FlashcardService, and returns the created card.
 */

import type { APIRoute } from "astro";
import { z } from "zod";

import { DEFAULT_USER_ID } from "../../../db/supabase.client";
import { createFlashcard } from "../../../lib/services/flashcard.service";
import type { ApiErrorResponse, ApiSuccessResponse, CreateFlashcardDTO, FlashcardDTO } from "../../../types";
import { VALIDATION_CONSTRAINTS } from "../../../types";

// Disable prerendering for API routes
export const prerender = false;

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Zod schema for flashcard creation
 * Validates front, back, and is_ai_generated fields
 */
const createFlashcardSchema = z.object({
  front: z
    .string()
    .min(VALIDATION_CONSTRAINTS.flashcard.front.min, {
      message: `Front text must be at least ${VALIDATION_CONSTRAINTS.flashcard.front.min} character`,
    })
    .max(VALIDATION_CONSTRAINTS.flashcard.front.max, {
      message: `Front text must not exceed ${VALIDATION_CONSTRAINTS.flashcard.front.max} characters`,
    }),
  back: z
    .string()
    .min(VALIDATION_CONSTRAINTS.flashcard.back.min, {
      message: `Back text must be at least ${VALIDATION_CONSTRAINTS.flashcard.back.min} character`,
    })
    .max(VALIDATION_CONSTRAINTS.flashcard.back.max, {
      message: `Back text must not exceed ${VALIDATION_CONSTRAINTS.flashcard.back.max} characters`,
    }),
  is_ai_generated: z.boolean(),
});

// ============================================================================
// POST Handler - Create Flashcard
// ============================================================================

/**
 * POST /api/flashcards
 * Creates a new flashcard for the authenticated user
 *
 * Request Body:
 * {
 *   "front": "Question text",
 *   "back": "Answer text",
 *   "is_ai_generated": false
 * }
 *
 * Success Response (201):
 * {
 *   "data": { ...FlashcardDTO }
 * }
 *
 * Error Responses:
 * - 400: Validation error
 * - 401: Unauthorized
 * - 500: Server error
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // ========================================================================
    // Step 1: Get Supabase Client
    // ========================================================================

    const supabase = locals.supabase;
    if (!supabase) {
      return new Response(
        JSON.stringify({
          error: "Supabase client not available",
        } satisfies ApiErrorResponse),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================================
    // Step 2: Authenticate User
    // ========================================================================

    // // Production: Verify user session
    // const {
    //   data: { user },
    //   error: authError,
    // } = await supabase.auth.getUser();
    //
    // // Guard: Check authentication
    // if (authError || !user) {
    //   return new Response(
    //     JSON.stringify({
    //       error: "Unauthorized. Please log in.",
    //     } satisfies ApiErrorResponse),
    //     {
    //       status: 401,
    //       headers: { "Content-Type": "application/json" },
    //     }
    //   );
    // }
    //
    // const userId = user.id;

    // Development: Use default user ID
    const userId = DEFAULT_USER_ID;

    // ========================================================================
    // Step 3: Parse and Validate Request Body
    // ========================================================================

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON in request body",
        } satisfies ApiErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate with Zod
    const validationResult = createFlashcardSchema.safeParse(body);

    if (!validationResult.success) {
      // Transform Zod errors to details object
      const details: Record<string, string[]> = {};
      for (const issue of validationResult.error.issues) {
        const path = issue.path.join(".");
        if (!details[path]) {
          details[path] = [];
        }
        details[path].push(issue.message);
      }

      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details,
        } satisfies ApiErrorResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const dto: CreateFlashcardDTO = validationResult.data;

    // ========================================================================
    // Step 4: Call Service to Create Flashcard
    // ========================================================================

    const createdCard = await createFlashcard(supabase, userId, dto);

    // ========================================================================
    // Step 5: Return Success Response
    // ========================================================================

    return new Response(
      JSON.stringify({
        data: createdCard,
      } satisfies ApiSuccessResponse<FlashcardDTO>),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // ========================================================================
    // Error Handling
    // ========================================================================

    // Log error for monitoring (in production: send to error tracking service)
    console.error("Error creating flashcard:", error);

    // Return generic error to client (don't leak implementation details)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to create flashcard",
      } satisfies ApiErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
