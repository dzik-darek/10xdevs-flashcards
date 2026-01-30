/**
 * Flashcard Operations Endpoint
 * PATCH /api/flashcards/:id - Update flashcard content
 * DELETE /api/flashcards/:id - Delete flashcard permanently
 *
 * Updates content (front/back) of an existing flashcard.
 * Does NOT modify FSRS parameters (those are updated only through reviews).
 */

import type { APIRoute } from "astro";
import { z } from "zod";

import { deleteFlashcard, updateFlashcard } from "../../../lib/services/flashcard.service";
import type { ApiErrorResponse, UpdateFlashcardDTO } from "../../../types";
import { VALIDATION_CONSTRAINTS } from "../../../types";

// Disable prerendering for API routes
export const prerender = false;

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * UUID v4 validation pattern
 * Ensures id parameter is a valid UUID
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Zod schema for update flashcard request body
 *
 * Rules:
 * - Both fields are optional (partial update)
 * - At least one field must be provided
 * - front: 1-500 characters
 * - back: 1-1000 characters
 */
const updateFlashcardSchema = z
  .object({
    front: z
      .string()
      .min(VALIDATION_CONSTRAINTS.flashcard.front.min, {
        message: `Front must be at least ${VALIDATION_CONSTRAINTS.flashcard.front.min} character`,
      })
      .max(VALIDATION_CONSTRAINTS.flashcard.front.max, {
        message: `Front must not exceed ${VALIDATION_CONSTRAINTS.flashcard.front.max} characters`,
      })
      .optional(),
    back: z
      .string()
      .min(VALIDATION_CONSTRAINTS.flashcard.back.min, {
        message: `Back must be at least ${VALIDATION_CONSTRAINTS.flashcard.back.min} character`,
      })
      .max(VALIDATION_CONSTRAINTS.flashcard.back.max, {
        message: `Back must not exceed ${VALIDATION_CONSTRAINTS.flashcard.back.max} characters`,
      })
      .optional(),
  })
  .refine((data) => data.front !== undefined || data.back !== undefined, {
    message: "At least one field (front or back) must be provided",
  });

// ============================================================================
// PATCH Handler
// ============================================================================

/**
 * PATCH /api/flashcards/:id
 *
 * Updates flashcard content (front and/or back).
 * FSRS parameters remain unchanged.
 *
 * Request Body:
 * {
 *   "front": "Updated question (optional)",
 *   "back": "Updated answer (optional)"
 * }
 *
 * Responses:
 * - 200: Success - returns updated flashcard
 * - 400: Bad Request - invalid UUID or validation error
 * - 401: Unauthorized - no active session (currently disabled)
 * - 404: Not Found - flashcard doesn't exist or belongs to different user
 * - 500: Internal Server Error - database error
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    // ========================================================================
    // Step 1: Validate ID Parameter
    // ========================================================================

    const { id } = params;

    // Guard: Check if ID is provided
    if (!id) {
      const errorResponse: ApiErrorResponse = {
        error: "Flashcard ID is required",
        code: "MISSING_ID",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Guard: Validate UUID format
    if (!UUID_PATTERN.test(id)) {
      const errorResponse: ApiErrorResponse = {
        error: "Invalid flashcard ID format. Expected UUID v4.",
        code: "INVALID_UUID",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ========================================================================
    // Step 2: Authentication Check
    // ========================================================================

    // Check if user is authenticated (middleware should have set this)
    if (!locals.user) {
      const errorResponse: ApiErrorResponse = {
        error: "Authentication required",
        code: "UNAUTHORIZED",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = locals.user.id;

    // ========================================================================
    // Step 3: Parse and Validate Request Body
    // ========================================================================

    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      const errorResponse: ApiErrorResponse = {
        error: "Invalid JSON in request body",
        code: "INVALID_JSON",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate with Zod schema
    const validationResult = updateFlashcardSchema.safeParse(requestBody);

    // Guard: Check validation errors
    if (!validationResult.success) {
      const details: Record<string, string[]> = {};
      validationResult.error.errors.forEach((err) => {
        const path = err.path.join(".") || "general";
        if (!details[path]) {
          details[path] = [];
        }
        details[path].push(err.message);
      });

      const errorResponse: ApiErrorResponse = {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details,
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const updateData: UpdateFlashcardDTO = validationResult.data;

    // ========================================================================
    // Step 4: Update Flashcard via Service
    // ========================================================================

    const supabase = locals.supabase;

    const updatedFlashcard = await updateFlashcard(supabase, id, userId, updateData);

    // Guard: Check if flashcard was found
    if (!updatedFlashcard) {
      const errorResponse: ApiErrorResponse = {
        error: "Flashcard not found or you don't have permission to edit it",
        code: "NOT_FOUND",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ========================================================================
    // Step 5: Return Updated Flashcard
    // ========================================================================

    return new Response(JSON.stringify(updatedFlashcard), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // ========================================================================
    // Error Handling: Unexpected Errors
    // ========================================================================

    console.error("Error updating flashcard:", error);

    const errorResponse: ApiErrorResponse = {
      error: "An unexpected error occurred while updating the flashcard",
      code: "INTERNAL_ERROR",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// ============================================================================
// DELETE Handler
// ============================================================================

/**
 * DELETE /api/flashcards/:id
 *
 * Permanently deletes a flashcard and all associated review logs.
 * This operation is irreversible.
 *
 * Request Body: Empty
 *
 * Responses:
 * - 204: No Content - flashcard successfully deleted
 * - 400: Bad Request - invalid UUID format
 * - 401: Unauthorized - no active session (currently disabled)
 * - 404: Not Found - flashcard doesn't exist or belongs to different user
 * - 500: Internal Server Error - database error
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // ========================================================================
    // Step 1: Validate ID Parameter
    // ========================================================================

    const { id } = params;

    // Guard: Check if ID is provided
    if (!id) {
      const errorResponse: ApiErrorResponse = {
        error: "Flashcard ID is required",
        code: "MISSING_ID",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Guard: Validate UUID format
    if (!UUID_PATTERN.test(id)) {
      const errorResponse: ApiErrorResponse = {
        error: "Invalid flashcard ID format. Expected UUID v4.",
        code: "INVALID_UUID",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ========================================================================
    // Step 2: Authentication Check
    // ========================================================================

    // Check if user is authenticated (middleware should have set this)
    if (!locals.user) {
      const errorResponse: ApiErrorResponse = {
        error: "Authentication required",
        code: "UNAUTHORIZED",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = locals.user.id;

    // ========================================================================
    // Step 3: Delete Flashcard via Service
    // ========================================================================

    const supabase = locals.supabase;

    const deleted = await deleteFlashcard(supabase, id, userId);

    // Guard: Check if flashcard was found and deleted
    if (!deleted) {
      const errorResponse: ApiErrorResponse = {
        error: "Flashcard not found or you don't have permission to delete it",
        code: "NOT_FOUND",
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ========================================================================
    // Step 4: Return Success (No Content)
    // ========================================================================

    // 204 No Content - successful deletion with no response body
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // ========================================================================
    // Error Handling: Unexpected Errors
    // ========================================================================

    console.error("Error deleting flashcard:", error);

    const errorResponse: ApiErrorResponse = {
      error: "An unexpected error occurred while deleting the flashcard",
      code: "INTERNAL_ERROR",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
