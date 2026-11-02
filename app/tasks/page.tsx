import { createClient } from "@/lib/supabase/server";
import { Task } from "@/lib/supabase/types";
import { TaskCard } from "@/components/task-card";
import { TaskFilters } from "@/components/task-filters";
import { Sparkles, Briefcase } from "lucide-react";

interface TasksPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    sort?: string;
  }>;
}

function getCategoryMatches(cat: string): string[] {
  const c = cat.toLowerCase().trim();
  if (c === "healthcare" || c === "healthcare & medicine" || c.includes("health") || c.includes("medicin")) {
    return ["Healthcare", "Healthcare & Medicine"];
  }
  if (c === "legal" || c === "legal & compliance" || c.includes("legal") || c.includes("compliance") || c.includes("law")) {
    return ["Legal", "Legal & Compliance"];
  }
  if (c === "finance" || c === "finance & accounting" || c.includes("finance") || c.includes("accounting")) {
    return ["Finance", "Finance & Accounting"];
  }
  if (c === "ai alignment & safety" || c.includes("alignment") || c.includes("safety") || c.includes("rlhf")) {
    return ["AI Alignment & Safety"];
  }
  if (c === "biochemical & genetics" || c.includes("bio") || c.includes("genetic")) {
    return ["Biochemical & Genetics"];
  }
  return [cat];
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const { search, category, sort } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("tasks").select("*").eq("status", "open");

  if (search && search.trim() !== "") {
    const s = search.trim();
    query = query.or(`title.ilike.%${s}%,summary.ilike.%${s}%`);
  }

  if (category && category !== "All") {
    const matches = getCategoryMatches(category);
    if (matches.length === 1) {
      query = query.eq("category", matches[0]);
    } else {
      query = query.in("category", matches);
    }
  }

  if (sort === "pay_high") {
    query = query.order("pay_max", { ascending: false, nullsFirst: false });
  } else if (sort === "slots") {
    query = query.order("slots", { ascending: false, nullsFirst: false });
  } else {
    // default: newest
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  const tasks = (data as Task[]) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Page Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-border/60">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Briefcase className="h-3.5 w-3.5" />
            Domain Marketplace
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Available Evaluation Tasks
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            Browse active benchmark protocols. Apply to land on task waitlists and get evaluated directly by project leads.
          </p>
        </div>

        <div className="text-xs font-semibold text-muted-foreground bg-muted/60 px-3.5 py-1.5 rounded-full border border-border w-fit">
          <span className="text-primary font-bold">{tasks.length}</span> open {tasks.length === 1 ? "task" : "tasks"} found
        </div>
      </div>

      {/* Search & Filter Controls */}
      <TaskFilters
        currentSearch={search}
        currentCategory={category}
        currentSort={sort}
      />

      {/* Task Listing Grid */}
      {tasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-[14px] border border-border p-12 text-center space-y-4 max-w-md mx-auto shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="font-heading text-xl font-bold text-foreground">
            {search || (category && category !== "All")
              ? "No matching tasks found"
              : "No open tasks right now"}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {search || (category && category !== "All")
              ? "No active tasks match your filter criteria. Try clearing your search query or switching categories."
              : "There are currently no open tasks accepting new waitlist applications. Check back soon for newly published cohorts."}
          </p>
          {(search || (category && category !== "All")) && (
            <div className="pt-1">
              <a
                href="/tasks"
                className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
              >
                Reset all filters
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
