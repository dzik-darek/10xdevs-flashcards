/**
 * AIGeneratorWizard - Main container for AI flashcard generation flow
 * Manages wizard steps: input -> loading -> review
 */

import { useState, useRef } from 'react';
import { useGeneratorState } from '@/hooks/useGeneratorState';
import { InputStep } from './InputStep';
import { LoadingStep } from './LoadingStep';
import { ReviewStep } from './ReviewStep';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VALIDATION_CONSTRAINTS } from '@/types';

export function AIGeneratorWizard() {
  const {
    state,
    setNoteContent,
    generateDrafts,
    updateDraft,
    removeDraft,
    saveBatch,
    reset,
  } = useGeneratorState();

  const { step, noteContent, drafts, isSaving, error } = state;
  
  // Track when generation starts (for LoadingStep timer)
  const loadingStartTimeRef = useRef<number>(Date.now());
  
  // Validation for input step
  const isContentValid = 
    noteContent.length >= VALIDATION_CONSTRAINTS.ai.noteContent.min &&
    noteContent.length <= VALIDATION_CONSTRAINTS.ai.noteContent.max;

  const handleGenerate = async () => {
    loadingStartTimeRef.current = Date.now();
    await generateDrafts();
  };

  const handleSave = async () => {
    try {
      await saveBatch();
      // Redirect to home or flashcards list after successful save
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (err) {
      // Error is handled in the hook
      console.error('Failed to save batch:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Global error alert */}
      {error && step !== 'review' && (
        <div className="w-full max-w-4xl mx-auto p-6 pt-8">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Conditional step rendering */}
      {step === 'input' && (
        <InputStep
          content={noteContent}
          onContentChange={setNoteContent}
          onGenerate={handleGenerate}
          isValid={isContentValid}
        />
      )}

      {step === 'loading' && (
        <LoadingStep
          startTime={loadingStartTimeRef.current}
          onCancel={reset}
        />
      )}

      {step === 'review' && (
        <ReviewStep
          drafts={drafts}
          onSave={handleSave}
          onDiscard={reset}
          onUpdateDraft={updateDraft}
          onDeleteDraft={removeDraft}
          isSaving={isSaving}
          error={error}
        />
      )}
    </div>
  );
}
