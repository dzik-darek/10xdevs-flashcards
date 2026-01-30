/**
 * DraftCard - Single flashcard draft in editable state
 * Part of ReviewStep - allows editing and deleting drafts before saving
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { VALIDATION_CONSTRAINTS } from '@/types';
import type { DraftViewModel } from './types';

interface DraftCardProps {
  /**
   * Draft data including id, front, back
   */
  draft: DraftViewModel;
  
  /**
   * Callback when front or back field changes
   */
  onUpdate: (field: 'front' | 'back', value: string) => void;
  
  /**
   * Callback when delete button is clicked
   */
  onDelete: () => void;
}

export function DraftCard({ draft, onUpdate, onDelete }: DraftCardProps) {
  const { front: frontConstraints, back: backConstraints } = VALIDATION_CONSTRAINTS.flashcard;
  
  // Validation states
  const frontLength = draft.front.length;
  const backLength = draft.back.length;
  
  const isFrontEmpty = draft.front.trim().length === 0;
  const isFrontTooLong = frontLength > frontConstraints.max;
  const isFrontInvalid = isFrontEmpty || isFrontTooLong;
  
  const isBackEmpty = draft.back.trim().length === 0;
  const isBackTooLong = backLength > backConstraints.max;
  const isBackInvalid = isBackEmpty || isBackTooLong;
  
  const hasError = isFrontInvalid || isBackInvalid;

  return (
    <Card className={`${hasError ? 'border-red-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Fiszka</CardTitle>
          <Button
            onClick={onDelete}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-red-500"
            aria-label="Usuń fiszkę"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" x2="10" y1="11" y2="17" />
              <line x1="14" x2="14" y1="11" y2="17" />
            </svg>
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Front (Question) */}
        <div className="space-y-2">
          <Label htmlFor={`front-${draft.id}`}>
            Przód (pytanie)
          </Label>
          <Textarea
            id={`front-${draft.id}`}
            value={draft.front}
            onChange={(e) => onUpdate('front', e.target.value)}
            placeholder="Wpisz pytanie..."
            className={`min-h-[80px] ${
              isFrontInvalid ? 'border-red-500 focus-visible:ring-red-500' : ''
            }`}
          />
          <div className="flex items-center justify-between text-sm">
            <span className={`${
              isFrontTooLong ? 'text-red-500 font-medium' : 'text-muted-foreground'
            }`}>
              {frontLength} / {frontConstraints.max}
            </span>
            {isFrontEmpty && (
              <span className="text-red-500 text-xs">Pole wymagane</span>
            )}
            {isFrontTooLong && (
              <span className="text-red-500 text-xs">
                Przekroczono limit o {frontLength - frontConstraints.max}
              </span>
            )}
          </div>
        </div>

        {/* Back (Answer) */}
        <div className="space-y-2">
          <Label htmlFor={`back-${draft.id}`}>
            Tył (odpowiedź)
          </Label>
          <Textarea
            id={`back-${draft.id}`}
            value={draft.back}
            onChange={(e) => onUpdate('back', e.target.value)}
            placeholder="Wpisz odpowiedź..."
            className={`min-h-[120px] ${
              isBackInvalid ? 'border-red-500 focus-visible:ring-red-500' : ''
            }`}
          />
          <div className="flex items-center justify-between text-sm">
            <span className={`${
              isBackTooLong ? 'text-red-500 font-medium' : 'text-muted-foreground'
            }`}>
              {backLength} / {backConstraints.max}
            </span>
            {isBackEmpty && (
              <span className="text-red-500 text-xs">Pole wymagane</span>
            )}
            {isBackTooLong && (
              <span className="text-red-500 text-xs">
                Przekroczono limit o {backLength - backConstraints.max}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
