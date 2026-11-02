import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Dna,
  Scale,
  Code2,
  Brain,
  DollarSign,
  Users,
  Shield,
  ArrowRight,
} from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#F7FAF9] text-foreground antialiased min-h-screen flex flex-col font-sans selection:bg-primary/10 selection:text-primary">
      {/* TOP APP BAR */}
      <header className="w-full bg-card border-b border-border shadow-2xs sticky top-0 z-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Brand & Left Navigation Links */}
          <div className="flex items-center gap-6 sm:gap-8">
            <Link
              href="/"
              className="font-heading text-lg sm:text-xl font-bold text-foreground tracking-tight flex items-center gap-2.5 transition-opacity hover:opacity-90"
            >
              <span className="w-8 h-8 rounded-full bg-[#0F766E] text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                R
              </span>
              <span>
                Revive<span className="text-[#0F766E]">AI</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-muted-foreground">
              <Link
                href="/tasks"
                className="hover:text-foreground transition-colors duration-150 flex items-center gap-1.5"
              >
                <span>Browse Tasks</span>
              </Link>
              <Link
                href="/"
                className="hover:text-foreground transition-colors duration-150"
              >
                How It Works
              </Link>
              <Link
                href="/tasks"
                className="hover:text-foreground transition-colors duration-150"
              >
                Specialists
              </Link>
              <Link
                href="/dashboard"
                className="hover:text-foreground transition-colors duration-150"
              >
                Dashboard
              </Link>
            </nav>
          </div>

          {/* Right Trailing Metadata & Telemetry Badge */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* System Operational Pulse Badge */}
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D1FAE5] border border-[#A7F3D0] text-[#065F46] text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>System Operational</span>
            </div>

            <div className="h-4 w-px bg-border hidden sm:block" />

            {/* Help / Support Link */}
            <Link
              href="/tasks"
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
              title="Revive Help Center"
            >
              <HelpCircle className="h-4 w-4" />
            </Link>

            {/* Fast Switch / Portal Link */}
            <Link
              href="/login"
              className="text-xs font-bold text-[#0F766E] hover:underline hidden lg:inline-block"
            >
              Terminal Access
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CANVAS: Editorial Split Hero + Auth Container */}
      <main className="flex-1 flex items-center justify-center py-6 sm:py-10 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl rounded-[14px] border border-[#D3E2DE] bg-card shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
          {/* LEFT COLUMN: Editorial Showcase for Domain Specialists (5 cols desktop) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#E5EFEC] via-[#EBF4F2] to-[#DDF0EC] border-b lg:border-b-0 lg:border-r border-[#D3E2DE] p-6 sm:p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
            {/* Decorative Ambient Watermark */}
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#0F766E]/5 blur-3xl pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-[#F59E0B]/10 blur-2xl pointer-events-none" />

            {/* Top Showcase Header & Badges */}
            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#CCFBF1] border border-[#99F6E4] text-[#0F766E] text-[11px] font-bold shadow-2xs">
                <CheckCircle2 className="h-3.5 w-3.5 fill-[#0F766E] text-white" />
                <span>Frontier AI Expert Network</span>
              </div>

              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#03201D] tracking-tight leading-snug">
                Calibrate Next-Generation Intelligence.
              </h1>

              <p className="text-xs sm:text-sm text-[#3E4947] leading-relaxed">
                Elite research appointments for sovereign minds in Medicine, Constitutional Law, Formal Mathematics, and Alignment Architecture.
              </p>

              {/* Domain Matrix Pills */}
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-2.5 py-1 rounded-lg bg-card/80 border border-[#D3E2DE] text-[11px] font-semibold text-[#3E4947] flex items-center gap-1.5 shadow-2xs">
                  <Dna className="h-3.5 w-3.5 text-[#0F766E]" />
                  Life Sciences &amp; Biotech
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-card/80 border border-[#D3E2DE] text-[11px] font-semibold text-[#3E4947] flex items-center gap-1.5 shadow-2xs">
                  <Scale className="h-3.5 w-3.5 text-[#0F766E]" />
                  Legal Informatics
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-card/80 border border-[#D3E2DE] text-[11px] font-semibold text-[#3E4947] flex items-center gap-1.5 shadow-2xs">
                  <Code2 className="h-3.5 w-3.5 text-[#0F766E]" />
                  Formal Math &amp; CUDA
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-card/80 border border-[#D3E2DE] text-[11px] font-semibold text-[#3E4947] flex items-center gap-1.5 shadow-2xs">
                  <Brain className="h-3.5 w-3.5 text-[#0F766E]" />
                  RLHF &amp; Alignment
                </span>
              </div>
            </div>

            {/* Testimonial Quote Card & Live Telemetry Metrics */}
            <div className="relative z-10 space-y-4 pt-6">
              {/* Specialist Quote Card */}
              <div className="bg-card/90 backdrop-blur-sm p-4 rounded-xl border border-[#D3E2DE] shadow-2xs space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#0F766E] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    AT
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#03201D]">Dr. Aris Thorne</p>
                    <p className="text-[10px] text-muted-foreground">
                      Postdoctoral Researcher • Neuro-Oncology
                    </p>
                  </div>
                </div>
                <p className="text-xs text-[#3E4947] italic leading-relaxed">
                  &ldquo;Revive AI feels like a peer review symposium, not crowdsourced labeling. The compensation honors academic rigor, with synchronous tasks fitting tightly around my clinical research schedule.&rdquo;
                </p>
              </div>

              {/* Bottom Telemetry Badges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-card/80 rounded-xl border border-[#D3E2DE] flex flex-col justify-center">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-[#B45309]" />
                    Honored Range
                  </span>
                  <span className="font-heading text-base font-bold text-[#0F766E] mt-0.5">
                    $90 – $220/hr
                  </span>
                </div>

                <div className="p-3 bg-card/80 rounded-xl border border-[#D3E2DE] flex flex-col justify-center">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3 text-[#059669]" />
                    Active Bench
                  </span>
                  <span className="font-heading text-base font-bold text-foreground mt-0.5">
                    4,800+ Vetted
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Auth Form Container (7 cols desktop) */}
          <div className="lg:col-span-7 p-6 sm:p-10 md:p-12 flex flex-col justify-between bg-card">
            {children}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-card border-t border-border mt-auto">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
            <span className="font-heading font-bold text-foreground tracking-tight">
              Revive<span className="text-[#0F766E]">AI</span>
            </span>
            <span className="hidden sm:inline text-border">•</span>
            <p>
              &copy; {new Date().getFullYear()} Revive AI Inc. Specialized human intelligence network.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] font-semibold">
            <Link href="/" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="/" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/" className="hover:text-foreground transition-colors">
              Code of Conduct
            </Link>
            <div className="inline-flex items-center gap-1.5 text-[#0F766E]">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span>Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
