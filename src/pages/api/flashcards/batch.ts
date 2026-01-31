/**
 * Flashcards Batch API Endpoint
 * POST /api/flashcards/batch - Create multiple flashcards at once
 *
 * This endpoint allows authenticated users to create 1-100 flashcards in a single request.
 * Useful for saving AI-generated flashcards or importing card sets.
 */

import type { APIRoute } from "astro";
import { z } from "zod";

import { createFlashcardBatch } from "../../../lib/services/flashcard.service";
import type { ApiErrorResponse, BatchCreateFlashcardsDTO, BatchCreateFlashcardsResponseDTO } from "../../../types";
import { VALIDATION_CONSTRAINTS } from "../../../types";

// Disable prerendering for API routes
export const prerender = false;

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Zod schema for single flashcard in batch
 * Same validation as single create endpoint
 */
const flashcardItemSchema = z.object({
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

/**
 * Zod schema for batch flashcard creation
 * Validates array of cards with min/max constraints
 */
const batchCreateFlashcardsSchema = z.object({
  cards: z
    .array(flashcardItemSchema)
    .min(VALIDATION_CONSTRAINTS.batch.cards.min, {
      message: `Must provide at least ${VALIDATION_CONSTRAINTS.batch.cards.min} card`,
    })
    .max(VALIDATION_CONSTRAINTS.batch.cards.max, {
      message: `Cannot create more than ${VALIDATION_CONSTRAINTS.batch.cards.max} cards at once`,
    }),
});

// ============================================================================
// POST Handler - Batch Create Flashcards
// ============================================================================

/**
 * POST /api/flashcards/batch
 * Creates multiple flashcards for the authenticated user in a single operation
 *
 * Request Body:
 * {
 *   "cards": [
 *     {
 *       "front": "Question 1",
 *       "back": "Answer 1",
 *       "is_ai_generated": true
 *     },
 *     {
 *       "front": "Question 2",
 *       "back": "Answer 2",
 *       "is_ai_generated": true
 *     }
 *   ]
 * }
 *
 * Success Response (201):
 * {
 *   "ids": ["uuid-1", "uuid-2"]
 * }
 *
 * Error Responses:
 * - 400: Validation error (empty array, >100 items, invalid card data)
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

    // Check if user is authenticated (middleware should have set this)
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized. Please log in.",
        } satisfies ApiErrorResponse),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const userId = locals.user.id;

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
    const validationResult = batchCreateFlashcardsSchema.safeParse(body);

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

    const dto: BatchCreateFlashcardsDTO = validationResult.data;

    // ========================================================================
    // Step 4: Call Service to Create Flashcards
    // ========================================================================

    const result = await createFlashcardBatch(supabase, userId, dto.cards);

    // ========================================================================
    // Step 5: Return Success Response
    // ========================================================================

    return new Response(JSON.stringify(result satisfies BatchCreateFlashcardsResponseDTO), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // ========================================================================
    // Error Handling
    // ========================================================================

    // Log error for monitoring (in production: send to error tracking service)
    if (error instanceof Error) {
      throw error;
    }

    // Return generic error to client (don't leak implementation details)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to create flashcards",
      } satisfies ApiErrorResponse),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
