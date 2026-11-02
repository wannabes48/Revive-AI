"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/constants";
import { Search, X, SlidersHorizontal } from "lucide-react";

const categories = ["All", ...CATEGORIES];

interface TaskFiltersProps {
  currentCategory?: string;
  currentSearch?: string;
  currentSort?: string;
}

function isCategoryActive(pillCategory: string, currentCategory?: string): boolean {
  if (!currentCategory || currentCategory === "All") {
    return pillCategory === "All";
  }
  if (pillCategory.toLowerCase() === currentCategory.toLowerCase()) return true;
  const p = pillCategory.toLowerCase();
  const c = currentCategory.toLowerCase();
  if (p === "healthcare" && (c.includes("health") || c.includes("medicin"))) return true;
  if (p === "legal" && (c.includes("legal") || c.includes("compliance") || c.includes("law"))) return true;
  if (p === "finance" && (c.includes("finance") || c.includes("accounting"))) return true;
  if (p === "biochemical & genetics" && (c.includes("bio") || c.includes("genetic"))) return true;
  if (p === "ai alignment & safety" && (c.includes("alignment") || c.includes("safety") || c.includes("rlhf"))) return true;
  return false;
}

export function TaskFilters({
  currentCategory = "All",
  currentSearch = "",
  currentSort = "newest",
}: TaskFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchVal, setSearchVal] = React.useState(currentSearch);
  const [isPending, startTransition] = React.useTransition();

  // Keep state in sync with URL
  React.useEffect(() => {
    setSearchVal(currentSearch);
  }, [currentSearch]);

  function updateQuery(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || value === "All") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateQuery({ search: searchVal.trim() });
  }

  function clearSearch() {
    setSearchVal("");
    updateQuery({ search: null });
  }

  return (
    <div className="bg-card rounded-[14px] border border-border p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Top search & sort row */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            aria-label="Search evaluation tasks"
            placeholder="Search tasks by keyword, clinical topic, or legal title..."
            className="pl-10 pr-9 h-10 rounded-lg border-border focus-visible:ring-primary/20 focus-visible:border-primary text-sm bg-background"
          />
          {searchVal && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search query"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        {/* Sort Select */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="sortSelect" className="text-xs font-semibold text-muted-foreground whitespace-nowrap hidden sm:inline">
            Sort by:
          </label>
          <select
            id="sortSelect"
            value={currentSort}
            onChange={(e) => updateQuery({ sort: e.target.value })}
            className="h-10 px-3.5 rounded-lg border border-border bg-background text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
          >
            <option value="newest">Newest Listed</option>
            <option value="pay_high">Highest Pay Rate</option>
            <option value="slots">Most Open Slots</option>
          </select>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
        {categories.map((cat) => {
          const isSelected = isCategoryActive(cat, currentCategory);

          return (
            <button
              key={cat}
              type="button"
              onClick={() => updateQuery({ category: cat === "All" ? null : cat })}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 select-none ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted text-muted-foreground hover:bg-border hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}
