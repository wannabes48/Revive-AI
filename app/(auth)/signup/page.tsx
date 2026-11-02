"use client";

import * as React from "react";
import Link from "next/link";
import { signUpAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";

export default function SignupPage() {
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [passwordValue, setPasswordValue] = React.useState("");

  // Dynamic Password Strength Meter
  const strengthInfo = React.useMemo(() => {
    if (!passwordValue) {
      return { score: 0, text: "Min 8 characters", color: "text-muted-foreground" };
    }
    let s = 0;
    if (passwordValue.length >= 8) s++;
    if (/[A-Z]/.test(passwordValue) && /[a-z]/.test(passwordValue)) s++;
    if (/[0-9]/.test(passwordValue)) s++;
    if (/[^A-Za-z0-9]/.test(passwordValue)) s++;

    if (s <= 1) {
      return { score: 1, text: "Vulnerable", color: "text-destructive" };
    } else if (s === 2) {
      return { score: 2, text: "Fair", color: "text-[#B45309]" };
    } else if (s === 3) {
      return { score: 3, text: "Strong", color: "text-[#0F766E]" };
    } else {
      return { score: 4, text: "Institutional Grade", color: "text-[#0F766E] font-bold" };
    }
  }, [passwordValue]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(event.currentTarget);
    const result = await signUpAction(formData);

    if (result?.error) {
      setErrorMessage(result.error);
    } else if (result?.success && result?.message) {
      setSuccessMessage(result.message);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col justify-between h-full space-y-6">
      <div className="space-y-5">
        {/* Tab Segment Control: Pill switch between 'Log In' & 'Create Specialist Account' */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D3E2DE] gap-2">
          <div className="inline-flex max-w-full p-1 rounded-full bg-[#E5EFEC] border border-[#D3E2DE]">
            <Link
              href="/login"
              className="px-3 sm:px-5 py-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              Log In
            </Link>
            <span className="px-3 sm:px-5 py-1.5 rounded-full text-xs font-bold bg-card text-[#0F766E] shadow-2xs whitespace-nowrap">
              Create Account
            </span>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Lock className="h-3 w-3 text-[#0F766E]" />
            Session v3.8 • SSL Secured
          </span>
        </div>

        {/* State Header */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#B45309] text-[10px] font-bold mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
            <span>Cohort 2025 Qualifications Open</span>
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Create Specialist Account
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Join 4,800+ vetted authorities training advanced reasoning models.
          </p>
        </div>

        {/* Success Confirmation Screen */}
        {successMessage ? (
          <div className="p-8 rounded-xl bg-card border border-[#99F6E4] text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">
                Expert Dossier Received
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-sm mx-auto">
                {successMessage}
              </p>
            </div>
            <div className="pt-2">
              <Link href="/login">
                <Button className="rounded-full text-xs font-bold bg-[#0F766E] text-white hover:bg-[#115E59] px-6 h-9">
                  Proceed to Terminal Login
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Banner */}
            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Legal Name & Professional Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="signup-name" className="text-xs font-semibold text-foreground">
                  Legal Name / Title *
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="signup-name"
                    name="fullName"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Dr. Evelyn Vance"
                    className="pl-10 h-11 rounded-[10px] border-[#D3E2DE] bg-card text-xs focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 focus-visible:border-[#0F766E]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-email" className="text-xs font-semibold text-foreground">
                  Professional Email *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="evelyn.vance@stanford.edu"
                    className="pl-10 h-11 rounded-[10px] border-[#D3E2DE] bg-card text-xs focus-visible:ring-2 focus-visible:ring-[#0F766E]/20 focus-visible:border-[#0F766E]"
                  />
                </div>
              </div>
            </div>

            {/* Domain Selection Dropdown */}
            <div className="space-y-1.5">
              <Label htmlFor="signup-domain" className="text-xs font-semibold text-foreground">
                Primary Domain of Authority *
              </Label>
              <div className="relative">
                <select
                  id="signup-domain"
                  name="expertise"
                  required
                  defaultValue=""
                  className="w-full h-11 pl-3.5 pr-10 rounded-[10px] border border-[#D3E2DE] text-xs text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] appearance-none cursor-pointer"
                >
                  <option value="" disabled>
                    Select your domain specialization...
                  </option>
                  <option value="Healthcare">Healthcare, Clinical Pathology &amp; Genomics</option>
                  <option value="Software Engineering">Software Engineering, Architecture &amp; CUDA</option>
                  <option value="Legal">Legal Informatics, Antitrust &amp; Statutory Law</option>
                  <option value="STEM">Pure Mathematics, Topology &amp; Physics</option>
                  <option value="Writing">Frontier AI Safety, RLHF &amp; Constitutional Alignment</option>
                  <option value="Finance">Macroeconomic Modeling, Finance &amp; Econometrics</option>
                  <option value="Languages">Translation, Linguistics &amp; Cultural Semantics</option>
                  <option value="Education">Education, Pedagogy &amp; Curriculum Design</option>
                  <option value="Other">Other Specialized Research Domain</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Password Creation with Dynamic Strength Meter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="signup-password" className="text-xs font-semibold text-foreground">
                  Create Security Password *
                </Label>
                <span className={`text-[11px] font-semibold ${strengthInfo.color}`}>
                  {strengthInfo.text}
                </span>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="signup-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  minLength={8}
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  placeholder="Create a hardened phrase (min 8 chars)"
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

              {/* Dynamic 4-Bar Strength Meter */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <div
                  className={`h-1 rounded-full transition-colors ${
                    strengthInfo.score >= 1
                      ? strengthInfo.score === 1
                        ? "bg-destructive"
                        : "bg-[#0F766E]"
                      : "bg-[#E5EFEC]"
                  }`}
                />
                <div
                  className={`h-1 rounded-full transition-colors ${
                    strengthInfo.score >= 2 ? "bg-[#0F766E]" : "bg-[#E5EFEC]"
                  }`}
                />
                <div
                  className={`h-1 rounded-full transition-colors ${
                    strengthInfo.score >= 3 ? "bg-[#0F766E]" : "bg-[#E5EFEC]"
                  }`}
                />
                <div
                  className={`h-1 rounded-full transition-colors ${
                    strengthInfo.score >= 4 ? "bg-[#0F766E]" : "bg-[#E5EFEC]"
                  }`}
                />
              </div>
            </div>

            {/* Legal & NDA Consent Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  className="mt-0.5 w-4 h-4 rounded border-[#D3E2DE] text-[#0F766E] focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px] text-muted-foreground leading-relaxed">
                  I agree to the{" "}
                  <Link href="/" className="text-[#0F766E] underline hover:text-[#115E59]">
                    Terms of Service
                  </Link>
                  , strict model{" "}
                  <Link href="/" className="text-[#0F766E] underline hover:text-[#115E59]">
                    Confidentiality Precursor (NDA)
                  </Link>
                  , and the{" "}
                  <Link href="/" className="text-[#0F766E] underline hover:text-[#115E59]">
                    Expert Code of Conduct
                  </Link>
                  .
                </span>
              </label>
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
                    <span>Submitting dossier & credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account &amp; Join Waitlist</span>
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        <div className="pt-1 text-center">
          <p className="text-xs text-muted-foreground">
            Already registered in our directory?{" "}
            <Link
              href="/login"
              className="text-[#0F766E] font-bold hover:underline transition-colors"
            >
              Log in to your terminal
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
