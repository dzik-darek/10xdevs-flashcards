/**
 * FlashcardDashboard Component
 * Main container for flashcard list view with search, edit, and delete functionality
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { useFlashcardList } from '@/hooks/useFlashcardList';
import { SearchBar } from '@/components/ui/search-bar';
import { FlashcardTable } from '@/components/flashcards/FlashcardTable';
import { EditFlashcardDialog } from '@/components/flashcards/EditFlashcardDialog';
import { DeleteFlashcardAlert } from '@/components/flashcards/DeleteFlashcardAlert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import type { FlashcardDTO, UpdateFlashcardDTO } from '@/types';

export default function FlashcardDashboard() {
  const {
    flashcards,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    refresh,
    deleteCard,
    updateCard,
  } = useFlashcardList();

  // Modal states
  const [editingCard, setEditingCard] = useState<FlashcardDTO | null>(null);
  const [deletingCard, setDeletingCard] = useState<FlashcardDTO | null>(null);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Handle edit
  const handleEditClick = (card: FlashcardDTO) => {
    setEditingCard(card);
  };

  const handleEditSubmit = async (id: string, data: UpdateFlashcardDTO) => {
    try {
      await updateCard(id, data);
      toast.success('Fiszka została zaktualizowana');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się zapisać zmian';
      toast.error(message);
      throw error; // Re-throw to prevent dialog from closing
    }
  };

  // Handle delete
  const handleDeleteClick = (card: FlashcardDTO) => {
    setDeletingCard(card);
  };

  const handleDeleteConfirm = async (id: string) => {
    try {
      await deleteCard(id);
      toast.success('Fiszka została usunięta');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nie udało się usunąć fiszki';
      toast.error(message);
      throw error; // Re-throw to prevent alert from closing
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    try {
      await refresh();
      toast.success('Lista odświeżona');
    } catch (error) {
      // Error is already set in the hook
      toast.error('Nie udało się odświeżyć listy');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Moje fiszki</h1>
        {!isLoading && !error && (
          <p className="mt-2 text-muted-foreground">
            {flashcards.length === 0 
              ? 'Brak fiszek' 
              : `${flashcards.length} ${flashcards.length === 1 ? 'fiszka' : flashcards.length < 5 ? 'fiszki' : 'fiszek'}`
            }
            {searchQuery && ` (wyniki wyszukiwania dla "${searchQuery}")`}
          </p>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="shrink-0"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Spróbuj ponownie
            </Button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      {!error && (
        <div className="mb-6">
          <SearchBar
            onSearch={handleSearch}
            placeholder="Szukaj po pytaniu lub odpowiedzi..."
            defaultValue={searchQuery}
          />
        </div>
      )}

      {/* Flashcard Table */}
      {!error && (
        <FlashcardTable
          data={flashcards}
          isLoading={isLoading}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          searchQuery={searchQuery}
        />
      )}

      {/* Edit Dialog */}
      <EditFlashcardDialog
        open={!!editingCard}
        onOpenChange={open => !open && setEditingCard(null)}
        flashcard={editingCard}
        onSubmit={handleEditSubmit}
      />

      {/* Delete Alert */}
      <DeleteFlashcardAlert
        open={!!deletingCard}
        onOpenChange={open => !open && setDeletingCard(null)}
        flashcard={deletingCard}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
