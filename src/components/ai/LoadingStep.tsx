/**
 * LoadingStep - Second step of AI Generator Wizard
 * Shows loading state while AI generates flashcards
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface LoadingStepProps {
  /**
   * Timestamp when generation started (for elapsed time calculation)
   */
  startTime: number;
  
  /**
   * Optional callback to cancel the operation
   */
  onCancel?: () => void;
}

export function LoadingStep({ startTime, onCancel }: LoadingStepProps) {
  const [elapsed, setElapsed] = useState(0);
  const maxTime = 120; // 120 seconds timeout
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      setElapsed(elapsedSeconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const progress = Math.min((elapsed / maxTime) * 100, 100);
  const remainingTime = Math.max(maxTime - elapsed, 0);

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Generuję fiszki...
        </h2>
        <p className="text-muted-foreground">
          AI analizuje Twoje notatki i tworzy fiszki. To może potrwać chwilę.
        </p>
      </div>

      {/* Animated spinner */}
      <div className="flex justify-center">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-muted rounded-full"></div>
          <div 
            className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"
            style={{ animationDuration: '1s' }}
          ></div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Czas: {elapsed}s</span>
          <span>Pozostało: ~{remainingTime}s</span>
        </div>
      </div>

      {/* Optional cancel button */}
      {onCancel && (
        <div className="flex justify-center">
          <Button
            onClick={onCancel}
            variant="outline"
            size="sm"
          >
            Anuluj
          </Button>
        </div>
      )}

      {/* Tips */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium">💡 Wskazówka</p>
        <p className="text-sm text-muted-foreground">
          Generowanie może zająć do 2 minut w zależności od długości tekstu. 
          W międzyczasie możesz przygotować kolejne notatki.
        </p>
      </div>
    </div>
  );
}
