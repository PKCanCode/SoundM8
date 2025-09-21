// src/components/MultiSelectInput.tsx
import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { X, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  name: string;
  image?: string;
}

interface MultiSelectInputProps {
  value: Option[];
  onChange: (value: Option[]) => void;
  options?: Option[];
  onSearch?: (query: string) => Promise<Option[]>;
  placeholder?: string;
  maxItems?: number;
}

export const MultiSelectInput: React.FC<MultiSelectInputProps> = ({
  value,
  onChange,
  options = [],
  onSearch,
  placeholder = "Type to search...",
  maxItems = 5
}) => {
  const [inputValue, setInputValue] = useState("");
  const [searchResults, setSearchResults] = useState<Option[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter available options based on static options or search results
  const availableOptions = onSearch ? searchResults : options.filter(option =>
    option.name.toLowerCase().includes(inputValue.toLowerCase()) &&
    !value.some(selected => selected.id === option.id)
  );

  // Handle search with debouncing
  useEffect(() => {
    if (!onSearch || inputValue.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await onSearch(inputValue);
        setSearchResults(results.filter(result => 
          !value.some(selected => selected.id === result.id)
        ));
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [inputValue, onSearch, value]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < availableOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && availableOptions[highlightedIndex]) {
          handleSelect(availableOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelect = (option: Option) => {
    if (value.length < maxItems) {
      onChange([...value, option]);
      setInputValue("");
      setSearchResults([]);
      setIsOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    }
  };

  const handleRemove = (optionId: string) => {
    onChange(value.filter(item => item.id !== optionId));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(newValue.length > 0);
    setHighlightedIndex(-1);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Selected Items */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((item) => (
            <Badge
              key={item.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {item.image && (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-4 h-4 rounded-full object-cover"
                />
              )}
              <span>{item.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(item.id)}
                className="h-4 w-4 p-0 hover:bg-destructive/20"
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue.length > 0 && setIsOpen(true)}
            placeholder={value.length >= maxItems ? `Maximum ${maxItems} items selected` : placeholder}
            className="pl-10 pr-10"
            disabled={value.length >= maxItems}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 animate-spin" />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && availableOptions.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 border shadow-lg">
          <CardContent className="p-0 max-h-60 overflow-y-auto">
            {availableOptions.map((option, index) => (
              <div
                key={option.id}
                onClick={() => handleSelect(option)}
                className={cn(
                  "flex items-center space-x-3 p-3 cursor-pointer border-b border-border last:border-b-0 hover:bg-accent",
                  index === highlightedIndex && "bg-accent"
                )}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {option.image && (
                  <img
                    src={option.image}
                    alt={option.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <span className="text-sm font-medium">{option.name}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No results message */}
      {isOpen && !isSearching && inputValue.length > 0 && availableOptions.length === 0 && (
        <Card className="absolute z-50 w-full mt-1 border shadow-lg">
          <CardContent className="p-4 text-center text-muted-foreground text-sm">
            {onSearch ? 'No results found' : 'No matching options'}
          </CardContent>
        </Card>
      )}

      {/* Helper text */}
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{value.length} / {maxItems} selected</span>
        {onSearch && <span>Type to search</span>}
      </div>
    </div>
  );
};
