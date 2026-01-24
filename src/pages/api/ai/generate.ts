/**
 * API Endpoint: Generate Flashcards from Notes using AI
 *
 * POST /api/ai/generate
 *
 * This endpoint accepts user notes and returns AI-generated flashcard suggestions.
 * It does NOT save flashcards to the database - returns ephemeral drafts for user review.
 *
 * Authentication: DEV MODE - Using hardcoded DEFAULT_USER_ID (auth implementation pending)
 * Rate limiting: Should be implemented in production
 */

import type { APIRoute } from "astro";
import { z } from "zod";

import type { GenerateFlashcardsDTO, GenerateFlashcardsResponseDTO, ApiErrorResponse } from "../../../types";
import { VALIDATION_CONSTRAINTS } from "../../../types";
import { generateFlashcards } from "../../../lib/services/ai.service";
import { DEFAULT_USER_ID } from "../../../db/supabase.client";

// ============================================================================
// Configuration
// ============================================================================

export const prerender = false; // Dynamic endpoint - depends on user input and external API

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Zod schema for request body validation
 */
const GenerateFlashcardsSchema = z.object({
  note_content: z
    .string()
    .min(
      VALIDATION_CONSTRAINTS.ai.noteContent.min,
      `Note content must be at least ${VALIDATION_CONSTRAINTS.ai.noteContent.min} characters`
    )
    .max(
      VALIDATION_CONSTRAINTS.ai.noteContent.max,
      `Note content must not exceed ${VALIDATION_CONSTRAINTS.ai.noteContent.max} characters`
    )
    .trim(),
}) satisfies z.ZodType<GenerateFlashcardsDTO>;

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * POST handler for flashcard generation
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // ========================================================================
    // Step 1: Authentication Check
    // ========================================================================

    // DEV MODE: Using hardcoded user ID for development/testing
    // TODO: Uncomment the real authentication code below when auth is implemented
    // Note: userId is not used in this endpoint (no DB writes), but kept for consistency
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
    //   return createErrorResponse(401, "Authentication required. Please log in to generate flashcards.", "UNAUTHORIZED");
    // }
    //
    // const userId = user.id;

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
    const validationResult = GenerateFlashcardsSchema.safeParse(requestBody);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten();
      return createErrorResponse(
        422,
        "Validation failed",
        "VALIDATION_ERROR",
        errors.fieldErrors as Record<string, string[]>
      );
    }

    const { note_content } = validationResult.data;

    // ========================================================================
    // Step 3: Call AI Service to Generate Flashcards
    // ========================================================================

    let drafts;

    try {
      drafts = await generateFlashcards(note_content);
    } catch (error) {
      // Determine error type and return appropriate response
      if (error instanceof Error) {
        // Timeout errors
        if (error.message.includes("timed out")) {
          return createErrorResponse(504, error.message, "GATEWAY_TIMEOUT");
        }

        // Configuration errors (missing API key)
        if (error.message.includes("not configured")) {
          return createErrorResponse(
            500,
            "AI service is not properly configured. Please contact support.",
            "CONFIGURATION_ERROR"
          );
        }

        // API errors (OpenRouter issues)
        if (error.message.includes("OpenRouter")) {
          return createErrorResponse(
            500,
            "Failed to communicate with AI service. Please try again later.",
            "AI_SERVICE_ERROR"
          );
        }

        // Parsing errors (AI returned invalid format)
        if (error.message.includes("parse") || error.message.includes("JSON")) {
          return createErrorResponse(
            500,
            "AI service returned invalid response. Please try again.",
            "AI_RESPONSE_ERROR"
          );
        }

        // Validation errors from service
        if (error.message.includes("too short") || error.message.includes("too long")) {
          return createErrorResponse(422, error.message, "VALIDATION_ERROR");
        }
      }

      // Generic error fallback
      return createErrorResponse(500, "An unexpected error occurred while generating flashcards", "INTERNAL_ERROR");
    }

    // ========================================================================
    // Step 4: Return Success Response
    // ========================================================================

    const response: GenerateFlashcardsResponseDTO = {
      drafts,
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
