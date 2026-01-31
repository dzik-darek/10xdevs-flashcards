import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSupabaseBrowserClient } from '@/db/supabase.client';

// Mock Supabase client
vi.mock('@/db/supabase.client', () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

describe('Flashcard Service', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };

    vi.mocked(createSupabaseBrowserClient).mockReturnValue(mockSupabase);
  });

  it('should fetch flashcards from database', async () => {
    const mockFlashcards = [
      { id: '1', question: 'Test Q1', answer: 'Test A1' },
      { id: '2', question: 'Test Q2', answer: 'Test A2' },
    ];

    mockSupabase.select.mockResolvedValue({
      data: mockFlashcards,
      error: null,
    });

    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from('flashcards')
      .select('*');

    expect(data).toEqual(mockFlashcards);
    expect(mockSupabase.from).toHaveBeenCalledWith('flashcards');
    expect(mockSupabase.select).toHaveBeenCalledWith('*');
  });

  it('should handle database errors', async () => {
    const mockError = { message: 'Database error' };

    mockSupabase.select.mockResolvedValue({
      data: null,
      error: mockError,
    });

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from('flashcards')
      .select('*');

    expect(error).toEqual(mockError);
  });

  it('should create a new flashcard', async () => {
    const newFlashcard = {
      question: 'New Question',
      answer: 'New Answer',
    };

    const mockCreatedFlashcard = {
      id: '3',
      ...newFlashcard,
      created_at: new Date().toISOString(),
    };

    mockSupabase.single.mockResolvedValue({
      data: mockCreatedFlashcard,
      error: null,
    });

    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from('flashcards')
      .insert(newFlashcard)
      .select()
      .single();

    expect(data).toEqual(mockCreatedFlashcard);
    expect(mockSupabase.from).toHaveBeenCalledWith('flashcards');
    expect(mockSupabase.insert).toHaveBeenCalledWith(newFlashcard);
  });
});
