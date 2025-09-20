import { useState, useRef, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  name: string;
  image?: string;
}

interface MultiSelectInputProps {
  value: Option[];
  onChange: (value: Option[]) => void;
  onSearch?: (query: string) => Promise<Option[]>;
  placeholder?: string;
  options?: Option[];
  className?: string;
}

export const MultiSelectInput = ({ 
  value, 
  onChange, 
  onSearch, 
  placeholder = "Type to search...",
  options = [],
  className 
}: MultiSelectInputProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const searchOptions = async () => {
      if (!searchQuery.trim()) {
        setSearchResults(options);
        return;
      }

      if (onSearch) {
        setIsLoading(true);
        try {
          const results = await onSearch(searchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error("Search failed:", error);
          setSearchResults([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        const filtered = options.filter(option =>
          option.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(filtered);
      }
    };

    const debounceTimer = setTimeout(searchOptions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, onSearch, options]);

  const handleSelect = (option: Option) => {
    if (!value.find(v => v.id === option.id)) {
      onChange([...value, option]);
    }
    setSearchQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleRemove = (optionId: string) => {
    onChange(value.filter(v => v.id !== optionId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim() && !onSearch) {
      // For genre input without API search
      const newOption: Option = {
        id: searchQuery.toLowerCase(),
        name: searchQuery.trim()
      };
      if (!value.find(v => v.id === newOption.id)) {
        onChange([...value, newOption]);
      }
      setSearchQuery("");
      e.preventDefault();
    } else if (e.key === "Backspace" && !searchQuery && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="flex flex-wrap gap-2 p-2 border border-border rounded-md bg-background min-h-[40px] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {value.map((option) => (
          <Badge key={option.id} variant="secondary" className="flex items-center gap-1">
            {option.image && (
              <img src={option.image} alt="" className="w-4 h-4 rounded-full" />
            )}
            {option.name}
            <button
              onClick={() => handleRemove(option.id)}
              className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <Input
          ref={inputRef}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="border-0 flex-1 min-w-[120px] p-0 h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <ChevronDown 
          className="w-4 h-4 text-muted-foreground self-center cursor-pointer" 
          onClick={() => {
            setIsOpen(!isOpen);
            inputRef.current?.focus();
          }}
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto bg-popover border border-border rounded-md shadow-lg">
          {isLoading ? (
            <div className="p-3 text-sm text-muted-foreground">Searching...</div>
          ) : searchResults.length > 0 ? (
            searchResults.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelect(option)}
                className="w-full text-left p-3 hover:bg-accent hover:text-accent-foreground flex items-center gap-3 text-sm"
                disabled={value.some(v => v.id === option.id)}
              >
                {option.image && (
                  <img src={option.image} alt="" className="w-8 h-8 rounded-full" />
                )}
                <span className={value.some(v => v.id === option.id) ? "opacity-50" : ""}>
                  {option.name}
                </span>
              </button>
            ))
          ) : (
            <div className="p-3 text-sm text-muted-foreground">
              {searchQuery ? "No results found" : "Start typing to search"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};