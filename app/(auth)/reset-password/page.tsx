"use client";

import * as React from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Shield,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function ResetPasswordPage() {
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      setLoading(false);
      return;
    }

    const result = await resetPasswordAction(formData);

    if (result?.error) {
      setErrorMessage(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col justify-between h-full space-y-6">
      <div className="space-y-6">
        {/* Header meta */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D3E2DE]">
          <span className="text-xs font-bold text-[#0F766E]">
            Account Security Protocol
          </span>

          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Lock className="h-3 w-3 text-[#0F766E]" />
            Session Re-Authentication
          </span>
        </div>

        {/* State Header */}
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Establish New Security Phrase
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Please enter your new hardened password below to regain full access to your terminal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reset-password" className="text-xs font-semibold text-foreground">
              New Password *
            </Label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="reset-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                minLength={8}
                placeholder="At least 8 characters"
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

          <div className="space-y-1.5">
            <Label htmlFor="reset-confirmPassword" className="text-xs font-semibold text-foreground">
              Confirm New Password *
            </Label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="reset-confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                minLength={8}
                placeholder="Re-enter password"
                className="pl-10 pr-10 h-11 rounded-[10px] border-[#D3E2DE] bg-card text-xs font-mono focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 focus-visible:border-[#0F766E]"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-full bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-bold shadow-2xs transition-all duration-150 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Updating security key...</span>
                </>
              ) : (
                <>
                  <span>Save Password &amp; Enter Workbench</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="pt-2 text-center">
          <Link
            href="/login"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel and return to login
          </Link>
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
