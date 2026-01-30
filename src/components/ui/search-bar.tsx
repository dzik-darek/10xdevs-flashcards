/**
 * SearchBar Component
 * Input field with search icon and debounce functionality
 */

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  defaultValue?: string;
  debounceMs?: number;
}

export function SearchBar({
  onSearch,
  placeholder = 'Szukaj fiszek...',
  defaultValue = '',
  debounceMs = 400,
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, onSearch, debounceMs]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => setValue(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}
