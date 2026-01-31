/**
 * Flashcard Service - Handles flashcard CRUD operations
 *
 * This service manages flashcard creation, retrieval, and updates.
 * FSRS parameters are initialized with database defaults on creation.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../db/database.types";
import type {
  CreateFlashcardDTO,
  FlashcardDTO,
  BatchCreateFlashcardsResponseDTO,
  GetFlashcardsQueryDTO,
  GetFlashcardsResponseDTO,
  UpdateFlashcardDTO,
  UserStatsDTO,
} from "../../types";

// ============================================================================
// Types
// ============================================================================

type SupabaseClientType = SupabaseClient<Database>;

// ============================================================================
// Service Implementation
// ============================================================================

/**
 * Creates a new flashcard for the authenticated user
 *
 * Flow:
 * 1. Validate input data (handled by Zod at endpoint level)
 * 2. Insert flashcard with user_id and provided content
 * 3. Database applies default FSRS parameters automatically
 * 4. Return created flashcard with all fields
 *
 * @param supabase - Supabase client instance (from context.locals)
 * @param userId - ID of the authenticated user
 * @param dto - Flashcard data (front, back, is_ai_generated)
 * @returns Created flashcard with all FSRS parameters
 * @throws Error if database insert fails
 */
export async function createFlashcard(
  supabase: SupabaseClientType,
  userId: string,
  dto: CreateFlashcardDTO
): Promise<FlashcardDTO> {
  const { front, back, is_ai_generated } = dto;

  // ========================================================================
  // Step 1: Insert Flashcard
  // ========================================================================

  // Insert with only required fields and user_id
  // Database will apply default values for FSRS parameters:
  // - state: 0 (New)
  // - difficulty: 0
  // - stability: 0
  // - due: NOW() (immediately available for study)
  // - elapsed_days: 0
  // - scheduled_days: 0
  // - reps: 0
  // - lapses: 0
  // - last_review: NULL
  const { data: createdCard, error: insertError } = await supabase
    .from("flashcards")
    .insert({
      user_id: userId,
      front: front,
      back: back,
      is_ai_generated: is_ai_generated,
    })
    .select()
    .single();

  // Guard: Check for insert errors
  if (insertError || !createdCard) {
    throw new Error(`Failed to create flashcard: ${insertError?.message || "Unknown error"}`);
  }

  // ========================================================================
  // Step 2: Return Created Flashcard
  // ========================================================================

  return createdCard;
}

/**
 * Creates multiple flashcards in a single batch operation
 *
 * Flow:
 * 1. Validate input (handled by Zod at endpoint level)
 * 2. Prepare array of flashcard objects with user_id
 * 3. Perform single bulk insert into database
 * 4. Database applies default FSRS parameters automatically for all cards
 * 5. Return array of created flashcard IDs
 *
 * @param supabase - Supabase client instance (from context.locals)
 * @param userId - ID of the authenticated user
 * @param cards - Array of flashcard data (1-100 items)
 * @returns Array of created flashcard IDs in same order as input
 * @throws Error if database insert fails or if input array is empty/too large
 */
export async function createFlashcardBatch(
  supabase: SupabaseClientType,
  userId: string,
  cards: CreateFlashcardDTO[]
): Promise<BatchCreateFlashcardsResponseDTO> {
  // ========================================================================
  // Step 1: Prepare Batch Insert Data
  // ========================================================================

  // Map cards to database insert format with user_id
  const cardsToInsert = cards.map((card) => ({
    user_id: userId,
    front: card.front,
    back: card.back,
    is_ai_generated: card.is_ai_generated,
  }));

  // ========================================================================
  // Step 2: Perform Bulk Insert
  // ========================================================================

  // Single insert query for all cards
  // Database will apply default values for FSRS parameters for each card:
  // - state: 0 (New)
  // - difficulty: 0
  // - stability: 0
  // - due: NOW() (immediately available for study)
  // - elapsed_days: 0
  // - scheduled_days: 0
  // - reps: 0
  // - lapses: 0
  // - last_review: NULL
  const { data: createdCards, error: insertError } = await supabase
    .from("flashcards")
    .insert(cardsToInsert)
    .select("id");

  // Guard: Check for insert errors
  if (insertError || !createdCards) {
    throw new Error(`Failed to create flashcards: ${insertError?.message || "Unknown error"}`);
  }

  // ========================================================================
  // Step 3: Return Created Flashcard IDs
  // ========================================================================

  // Extract IDs in same order as input
  const ids = createdCards.map((card) => card.id);

  return { ids };
}

/**
 * Retrieves flashcards for the authenticated user
 *
 * Flow:
 * 1. Build query with user_id filter
 * 2. Apply mode filter (study vs all)
 * 3. Apply search filter if provided
 * 4. Sort results appropriately
 * 5. Return flashcards with count
 *
 * @param supabase - Supabase client instance (from context.locals)
 * @param userId - ID of the authenticated user
 * @param query - Query parameters (mode, q)
 * @returns Flashcards matching the query with total count
 * @throws Error if database query fails
 */
export async function getFlashcards(
  supabase: SupabaseClientType,
  userId: string,
  query: GetFlashcardsQueryDTO
): Promise<GetFlashcardsResponseDTO> {
  const { mode = "all", q } = query;

  // ========================================================================
  // Step 1: Build Base Query
  // ========================================================================

  // Start with base query - select all fields and enable count
  let queryBuilder = supabase.from("flashcards").select("*", { count: "exact" }).eq("user_id", userId);

  // ========================================================================
  // Step 2: Apply Mode Filter
  // ========================================================================

  if (mode === "study") {
    // Only cards due for review (due <= now)
    const now = new Date().toISOString();
    queryBuilder = queryBuilder.lte("due", now);
  }

  // ========================================================================
  // Step 3: Apply Search Filter
  // ========================================================================

  if (q && q.trim().length > 0) {
    // Search in both front and back fields using case-insensitive LIKE
    // Pattern: %searchTerm% to match anywhere in the text
    const searchPattern = `%${q.trim()}%`;
    queryBuilder = queryBuilder.or(`front.ilike.${searchPattern},back.ilike.${searchPattern}`);
  }

  // ========================================================================
  // Step 4: Apply Sorting
  // ========================================================================

  if (mode === "study") {
    // For study mode: sort by due date (earliest first)
    queryBuilder = queryBuilder.order("due", { ascending: true });
  } else {
    // For all mode: sort by creation date (newest first)
    queryBuilder = queryBuilder.order("created_at", { ascending: false });
  }

  // ========================================================================
  // Step 5: Execute Query
  // ========================================================================

  const { data, error, count } = await queryBuilder;

  // Guard: Check for query errors
  if (error) {
    throw new Error(`Failed to fetch flashcards: ${error.message}`);
  }

  // ========================================================================
  // Step 6: Return Results
  // ========================================================================

  return {
    data: data || [],
    count: count || 0,
  };
}

/**
 * Updates an existing flashcard's content (front/back text only)
 *
 * Flow:
 * 1. Validate input data (handled by Zod at endpoint level)
 * 2. Update flashcard with provided fields (partial update)
 * 3. Filter by both id and user_id for security (ownership check)
 * 4. Return updated flashcard with all fields
 *
 * @param supabase - Supabase client instance (from context.locals)
 * @param id - UUID of the flashcard to update
 * @param userId - ID of the authenticated user (for ownership check)
 * @param dto - Partial flashcard data (front and/or back)
 * @returns Updated flashcard with all fields, or null if not found/unauthorized
 * @throws Error if database update fails
 */
export async function updateFlashcard(
  supabase: SupabaseClientType,
  id: string,
  userId: string,
  dto: UpdateFlashcardDTO
): Promise<FlashcardDTO | null> {
  // ========================================================================
  // Step 1: Prepare Update Data
  // ========================================================================

  // Only update fields that are provided
  // updated_at will be automatically set by database trigger
  const updateData: UpdateFlashcardDTO = {};
  if (dto.front !== undefined) {
    updateData.front = dto.front;
  }
  if (dto.back !== undefined) {
    updateData.back = dto.back;
  }

  // ========================================================================
  // Step 2: Update Flashcard with Ownership Check
  // ========================================================================

  // Update only if card exists AND belongs to the user (IDOR protection)
  const { data: updatedCard, error: updateError } = await supabase
    .from("flashcards")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  // Guard: Check for update errors
  if (updateError) {
    // PGRST116 = Row not found (404 case)
    if (updateError.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to update flashcard: ${updateError.message}`);
  }

  // ========================================================================
  // Step 3: Return Updated Flashcard
  // ========================================================================

  return updatedCard;
}

/**
 * Permanently deletes a flashcard from the database
 *
 * Flow:
 * 1. Delete flashcard with ownership check (id + user_id)
 * 2. Database automatically cascades deletion to review_logs
 * 3. Return true if deleted, false if not found/unauthorized
 *
 * @param supabase - Supabase client instance (from context.locals)
 * @param id - UUID of the flashcard to delete
 * @param userId - ID of the authenticated user (for ownership check)
 * @returns true if flashcard was deleted, false if not found or unauthorized
 * @throws Error if database delete fails
 */
export async function deleteFlashcard(supabase: SupabaseClientType, id: string, userId: string): Promise<boolean> {
  // ========================================================================
  // Step 1: Delete Flashcard with Ownership Check
  // ========================================================================

  // Delete only if card exists AND belongs to the user (IDOR protection)
  // Database will automatically delete related review_logs (ON DELETE CASCADE)
  const { error: deleteError, count } = await supabase
    .from("flashcards")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", userId);

  // Guard: Check for delete errors
  if (deleteError) {
    throw new Error(`Failed to delete flashcard: ${deleteError.message}`);
  }

  // ========================================================================
  // Step 2: Return Deletion Status
  // ========================================================================

  // Return true if at least one row was deleted, false otherwise
  return (count ?? 0) > 0;
}

/**
 * Retrieves flashcard statistics for the authenticated user
 *
 * Flow:
 * 1. Execute two parallel count queries (total and due)
 * 2. Return counts without fetching actual flashcard data
 *
 * This is optimized for badge display in navigation and dashboard
 * where we only need counts, not the actual flashcards.
 *
 * @param supabase - Supabase client instance (from context.locals)
 * @param userId - ID of the authenticated user
 * @returns Statistics with total and study counts
 * @throws Error if database query fails
 */
export async function getStats(supabase: SupabaseClientType, userId: string): Promise<UserStatsDTO> {
  // ========================================================================
  // Step 1: Execute Parallel Count Queries
  // ========================================================================

  const now = new Date().toISOString();

  // Query 1: Total count of all user's flashcards
  const totalCountPromise = supabase
    .from("flashcards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // Query 2: Count of flashcards due for review
  const studyCountPromise = supabase
    .from("flashcards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .lte("due", now);

  // Execute both queries in parallel for efficiency
  const [totalResult, studyResult] = await Promise.all([totalCountPromise, studyCountPromise]);

  // Guard: Check for query errors
  if (totalResult.error) {
    throw new Error(`Failed to fetch total count: ${totalResult.error.message}`);
  }
  if (studyResult.error) {
    throw new Error(`Failed to fetch study count: ${studyResult.error.message}`);
  }

  // ========================================================================
  // Step 2: Return Statistics
  // ========================================================================

  return {
    totalCount: totalResult.count ?? 0,
    studyCount: studyResult.count ?? 0,
  };
}
