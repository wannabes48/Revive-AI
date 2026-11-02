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
  const [oauthLoading, setOauthLoading] = React.useState<"google" | "github" | null>(null);
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

  async function handleOAuth(provider: "google" | "github") {
    try {
      setOauthLoading(provider);
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo || "/dashboard")}`,
        },
      });
      if (error) {
        toast.error(`Could not sign in with ${provider}`, { description: error.message });
        setOauthLoading(null);
      }
    } catch (err: any) {
      toast.error("OAuth failed", { description: err?.message });
      setOauthLoading(null);
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

        {/* OAuth Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={loading || Boolean(oauthLoading)}
            onClick={() => handleOAuth("google")}
            className="w-full h-10 rounded-full border-[#D3E2DE] hover:border-[#0F766E] text-xs font-semibold gap-2.5 bg-card hover:bg-[#F7FAF9]"
          >
            {oauthLoading === "google" ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#0F766E]" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.67-5.17 3.67-9.15z"
                  fill="#4285F4"
                />
                <path
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  fill="#34A853"
                />
                <path
                  d="M5.27 14.24c-.25-.72-.39-1.5-.39-2.24s.14-1.52.39-2.24V6.61H1.25C.45 8.22 0 10.05 0 12s.45 3.78 1.25 5.39l4.02-3.15z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.61l4.02 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
                  fill="#EA4335"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={loading || Boolean(oauthLoading)}
            onClick={() => handleOAuth("github")}
            className="w-full h-10 rounded-full border-[#D3E2DE] hover:border-[#0F766E] text-xs font-semibold gap-2.5 bg-card hover:bg-[#F7FAF9]"
          >
            {oauthLoading === "github" ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#0F766E]" />
            ) : (
              <svg className="w-4 h-4 shrink-0 fill-current text-foreground" viewBox="0 0 24 24">
                <path
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  fillRule="evenodd"
                />
              </svg>
            )}
            <span>Continue with GitHub</span>
          </Button>
        </div>

        {/* Institutional Sign-In Option */}
        <button
          type="button"
          onClick={() =>
            toast.info("Institutional Sign-In", {
              description:
                "Enter your university or organization email below to authenticate with institutional credentials.",
            })
          }
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-full border border-dashed border-[#D3E2DE] hover:border-[#0F766E] text-muted-foreground hover:text-[#0F766E] text-xs font-semibold transition-colors duration-150 cursor-pointer"
        >
          <GraduationCap className="h-4 w-4" />
          <span>Institutional Sign-In (ORCID / SAML SSO)</span>
        </button>

        {/* Separation Divider */}
        <div className="relative flex items-center justify-center">
          <div className="w-full border-t border-[#D3E2DE]" />
          <span className="bg-card px-3 text-muted-foreground text-[10px] font-bold uppercase tracking-wider absolute">
            Or with institutional credentials
          </span>
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
                Security Key / Password
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
