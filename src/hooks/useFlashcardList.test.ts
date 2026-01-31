/**
 * Unit tests for useFlashcardList hook
 *
 * Tests cover:
 * - Initial data fetching
 * - Search query changes
 * - Optimistic updates (delete/update)
 * - Error handling (401, 404, 422, network errors)
 * - Refresh functionality
 * - Edge cases and boundary conditions
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useFlashcardList } from "./useFlashcardList";
import type { FlashcardDTO, GetFlashcardsResponseDTO, UpdateFlashcardDTO } from "@/types";

// Mock data factory
const createMockFlashcard = (overrides?: Partial<FlashcardDTO>): FlashcardDTO => ({
  id: "test-id-1",
  user_id: "user-123",
  front: "Test Question",
  back: "Test Answer",
  due: new Date().toISOString(),
  state: 0,
  difficulty: 5,
  stability: 1,
  reps: 0,
  lapses: 0,
  elapsed_days: 0,
  scheduled_days: 0,
  last_review: null,
  is_ai_generated: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockResponse = (flashcards: FlashcardDTO[]): GetFlashcardsResponseDTO => ({
  data: flashcards,
  count: flashcards.length,
});

// Helper to create mock fetch Response
const createFetchResponse = (data: unknown, ok = true, status = 200): Response =>
  ({
    ok,
    status,
    json: async () => data,
    statusText: ok ? "OK" : "Error",
    headers: new Headers(),
    redirected: false,
    type: "basic",
    url: "",
  }) as Response;

describe("useFlashcardList", () => {
  // Store original fetch
  const originalFetch = global.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create and assign mock fetch before each test
    mockFetch = vi.fn();
    global.fetch = mockFetch as typeof fetch;
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe("Initial Data Fetching", () => {
    it("should fetch flashcards on mount", async () => {
      const mockFlashcards = [
        createMockFlashcard({ id: "1", front: "Q1" }),
        createMockFlashcard({ id: "2", front: "Q2" }),
      ];

      const mockResponse = createFetchResponse(createMockResponse(mockFlashcards));
      mockFetch.mockImplementation(() => Promise.resolve(mockResponse));

      const { result } = renderHook(() => useFlashcardList());

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.flashcards).toEqual([]);
      expect(result.current.error).toBeNull();

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flashcards).toEqual(mockFlashcards);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/flashcards?mode=all"));
    });

    it("should fetch empty array when user has no flashcards", async () => {
      const mockResponse = createFetchResponse(createMockResponse([]));
      mockFetch.mockImplementation(() => Promise.resolve(mockResponse));

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flashcards).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it("should set error state when fetch fails with 401 Unauthorized", async () => {
      const mockResponse = createFetchResponse(null, false, 401);
      mockFetch.mockImplementation(() => Promise.resolve(mockResponse));

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flashcards).toEqual([]);
      expect(result.current.error).toBe("Musisz być zalogowany, aby zobaczyć fiszki");
    });

    it("should set generic error message for other HTTP errors", async () => {
      const mockResponse = createFetchResponse(null, false, 500);
      mockFetch.mockImplementation(() => Promise.resolve(mockResponse));

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flashcards).toEqual([]);
      expect(result.current.error).toBe("Nie udało się załadować fiszek");
    });

    it("should handle network errors gracefully", async () => {
      mockFetch.mockImplementation(() => Promise.reject(new Error("Network error")));

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flashcards).toEqual([]);
      expect(result.current.error).toBe("Network error");
    });

    it("should handle non-Error exceptions", async () => {
      mockFetch.mockImplementation(() => Promise.reject("String error"));

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Nie udało się załadować fiszek. Spróbuj ponownie.");
    });
  });

  describe("Search Query Functionality", () => {
    it("should fetch with search query when setSearchQuery is called", async () => {
      const mockFlashcards = [createMockFlashcard({ front: "JavaScript" })];

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse([]),
      } as Response);

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock search fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockFlashcards),
      } as Response);

      // Set search query
      act(() => {
        result.current.setSearchQuery("JavaScript");
      });

      await waitFor(() => {
        expect(result.current.flashcards).toEqual(mockFlashcards);
      });

      expect(mockFetch).toHaveBeenLastCalledWith(expect.stringContaining("q=JavaScript"));
    });

    it("should trim search query before sending to API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockResponse([]),
      } as Response);

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSearchQuery("  test  ");
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith(expect.stringContaining("q=test"));
      });
    });

    it("should not include q parameter when search query is empty", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockResponse([]),
      } as Response);

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSearchQuery("");
      });

      await waitFor(() => {
        const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        expect(lastCall[0]).not.toContain("q=");
      });
    });

    it("should not include q parameter when search query is only whitespace", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockResponse([]),
      } as Response);

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSearchQuery("   ");
      });

      await waitFor(() => {
        const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        expect(lastCall[0]).not.toContain("q=");
      });
    });
  });

  describe("Delete Flashcard", () => {
    it("should optimistically remove flashcard from list on successful delete", async () => {
      const mockFlashcards = [
        createMockFlashcard({ id: "1" }),
        createMockFlashcard({ id: "2" }),
        createMockFlashcard({ id: "3" }),
      ];

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockFlashcards),
      } as Response);

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.flashcards).toHaveLength(3);
      });

      // Mock delete response
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      // Delete flashcard
      await act(async () => {
        await result.current.deleteCard("2");
      });

      expect(result.current.flashcards).toHaveLength(2);
      expect(result.current.flashcards.find((c) => c.id === "2")).toBeUndefined();
      expect(mockFetch).toHaveBeenLastCalledWith("/api/flashcards/2", { method: "DELETE" });
    });

    it("should throw error with 404 message when flashcard not found", async () => {
      const mockFlashcards = [createMockFlashcard({ id: "1" })];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockFlashcards),
      } as Response);

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.flashcards).toHaveLength(1);
      });

      // Mock 404 response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      await expect(result.current.deleteCard("999")).rejects.toThrow("Fiszka nie została znaleziona");

      // List should remain unchanged on error
      expect(result.current.flashcards).toHaveLength(1);
    });

    it("should throw generic error message for other delete failures", async () => {
      const mockFlashcards = [createMockFlashcard({ id: "1" })];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockFlashcards),
      } as Response);

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.flashcards).toHaveLength(1);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(result.current.deleteCard("1")).rejects.toThrow("Nie udało się usunąć fiszki");
    });

    it("should handle network errors during delete", async () => {
      const mockFlashcards = [createMockFlashcard({ id: "1" })];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockFlashcards),
      } as Response);

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.flashcards).toHaveLength(1);
      });

      mockFetch.mockRejectedValueOnce(new Error("Connection timeout"));

      await expect(result.current.deleteCard("1")).rejects.toThrow("Connection timeout");
    });
  });

  describe("Update Flashcard", () => {
    it("should optimistically update flashcard in list on successful update", async () => {
      const originalCard = createMockFlashcard({
        id: "1",
        front: "Old Question",
        back: "Old Answer",
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse([originalCard]),
      } as Response);

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.flashcards).toHaveLength(1);
      });

      const updatedCard = { ...originalCard, front: "New Question", back: "New Answer" };
      const updateData: UpdateFlashcardDTO = { front: "New Question", back: "New Answer" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedCard,
      } as Response);

      await act(async () => {
        await result.current.updateCard("1", updateData);
      });

      expect(result.current.flashcards[0].front).toBe("New Question");
      expect(result.current.flashcards[0].back).toBe("New Answer");
      expect(mockFetch).toHaveBeenLastCalledWith("/api/flashcards/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
    });

    it("should throw error with 404 message when updating non-existent flashcard", async () => {
      const mockFlashcards = [createMockFlashcard({ id: "1" })];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockFlashcards),
      } as Response);

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.flashcards).toHaveLength(1);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const updateData: UpdateFlashcardDTO = { front: "New Q" };

      await expect(result.current.updateCard("999", updateData)).rejects.toThrow("Fiszka nie została znaleziona");
    });

    it("should throw validation error message for 422 status", async () => {
      const mockFlashcards = [createMockFlashcard({ id: "1" })];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockFlashcards),
      } as Response);

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.flashcards).toHaveLength(1);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ error: "Front field exceeds maximum length" }),
      } as Response);

      const updateData: UpdateFlashcardDTO = { front: "x".repeat(501) };

      await expect(result.current.updateCard("1", updateData)).rejects.toThrow("Front field exceeds maximum length");
    });

    it("should handle 422 without custom error message", async () => {
      const mockFlashcards = [createMockFlashcard({ id: "1" })];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockFlashcards),
      } as Response);

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.flashcards).toHaveLength(1);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({}),
      } as Response);

      const updateData: UpdateFlashcardDTO = { front: "test" };

      await expect(result.current.updateCard("1", updateData)).rejects.toThrow("Nieprawidłowe dane");
    });

    it("should throw generic error for other update failures", async () => {
      const mockFlashcards = [createMockFlashcard({ id: "1" })];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockFlashcards),
      } as Response);

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.flashcards).toHaveLength(1);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(result.current.updateCard("1", { front: "test" })).rejects.toThrow("Nie udało się zapisać zmian");
    });

    it("should preserve other flashcards when updating one", async () => {
      const mockFlashcards = [
        createMockFlashcard({ id: "1", front: "Q1" }),
        createMockFlashcard({ id: "2", front: "Q2" }),
        createMockFlashcard({ id: "3", front: "Q3" }),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(mockFlashcards),
      } as Response);

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.flashcards).toHaveLength(3);
      });

      const updatedCard = { ...mockFlashcards[1], front: "Q2 Updated" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedCard,
      } as Response);

      await act(async () => {
        await result.current.updateCard("2", { front: "Q2 Updated" });
      });

      expect(result.current.flashcards).toHaveLength(3);
      expect(result.current.flashcards[0].front).toBe("Q1");
      expect(result.current.flashcards[1].front).toBe("Q2 Updated");
      expect(result.current.flashcards[2].front).toBe("Q3");
    });
  });

  describe("Refresh Functionality", () => {
    it("should refetch flashcards when refresh is called", async () => {
      const initialFlashcards = [createMockFlashcard({ id: "1" })];
      const refreshedFlashcards = [createMockFlashcard({ id: "1" }), createMockFlashcard({ id: "2" })];

      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(initialFlashcards),
      } as Response);

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.flashcards).toHaveLength(1);
      });

      // Refresh fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockResponse(refreshedFlashcards),
      } as Response);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.flashcards).toHaveLength(2);
    });

    it("should preserve search query when refreshing", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockResponse([]),
      } as Response);

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSearchQuery("test query");
      });

      await waitFor(() => {
        // URL encoding uses + for spaces
        expect(mockFetch).toHaveBeenLastCalledWith(expect.stringContaining("q=test"));
      });

      const callCountBefore = mockFetch.mock.calls.length;

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockFetch.mock.calls.length).toBe(callCountBefore + 1);
      expect(mockFetch).toHaveBeenLastCalledWith(expect.stringContaining("q=test"));
    });
  });

  describe("Edge Cases and Business Rules", () => {
    it("should handle large number of flashcards (performance)", async () => {
      const largeFlashcardSet = Array.from({ length: 1000 }, (_, i) =>
        createMockFlashcard({ id: `card-${i}`, front: `Question ${i}` })
      );

      const mockResponse = createFetchResponse(createMockResponse(largeFlashcardSet));
      mockFetch.mockImplementation(() => Promise.resolve(mockResponse));

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.flashcards).toHaveLength(1000);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should maintain data consistency after multiple rapid operations", async () => {
      const mockFlashcards = [createMockFlashcard({ id: "1" }), createMockFlashcard({ id: "2" })];

      mockFetch.mockResolvedValue(createFetchResponse(createMockResponse(mockFlashcards)));

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.flashcards).toHaveLength(2);
      });

      // Simulate rapid operations
      act(() => {
        result.current.setSearchQuery("test1");
        result.current.setSearchQuery("test2");
        result.current.setSearchQuery("");
      });

      await waitFor(() => {
        expect(result.current.searchQuery).toBe("");
      });

      // Should still maintain consistent state
      expect(result.current.flashcards).toHaveLength(2);
    });

    it("should always fetch with mode=all as per business rules", async () => {
      mockFetch.mockResolvedValueOnce(createFetchResponse(createMockResponse([])));

      renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("mode=all"));
      });
    });

    it("should construct correct URL with window.location.origin", async () => {
      mockFetch.mockResolvedValueOnce(createFetchResponse(createMockResponse([])));

      renderHook(() => useFlashcardList());

      await waitFor(() => {
        const callUrl = mockFetch.mock.calls[0][0] as string;
        expect(callUrl).toContain("http://");
        expect(callUrl).toContain("/api/flashcards");
      });
    });
  });

  describe("Type Safety", () => {
    it("should work with properly typed FlashcardDTO", async () => {
      const typedFlashcard: FlashcardDTO = createMockFlashcard();

      mockFetch.mockResolvedValueOnce(createFetchResponse(createMockResponse([typedFlashcard])));

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.flashcards[0]).toMatchObject({
          id: expect.any(String),
          user_id: expect.any(String),
          front: expect.any(String),
          back: expect.any(String),
          due: expect.any(String),
          state: expect.any(Number),
          difficulty: expect.any(Number),
          stability: expect.any(Number),
          reps: expect.any(Number),
          lapses: expect.any(Number),
          elapsed_days: expect.any(Number),
          scheduled_days: expect.any(Number),
          is_ai_generated: expect.any(Boolean),
          created_at: expect.any(String),
          updated_at: expect.any(String),
        });
      });
    });

    it("should accept properly typed UpdateFlashcardDTO", async () => {
      const mockFlashcard = createMockFlashcard({ id: "1" });

      const mockResponse = createFetchResponse(createMockResponse([mockFlashcard]));
      mockFetch.mockImplementationOnce(() => Promise.resolve(mockResponse));

      const { result } = renderHook(() => useFlashcardList());

      await waitFor(() => {
        expect(result.current.flashcards).toHaveLength(1);
      });

      // This should work with TypeScript - only front and back are allowed
      const updateData: UpdateFlashcardDTO = {
        front: "Updated Question",
        back: "Updated Answer",
      };

      const updatedCard = { ...mockFlashcard, ...updateData };
      const updateResponse = createFetchResponse(updatedCard);
      mockFetch.mockImplementationOnce(() => Promise.resolve(updateResponse));

      await act(async () => {
        await result.current.updateCard("1", updateData);
      });

      expect(result.current.flashcards[0].front).toBe("Updated Question");
      expect(result.current.flashcards[0].back).toBe("Updated Answer");
    });
  });
});
