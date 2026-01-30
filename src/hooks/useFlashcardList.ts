/**
 * Custom hook for managing Flashcard List state
 * Handles fetching, searching, updating, and deleting flashcards
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  FlashcardDTO,
  GetFlashcardsResponseDTO,
  UpdateFlashcardDTO,
} from '@/types';

interface UseFlashcardListReturn {
  flashcards: FlashcardDTO[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  refresh: () => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  updateCard: (id: string, data: UpdateFlashcardDTO) => Promise<void>;
}

export function useFlashcardList(): UseFlashcardListReturn {
  const [flashcards, setFlashcards] = useState<FlashcardDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Fetches flashcards from API
   */
  const fetchFlashcards = useCallback(async (query?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = new URL('/api/flashcards', window.location.origin);
      url.searchParams.set('mode', 'all');
      if (query && query.trim().length > 0) {
        url.searchParams.set('q', query.trim());
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Musisz być zalogowany, aby zobaczyć fiszki');
        }
        throw new Error('Nie udało się załadować fiszek');
      }

      const data: GetFlashcardsResponseDTO = await response.json();
      setFlashcards(data.data);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Nie udało się załadować fiszek. Spróbuj ponownie.';
      setError(errorMessage);
      setFlashcards([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initial load
   */
  useEffect(() => {
    fetchFlashcards();
  }, [fetchFlashcards]);

  /**
   * Reload when search query changes (with debounce handled by parent)
   */
  useEffect(() => {
    fetchFlashcards(searchQuery);
  }, [searchQuery, fetchFlashcards]);

  /**
   * Manually refresh the list
   */
  const refresh = useCallback(async () => {
    await fetchFlashcards(searchQuery);
  }, [fetchFlashcards, searchQuery]);

  /**
   * Delete a flashcard
   */
  const deleteCard = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/flashcards/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Fiszka nie została znaleziona');
        }
        throw new Error('Nie udało się usunąć fiszki');
      }

      // Optimistically update UI
      setFlashcards(prev => prev.filter(card => card.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Nie udało się usunąć fiszki. Spróbuj ponownie.';
      throw new Error(errorMessage);
    }
  }, []);

  /**
   * Update a flashcard
   */
  const updateCard = useCallback(async (id: string, data: UpdateFlashcardDTO) => {
    try {
      const response = await fetch(`/api/flashcards/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Fiszka nie została znaleziona');
        }
        if (response.status === 422) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Nieprawidłowe dane');
        }
        throw new Error('Nie udało się zapisać zmian');
      }

      const updatedCard: FlashcardDTO = await response.json();

      // Optimistically update UI
      setFlashcards(prev => 
        prev.map(card => card.id === id ? updatedCard : card)
      );
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Nie udało się zapisać zmian. Spróbuj ponownie.';
      throw new Error(errorMessage);
    }
  }, []);

  return {
    flashcards,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    refresh,
    deleteCard,
    updateCard,
  };
}
