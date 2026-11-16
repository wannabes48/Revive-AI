"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signInAction } from "@/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const urlError = searchParams.get("error");

  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(urlError);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const result = await signInAction(formData, redirectTo);

    if (result?.error) {
      setErrorMessage(result.error);
      setLoading(false);
    }
  }


  return (
    <div className="flex flex-col justify-between h-full space-y-6">
      <div className="space-y-6">
        {/* Tab Segment Control: Pill switch between 'Log In' & 'Create Specialist Account' */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D3E2DE] gap-2">
          <div className="inline-flex max-w-full p-1 rounded-full bg-[#E5EFEC] border border-[#D3E2DE]">
            <span className="px-3 sm:px-5 py-1.5 rounded-full text-xs font-bold bg-card text-[#0F766E] shadow-2xs whitespace-nowrap">
              Log In
            </span>
            <Link
              href="/signup"
              className="px-3 sm:px-5 py-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              Create Account
            </Link>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Lock className="h-3 w-3 text-[#0F766E]" />
            Session v3.8 • SSL Secured
          </span>
        </div>

        {/* State Header */}
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Welcome back to Revive AI
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Authenticate your terminal to access open tasks and peer evaluations.
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email" className="text-xs font-semibold text-foreground">
              Academic / Professional Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@institution.edu or firm.com"
                className="pl-10 h-11 rounded-[10px] border-[#D3E2DE] bg-card text-xs focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 focus-visible:border-[#0F766E]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password" className="text-xs font-semibold text-foreground">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-[#0F766E] hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="pl-10 pr-10 h-11 rounded-[10px] border-[#D3E2DE] bg-card text-xs font-mono focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 focus-visible:border-[#0F766E]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Remember Device & 2FA Badge */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded border-[#D3E2DE] text-[#0F766E] focus:ring-0 cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">
                Remember this workstation for 30 days
              </span>
            </label>

            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669]">
              <ShieldCheck className="h-3.5 w-3.5" />
              2FA Active
            </span>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-full bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold shadow-2xs transition-all duration-150 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating terminal...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Workbench</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="pt-2 text-center">
          <p className="text-xs text-muted-foreground">
            Not yet registered on the bench?{" "}
            <Link
              href="/signup"
              className="text-[#0F766E] font-bold hover:underline transition-colors"
            >
              Submit an Expert Dossier
            </Link>
          </p>
        </div>
      </div>

      {/* Trust Assurance Strip */}
      <div className="mt-8 pt-4 border-t border-[#D3E2DE] flex flex-wrap items-center justify-between text-muted-foreground text-[11px] font-semibold gap-3">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-[#0F766E]" />
          <span>256-Bit Hardware Encryption</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-[#0F766E]" />
          <span>Strict Anonymized Reviews</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[#0F766E]" />
          <span>Zero Spam Policy</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0F766E]" />
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
