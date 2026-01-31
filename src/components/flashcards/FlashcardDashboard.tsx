/**
 * FlashcardDashboard Component
 * Main container for flashcard list view with search, edit, and delete functionality
 */

import { useState } from "react";
import { toast } from "sonner";
import { useFlashcardList } from "@/hooks/useFlashcardList";
import { SearchBar } from "@/components/ui/search-bar";
import { FlashcardTable } from "@/components/flashcards/FlashcardTable";
import { EditFlashcardDialog } from "@/components/flashcards/EditFlashcardDialog";
import { DeleteFlashcardAlert } from "@/components/flashcards/DeleteFlashcardAlert";
import type { FlashcardDTO, UpdateFlashcardDTO } from "@/types";

export default function FlashcardDashboard() {
  const { flashcards, isLoading, searchQuery, setSearchQuery, deleteCard, updateCard } = useFlashcardList();

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
      toast.success("Fiszka została zaktualizowana");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nie udało się zapisać zmian";
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
      toast.success("Fiszka została usunięta");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nie udało się usunąć fiszki";
      toast.error(message);
      throw error; // Re-throw to prevent alert from closing
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Moje fiszki</h1>
        {!isLoading && (
          <p className="mt-2 text-muted-foreground">
            {flashcards.length === 0
              ? "Brak fiszek"
              : `${flashcards.length} ${flashcards.length === 1 ? "fiszka" : flashcards.length < 5 ? "fiszki" : "fiszek"}`}
            {searchQuery && ` (wyniki wyszukiwania dla "${searchQuery}")`}
          </p>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar
          onSearch={handleSearch}
          placeholder="Szukaj po pytaniu lub odpowiedzi..."
          defaultValue={searchQuery}
        />
      </div>

      {/* Flashcard Table */}
      <FlashcardTable
        data={flashcards}
        isLoading={isLoading}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        searchQuery={searchQuery}
      />

      {/* Edit Dialog */}
      <EditFlashcardDialog
        open={!!editingCard}
        onOpenChange={(open) => !open && setEditingCard(null)}
        flashcard={editingCard}
        onSubmit={handleEditSubmit}
      />

      {/* Delete Alert */}
      <DeleteFlashcardAlert
        open={!!deletingCard}
        onOpenChange={(open) => !open && setDeletingCard(null)}
        flashcard={deletingCard}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
