import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAF3] flex flex-col font-sans">
      {/* Header */}
      <header className="w-full bg-card border-b border-[#D3E2DE] sticky top-0 z-40 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-heading font-bold text-lg text-foreground hover:opacity-85 transition-opacity"
          >
            <span className="w-8 h-8 rounded-full bg-[#0F766E] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="h-4 w-4" />
            </span>
            Revive<span className="text-[#0F766E]">AI</span>
          </Link>

          <nav className="flex items-center gap-5 text-xs font-semibold text-muted-foreground">
            <Link href="/terms" className="hover:text-[#0F766E] transition-colors">
              Terms
            </Link>
            <Link href="/nda" className="hover:text-[#0F766E] transition-colors">
              Confidentiality
            </Link>
            <Link href="/code-of-conduct" className="hover:text-[#0F766E] transition-colors">
              Code of Conduct
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-card border-t border-[#D3E2DE] mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Revive AI Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-[#0F766E] transition-colors">
              Terms of Service
            </Link>
            <Link href="/nda" className="hover:text-[#0F766E] transition-colors">
              Confidentiality (NDA)
            </Link>
            <Link href="/code-of-conduct" className="hover:text-[#0F766E] transition-colors">
              Code of Conduct
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
