"use client";

import * as React from "react";
import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TagInputProps {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  maxTags?: number;
  placeholder?: string;
}

export function TagInput({
  id,
  value = [],
  onChange,
  suggestions = [],
  maxTags = 20,
  placeholder = "Type and press Enter or comma...",
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState("");

  const addTag = (text: string) => {
    const trimmed = text.trim().replace(/^,+|,+$/g, "");
    if (!trimmed) return;
    if (value.includes(trimmed)) return;
    if (value.length >= maxTags) return;
    onChange([...value, trimmed]);
    setInputValue("");
  };

  const removeTag = (indexToRemove: number) => {
    onChange(value.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      e.preventDefault();
      removeTag(value.length - 1);
    }
  };

  // Filter suggestions to those not already added
  const remainingSuggestions = suggestions.filter((s) => !value.includes(s));

  return (
    <div className="space-y-2">
      {/* Container box with chips and inline input */}
      <div
        id={id}
        className="min-h-10 p-2 rounded-xl border border-input bg-background flex flex-wrap items-center gap-1.5 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all"
      >
        {value.map((tag, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(idx)}
              className="hover:text-destructive text-primary/70 cursor-pointer ml-0.5"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {value.length < maxTags && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputValue) addTag(inputValue);
            }}
            placeholder={value.length === 0 ? placeholder : "Add more..."}
            className="flex-1 min-w-32 bg-transparent text-xs text-foreground outline-none px-1.5 py-1 placeholder:text-muted-foreground"
          />
        )}
      </div>

      {/* Suggested chips */}
      {remainingSuggestions.length > 0 && (
        <div className="space-y-1 pt-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Suggestions:
          </span>
          <div className="flex flex-wrap gap-1">
            {remainingSuggestions.slice(0, 8).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                className="text-[11px] px-2 py-0.5 rounded-lg bg-muted/40 border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors inline-flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="h-2.5 w-2.5 text-primary" />
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
