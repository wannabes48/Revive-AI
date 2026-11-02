import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Task } from "@/lib/supabase/types";
import { TaskCard } from "@/components/task-card";
import { Button } from "@/components/ui/button";
import FaqSection, { type FaqSectionData } from "@/components/ui/habit-faq-scroller";
import {
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  Scale,
  Cpu,
  TrendingUp,
  Brain,
  Dna,
  CheckCircle2,
  Sparkles,
  Users,
  DollarSign,
  Award,
} from "lucide-react";

export const dynamic = "force-dynamic";

const PRACTICE_DOMAINS = [
  {
    name: "Healthcare & Medicine",
    icon: Stethoscope,
    desc: "Diagnostic oncology, DICOM scan reasoning, and clinical protocol verification.",
    match: (category: string) => {
      const c = category.toLowerCase().trim();
      return (
        c === "healthcare & medicine" ||
        c === "healthcare" ||
        c.includes("health") ||
        c.includes("medicin")
      );
    },
  },
  {
    name: "Legal & Compliance",
    icon: Scale,
    desc: "Cross-border M&A redlines, statutory risk audits, and jurisdictional clauses.",
    match: (category: string) => {
      const c = category.toLowerCase().trim();
      return (
        c === "legal & compliance" ||
        c === "legal" ||
        c.includes("legal") ||
        c.includes("compliance") ||
        c.includes("law")
      );
    },
  },
  {
    name: "Software Engineering",
    icon: Cpu,
    desc: "Rust async memory safety, distributed consensus protocols, and CUDA kernels.",
    match: (category: string) => {
      const c = category.toLowerCase().trim();
      return (
        c === "software engineering" ||
        c.includes("software") ||
        c.includes("code") ||
        c.includes("engineer")
      );
    },
  },
  {
    name: "Finance & Accounting",
    icon: TrendingUp,
    desc: "SEC 10-K footnote reconciliations, debt covenants, and ASC 842 lease audits.",
    match: (category: string) => {
      const c = category.toLowerCase().trim();
      return (
        c === "finance & accounting" ||
        c === "finance" ||
        c.includes("finance") ||
        c.includes("accounting")
      );
    },
  },
  {
    name: "AI Alignment & Safety",
    icon: Brain,
    desc: "Multi-turn constitutional jailbreaks, sycophancy probes, and safety boundary testing.",
    match: (category: string) => {
      const c = category.toLowerCase().trim();
      return (
        c === "ai alignment & safety" ||
        c.includes("alignment") ||
        c.includes("safety") ||
        c.includes("rlhf")
      );
    },
  },
  {
    name: "Biochemical & Genetics",
    icon: Dna,
    desc: "CRISPR/Cas9 guide targeting sequences, recombinant DNA, and BSL-2+ protocols.",
    match: (category: string) => {
      const c = category.toLowerCase().trim();
      return (
        c === "biochemical & genetics" ||
        c.includes("bio") ||
        c.includes("genetic")
      );
    },
  },
];

const faqData: FaqSectionData = {
  mainTitle: "Frequently Asked Questions",
  mainSubtitle: "Everything you need to know about expert qualification, compensation, and asynchronous benchmark evaluation.",
  rows: [
    {
      id: "row-1",
      speed: "45s",
      direction: "left",
      faqItems: [
        {
          id: 1,
          question: "How does the waitlist and review work?",
          answer: "When you apply to an open task, you are automatically assigned a spot on that task's waitlist. Administrators calibrate capacity and approve applicants based on credentials.",
        },
        {
          id: 2,
          question: "How and when do contributors get paid?",
          answer: "Tasks offer hourly compensation ($65–$200/hr) or per-item payouts. Approved contributors track completed work and withdraw funds to Wise or Payoneer once approved.",
        },
        {
          id: 3,
          question: "What credentials do I need to be approved?",
          answer: "We prioritize domain specialists with accredited degrees (MD, JD, PhD, MSc), active licenses, verified publication histories, or production open-source system artifacts.",
        },
        {
          id: 4,
          question: "Can I apply to multiple tasks concurrently?",
          answer: "Yes. You can submit applications to multiple tasks across domains. Each application maintains its own waitlist position and review workflow.",
        },
      ],
    },
    {
      id: "row-2",
      speed: "50s",
      direction: "right",
      faqItems: [
        {
          id: 5,
          question: "What is the expected weekly time commitment?",
          answer: "Most evaluation tasks offer flexible commitments ranging from 5 to 20 hours per week with fully asynchronous evaluation schedules.",
        },
        {
          id: 6,
          question: "How are evaluations calibrated and reviewed?",
          answer: "Project administrators evaluate initial submission batches against gold-standard rubrics. Once calibrated, contributors claim and submit work items independently.",
        },
        {
          id: 7,
          question: "What is the minimum withdrawal balance?",
          answer: "The platform enforces a minimum withdrawal threshold of $25.00 via trusted cross-border payout providers including Wise and Payoneer.",
        },
        {
          id: 8,
          question: "Can I work remotely from any country?",
          answer: "Yes, specialists collaborate remotely from across the globe. We currently support verified contributors in over 120 jurisdictions.",
        },
      ],
    },
  ],
};

export default async function LandingPage() {
  const supabase = await createClient();

  // Query 3 featured/recent open tasks and all active tasks in parallel
  const [featuredRes, activeTasksRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("tasks")
      .select("category")
      .eq("status", "open"),
  ]);

  const tasksList = (featuredRes.data as Task[]) || [];
  const openCategories = (activeTasksRes.data || [])
    .map((t) => t.category)
    .filter(Boolean) as string[];

  const categoriesWithCounts = PRACTICE_DOMAINS.map((domain) => {
    const count = openCategories.filter((cat) => domain.match(cat)).length;
    return {
      name: domain.name,
      icon: domain.icon,
      desc: domain.desc,
      count,
      taskCount: count === 1 ? "1 Active Task" : `${count} Active Tasks`,
    };
  });

  return (
    <div id="top" className="space-y-16 sm:space-y-24 pb-16">
      {/* ================= HERO SECTION ================= */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-12 sm:pb-20 border-b border-border/60 bg-gradient-to-b from-card via-background to-background">
        <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(#0F766E_1px,transparent_1px)] [background-size:24px_24px]" />
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          {/* Status Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-muted border border-border text-primary shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Now Vetting Q2–Q3 Cohorts
            </span>
            <span className="text-muted-foreground/60">•</span>
            <span className="text-xs font-medium text-muted-foreground">
              Frontier Reasoning Benchmarks
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Supercharge Frontier AI with <span className="text-primary">Domain Expertise</span>
          </h1>

          {/* Subhead */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
            Apply to specialized evaluation tasks in law, medicine, STEM, and code. Get vetted, land on the priority waitlist, and collaborate on cutting-edge models.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/tasks" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto rounded-full font-semibold px-8 shadow-sm gap-2">
                <span>Browse Available Tasks</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/signup" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto rounded-full font-semibold px-8 bg-card hover:bg-muted/60"
              >
                Apply as Expert
              </Button>
            </Link>
          </div>

          {/* Trust Metrics Pill */}
          <div className="pt-8">
            <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-8 px-4 sm:px-6 py-3 rounded-2xl sm:rounded-full bg-card border border-border shadow-2xs text-xs text-muted-foreground max-w-full">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span><strong className="text-foreground font-semibold">$1.4M+</strong> paid to experts</span>
              </div>
              <span className="hidden sm:inline text-border">•</span>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span><strong className="text-foreground font-semibold">4,800+</strong> vetted specialists</span>
              </div>
              <span className="hidden sm:inline text-border">•</span>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span><strong className="text-foreground font-semibold">98.4%</strong> benchmark acceptance</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= THREE-STEP HOW IT WORKS ================= */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12 sm:mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Streamlined Qualification
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            How Revive AI Works
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            A transparent, merit-driven evaluation pipeline designed for senior clinicians, attorneys, researchers, and systems engineers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Step 1 */}
          <div className="bg-card rounded-[14px] border border-border p-6 sm:p-8 space-y-4 hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-heading font-extrabold text-lg flex items-center justify-center">
              01
            </div>
            <h3 className="font-heading text-xl font-bold text-foreground">
              Create Profile & Verify Field
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Register your legal name, country, and primary field of expertise. Showcase your clinical certifications, bar memberships, or research credentials.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <span>Instant profile provisioning</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-card rounded-[14px] border border-border p-6 sm:p-8 space-y-4 hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-heading font-extrabold text-lg flex items-center justify-center">
              02
            </div>
            <h3 className="font-heading text-xl font-bold text-foreground">
              Browse Tasks & Apply
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Explore open evaluation tasks across medicine, law, software, and finance. Submit your application with a short experience note to join the waitlist.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <span>Automated waitlist position queue</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-card rounded-[14px] border border-border p-6 sm:p-8 space-y-4 hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-heading font-extrabold text-lg flex items-center justify-center">
              03
            </div>
            <h3 className="font-heading text-xl font-bold text-foreground">
              Get Approved & Benchmark
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Lead administrators calibrate applicants and approve contributors into active batches. Work asynchronously on frontier models and get paid seamlessly.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <span>Direct compensation disbursements</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURED TASKS ================= */}
      <section id="featured" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Priority Review Openings
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
              Featured Open Tasks
            </h2>
          </div>
          <Link href="/tasks">
            <Button variant="outline" className="rounded-full text-xs font-semibold gap-1.5">
              <span>View all open tasks</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {tasksList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tasksList.map((task) => (
              <TaskCard key={task.id} task={task} featured />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-[14px] bg-card border border-border text-muted-foreground">
            No open tasks available right now. Check back shortly.
          </div>
        )}
      </section>

      {/* ================= EXPERT DOMAIN CATEGORIES ================= */}
      <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Curated Specializations
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Specialized Practice Domains
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Frontier AI development requires rigorous verification from authoritative disciplines.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoriesWithCounts.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.name}
                href={`/tasks?category=${encodeURIComponent(cat.name)}`}
                className="group bg-card rounded-[14px] border border-border p-6 hover:border-primary hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {cat.desc}
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-border flex items-center justify-between text-xs font-semibold text-primary">
                  <span>{cat.taskCount}</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ================= FAQ SECTION ================= */}
      <section id="faq" className="w-full overflow-hidden">
        <FaqSection data={faqData} />
      </section>
    </div>
  );
}
