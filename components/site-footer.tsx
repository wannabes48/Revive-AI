import Link from "next/link";
import { Sparkles, Shield, ArrowUpRight } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-heading font-extrabold text-xl tracking-tight text-foreground">
                Revive<span className="text-primary">AI</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              The premier domain expert network evaluating, fine-tuning, and red-teaming frontier artificial intelligence models for safety and reasoning rigor.
            </p>
            <div className="flex items-center gap-2 text-xs text-primary font-medium">
              <Shield className="h-3.5 w-3.5" />
              <span>Verified institutional contributor network</span>
            </div>
          </div>

          {/* Platform Links */}
          <div className="space-y-3">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
              Platform
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/tasks" className="hover:text-primary transition-colors">
                  Open Tasks
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-primary transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/#categories" className="hover:text-primary transition-colors">
                  Specialty Domains
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-primary transition-colors">
                  FAQ & Verification
                </Link>
              </li>
            </ul>
          </div>

          {/* Contributor Links */}
          <div className="space-y-3">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground">
              Contributors
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/signup" className="hover:text-primary transition-colors">
                  Create Profile
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-primary transition-colors">
                  Contributor Sign In
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-primary transition-colors">
                  Application Queue
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 mt-12 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>&copy; 2026 Revive AI Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-foreground cursor-pointer transition-colors">
              Terms of Protocol
            </span>
            <span className="hover:text-foreground cursor-pointer transition-colors">
              Privacy Framework
            </span>
            <span className="hover:text-foreground cursor-pointer transition-colors">
              Contributor Standards
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
