"use client";

import * as React from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(event.currentTarget);
    const result = await forgotPasswordAction(formData);

    if (result?.error) {
      setErrorMessage(result.error);
    } else if (result?.success && result?.message) {
      setSuccessMessage(result.message);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col justify-between h-full space-y-6">
      <div className="space-y-6">
        {/* Back Link */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D3E2DE]">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Terminal Login</span>
          </Link>

          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Lock className="h-3 w-3 text-[#0F766E]" />
            Recovery Session
          </span>
        </div>

        {/* State Header */}
        <div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Recover Terminal Access
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Enter your registered academic or professional email to receive secure password recovery instructions.
          </p>
        </div>

        {successMessage ? (
          <div className="p-8 rounded-xl bg-card border border-[#99F6E4] text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">
                Recovery Dispatch Sent
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-sm mx-auto">
                {successMessage}
              </p>
            </div>
            <div className="pt-2">
              <Link href="/login">
                <Button className="rounded-full text-xs font-bold bg-[#0F766E] text-white hover:bg-[#115E59] px-6 h-9">
                  Return to Terminal Login
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="forgot-email" className="text-xs font-semibold text-foreground">
                Registered Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="forgot-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@institution.edu or firm.com"
                  className="pl-10 h-11 rounded-[10px] border-[#D3E2DE] bg-card text-xs focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 focus-visible:border-[#0F766E]"
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
                    <span>Transmitting recovery dispatch...</span>
                  </>
                ) : (
                  <>
                    <span>Send Recovery Instructions</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        <div className="pt-2 text-center">
          <p className="text-xs text-muted-foreground">
            Remembered your credentials?{" "}
            <Link
              href="/login"
              className="text-[#0F766E] font-bold hover:underline transition-colors"
            >
              Log in now
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
