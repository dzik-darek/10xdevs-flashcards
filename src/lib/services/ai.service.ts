/**
 * AI Service for generating flashcards using OpenRouter API
 *
 * This service handles communication with OpenRouter's LLM API to generate
 * flashcard suggestions from user notes. It uses structured prompts to ensure
 * consistent JSON output format.
 */

import type { FlashcardDraftDTO } from "../../types";
import { VALIDATION_CONSTRAINTS } from "../../types";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * OpenRouter API request structure
 * @see https://openrouter.ai/docs#requests
 */
interface OpenRouterRequest {
  model: string;
  messages: {
    role: "system" | "user" | "assistant";
    content: string;
  }[];
  temperature?: number;
  max_tokens?: number;
}

/**
 * OpenRouter API response structure
 * @see https://openrouter.ai/docs#responses
 */
interface OpenRouterResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Expected structure from AI response
 */
// interface AiGeneratedFlashcards {
//   drafts: FlashcardDraftDTO[];
// }

// ============================================================================
// Constants
// ============================================================================

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini"; // Fast, cost-effective model for this task
const REQUEST_TIMEOUT_MS = 60000; // 60 seconds
const MAX_DRAFTS_TO_GENERATE = 10;

// ============================================================================
// Service Implementation
// ============================================================================

/**
 * Generates flashcard drafts from user's note content using AI
 *
 * @param noteContent - User's note text to analyze (10-20000 chars)
 * @returns Promise resolving to array of flashcard drafts
 * @throws Error if API key is missing, API request fails, or response parsing fails
 */
export async function generateFlashcards(noteContent: string): Promise<FlashcardDraftDTO[]> {
  // Guard: Check API key configuration
  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured in environment variables");
  }

  // Guard: Validate input length
  const contentLength = noteContent.trim().length;
  if (contentLength < VALIDATION_CONSTRAINTS.ai.noteContent.min) {
    throw new Error(
      `Note content too short. Minimum ${VALIDATION_CONSTRAINTS.ai.noteContent.min} characters required.`
    );
  }
  if (contentLength > VALIDATION_CONSTRAINTS.ai.noteContent.max) {
    throw new Error(`Note content too long. Maximum ${VALIDATION_CONSTRAINTS.ai.noteContent.max} characters allowed.`);
  }

  // Construct the request payload
  const requestPayload: OpenRouterRequest = {
    model: DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(),
      },
      {
        role: "user",
        content: buildUserPrompt(noteContent),
      },
    ],
    temperature: 0.7, // Balanced creativity vs. consistency
    max_tokens: 2000, // Sufficient for ~10 flashcards
  };

  // Setup abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    // Make the API request
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle non-OK HTTP responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenRouter API request failed: ${response.status} ${response.statusText}. ${errorData.error?.message || ""}`
      );
    }

    // Parse the response
    const data: OpenRouterResponse = await response.json();

    // Check for API-level errors
    if (data.error) {
      throw new Error(`OpenRouter API error: ${data.error.message}`);
    }

    // Extract the AI's message content
    const aiMessage = data.choices?.[0]?.message?.content;
    if (!aiMessage) {
      throw new Error("No content in AI response");
    }

    // Parse and validate the JSON response
    const flashcards = parseAndValidateAiResponse(aiMessage);

    return flashcards;
  } catch (error) {
    // Handle timeout specifically
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("AI generation request timed out. Please try again with shorter content.");
    }

    // Re-throw other errors
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Builds the system prompt that defines AI's role and output format
 */
function buildSystemPrompt(): string {
  return `You are an expert educational content creator specializing in creating effective flashcards for spaced repetition learning.

Your task is to analyze the user's notes and generate high-quality flashcard pairs (front/back).

CRITICAL INSTRUCTIONS:
1. Generate between 3 and ${MAX_DRAFTS_TO_GENERATE} flashcards based on the content complexity and length
2. Each flashcard should focus on ONE specific concept, fact, or idea
3. Front (question) should be clear, concise, and unambiguous (max ${VALIDATION_CONSTRAINTS.flashcard.front.max} characters)
4. Back (answer) should be complete but concise (max ${VALIDATION_CONSTRAINTS.flashcard.back.max} characters)
5. Use active recall principles - questions should require genuine thinking
6. Avoid yes/no questions - prefer "What", "How", "Why", "Explain" formats
7. Keep language consistent with the user's input language

OUTPUT FORMAT:
You MUST respond with ONLY a valid JSON object in this exact structure:
{
  "drafts": [
    {
      "front": "Question or prompt text",
      "back": "Answer or explanation text"
    }
  ]
}

Do NOT include any text before or after the JSON. Do NOT use markdown code blocks. Just pure JSON.`;
}

/**
 * Builds the user prompt with the note content
 */
function buildUserPrompt(noteContent: string): string {
  return `Please analyze the following notes and generate flashcards:\n\n${noteContent}`;
}

/**
 * Parses AI response text and validates the structure
 *
 * @param aiResponse - Raw text response from AI
 * @returns Validated array of flashcard drafts
 * @throws Error if parsing fails or validation fails
 */
function parseAndValidateAiResponse(aiResponse: string): FlashcardDraftDTO[] {
  // Remove potential markdown code blocks if AI ignored instructions
  let cleanedResponse = aiResponse.trim();
  if (cleanedResponse.startsWith("```json")) {
    cleanedResponse = cleanedResponse.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleanedResponse.startsWith("```")) {
    cleanedResponse = cleanedResponse.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanedResponse);
  } catch {
    throw new Error(`Failed to parse AI response as JSON. Response: ${aiResponse.substring(0, 200)}...`);
  }

  // Validate structure
  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI response is not a valid object");
  }

  const data = parsed as Record<string, unknown>;

  if (!Array.isArray(data.drafts)) {
    throw new Error('AI response missing "drafts" array');
  }

  if (data.drafts.length === 0) {
    throw new Error("AI generated no flashcards");
  }

  // Validate and sanitize each draft
  const validatedDrafts: FlashcardDraftDTO[] = [];

  for (const draft of data.drafts) {
    if (!draft || typeof draft !== "object") {
      // Skip invalid draft silently
      continue;
    }

    const item = draft as Record<string, unknown>;

    if (typeof item.front !== "string" || typeof item.back !== "string") {
      // Skip draft with invalid types
      continue;
    }

    // Sanitize: trim whitespace
    const front = item.front.trim();
    const back = item.back.trim();

    // Validate: check minimum lengths
    if (front.length < VALIDATION_CONSTRAINTS.flashcard.front.min) {
      // Skip draft with front too short
      continue;
    }
    if (back.length < VALIDATION_CONSTRAINTS.flashcard.back.min) {
      // Skip draft with back too short
      continue;
    }

    // Sanitize: truncate if too long (shouldn't happen with good prompt)
    const sanitizedFront = front.substring(0, VALIDATION_CONSTRAINTS.flashcard.front.max);
    const sanitizedBack = back.substring(0, VALIDATION_CONSTRAINTS.flashcard.back.max);

    validatedDrafts.push({
      front: sanitizedFront,
      back: sanitizedBack,
    });
  }

  if (validatedDrafts.length === 0) {
    throw new Error("No valid flashcards after validation");
  }

  return validatedDrafts;
}
