/**
 * Flashcard Table Component
 * Displays flashcards in a table format with actions
 */

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FlashcardDTO } from "@/types";

interface FlashcardTableProps {
  data: FlashcardDTO[];
  isLoading: boolean;
  onEdit: (card: FlashcardDTO) => void;
  onDelete: (card: FlashcardDTO) => void;
  searchQuery?: string;
}

/**
 * Formats date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  // If date is in the past or today, show "Do powtórki"
  if (date <= now) {
    return "Do powtórki";
  }

  // Format as dd.MM.yyyy
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

/**
 * Truncates text to specified length
 */
function truncateText(text: string, maxLength = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Loading skeleton for table
 */
function TableSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </TableCell>
          <TableCell>
            <div className="h-8 w-8 animate-pulse rounded bg-muted" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

/**
 * Empty state when no flashcards
 */
function EmptyState({ hasSearchQuery }: { hasSearchQuery: boolean }) {
  return (
    <TableRow>
      <TableCell colSpan={4} className="h-32 text-center">
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <p className="text-lg">
            {hasSearchQuery ? "Nie znaleziono fiszek pasujących do zapytania" : "Nie masz jeszcze żadnych fiszek"}
          </p>
          {!hasSearchQuery && <p className="text-sm">Stwórz swoją pierwszą fiszkę, aby rozpocząć naukę</p>}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function FlashcardTable({ data, isLoading, onEdit, onDelete, searchQuery = "" }: FlashcardTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Pytanie</TableHead>
            <TableHead className="w-[40%]">Odpowiedź</TableHead>
            <TableHead className="w-[15%]">Następna powtórka</TableHead>
            <TableHead className="w-[5%] text-right">Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeleton />
          ) : data.length === 0 ? (
            <EmptyState hasSearchQuery={searchQuery.length > 0} />
          ) : (
            data.map((card) => (
              <TableRow key={card.id}>
                <TableCell className="font-medium">{truncateText(card.front, 100)}</TableCell>
                <TableCell>{truncateText(card.back, 100)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(card.due)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Otwórz menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(card)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edytuj
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(card)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Usuń
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
