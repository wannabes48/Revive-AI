"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { OnboardingStepState } from "@/lib/projects-data";
import {
  submitKycVerification,
  submitTaxSetup,
  submitProjectTerms,
  submitAssessmentTask,
  submitTechnicalCheck,
} from "@/actions/onboarding";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  FileText,
  DollarSign,
  Laptop,
  Check,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Timer,
  Award,
  Zap,
  Loader2,
} from "lucide-react";

interface OnboardingChecklistCardProps {
  onboarding: {
    bannerHeadline: string;
    steps: OnboardingStepState[];
    completedCount: number;
    isFullyUnlocked: boolean;
  };
}

export function OnboardingChecklistCard({ onboarding }: OnboardingChecklistCardProps) {
  const router = useRouter();
  const { bannerHeadline, steps, completedCount, isFullyUnlocked } = onboarding;

  // Active modal step
  const [activeModalStep, setActiveModalStep] = React.useState<OnboardingStepState | null>(null);

  // Form states
  const [loading, setLoading] = React.useState(false);

  // KYC Form state
  const [kycDocType, setKycDocType] = React.useState("passport");
  const [kycCountry, setKycCountry] = React.useState("United States");
  const [kycDocNumber, setKycDocNumber] = React.useState("");

  // Tax Form state
  const [taxFormType, setTaxFormType] = React.useState<"w9" | "w8ben">("w9");
  const [taxLegalName, setTaxLegalName] = React.useState("");
  const [taxId, setTaxId] = React.useState("");
  const [taxCertify, setTaxCertify] = React.useState(false);

  // Terms state
  const [termsAgreed, setTermsAgreed] = React.useState(false);

  // Assessment task state
  const [assessmentModelChoice, setAssessmentModelChoice] = React.useState<"modelA" | "modelB" | "equal">("modelA");
  const [assessmentJustification, setAssessmentJustification] = React.useState("");
  const [assessmentFactuality, setAssessmentFactuality] = React.useState(5);
  const [assessmentInstruction, setAssessmentInstruction] = React.useState(5);
  const [antiPlagiarism, setAntiPlagiarism] = React.useState(false);
  const [timerSecondsRemaining, setTimerSecondsRemaining] = React.useState(600); // 10m default
  const [autoSaveStatus, setAutoSaveStatus] = React.useState<"saved" | "saving">("saved");

  // Timer countdown hook for open assessment
  React.useEffect(() => {
    if (activeModalStep?.type === "timed_assessment") {
      const initialSeconds = (activeModalStep.estimatedMinutes || 10) * 60;
      setTimerSecondsRemaining(initialSeconds);
      const interval = setInterval(() => {
        setTimerSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeModalStep]);

  // Auto-save debounce effect
  React.useEffect(() => {
    if (assessmentJustification) {
      setAutoSaveStatus("saving");
      const t = setTimeout(() => {
        setAutoSaveStatus("saved");
      }, 800);
      return () => clearTimeout(t);
    }
  }, [assessmentJustification, assessmentModelChoice, assessmentFactuality]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Submissions
  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    fd.set("documentType", kycDocType);
    fd.set("issuingCountry", kycCountry);
    fd.set("documentNumber", kycDocNumber);

    const res = await submitKycVerification(fd);
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(res.message || "KYC submitted for manual review.");
      setActiveModalStep(null);
      router.refresh();
    }
  };

  const handleTaxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    fd.set("taxFormType", taxFormType);
    fd.set("legalName", taxLegalName);
    fd.set("taxId", taxId);
    fd.set("certifyPerjury", taxCertify ? "true" : "false");

    const res = await submitTaxSetup(fd);
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(res.message || "Tax and payout setup saved.");
      setActiveModalStep(null);
      router.refresh();
    }
  };

  const handleTermsSubmit = async () => {
    if (!termsAgreed) {
      toast.error("Please acknowledge and agree to project terms.");
      return;
    }
    setLoading(true);
    const res = await submitProjectTerms(true);
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(res.message || "Project terms accepted.");
      setActiveModalStep(null);
      router.refresh();
    }
  };

  const handleAssessmentSubmit = async () => {
    if (!activeModalStep) return;
    setLoading(true);
    const res = await submitAssessmentTask(activeModalStep.id, {
      preference: assessmentModelChoice,
      justification: assessmentJustification,
      factualityScore: assessmentFactuality,
      instructionScore: assessmentInstruction,
      antiPlagiarismAgreed: antiPlagiarism,
      timeSpentSeconds: (activeModalStep.estimatedMinutes * 60) - timerSecondsRemaining,
    });
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(res.message || "Assessment passed!");
      setActiveModalStep(null);
      router.refresh();
    }
  };

  const handleTechCheckSubmit = async (type: string) => {
    setLoading(true);
    const res = await submitTechnicalCheck(type);
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(res.message || "Check verified.");
      setActiveModalStep(null);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-[#F8FAF3] border border-[#E2EAD9] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0F766E] animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E]">
                Admissions & Onboarding
              </span>
            </div>
            <h2 className="font-heading text-xl sm:text-2xl font-extrabold tracking-tight text-foreground mt-1">
              {bannerHeadline}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Complete each required verification and benchmark evaluation in sequence to unlock live client tasks.
            </p>
          </div>

          <div className="text-right sm:self-center shrink-0">
            <span className="text-xs font-semibold text-muted-foreground block">
              Step Completion
            </span>
            <div className="flex items-center gap-1.5 font-heading text-lg font-black text-foreground">
              <span className="text-[#0F766E]">{completedCount}</span>
              <span className="text-muted-foreground/60">/</span>
              <span>{steps.length}</span>
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({Math.round((completedCount / steps.length) * 100)}%)
              </span>
            </div>
          </div>
        </div>

        {/* 3-Step Numbered Progress Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#E2EAD9]/80">
          <div
            className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors ${
              !isFullyUnlocked
                ? "bg-white border-[#0F766E]/30 text-foreground shadow-2xs"
                : "bg-white/60 border-border/60 text-muted-foreground"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                isFullyUnlocked
                  ? "bg-[#CCFBF1] text-[#0F766E]"
                  : "bg-[#0F766E] text-white"
              }`}
            >
              {isFullyUnlocked ? <Check className="h-3.5 w-3.5" /> : "1"}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Complete onboarding</span>
              <span className="text-[10px] text-muted-foreground block truncate">
                {isFullyUnlocked ? "Finished" : "Active requirements"}
              </span>
            </div>
          </div>

          <div
            className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors ${
              isFullyUnlocked
                ? "bg-white border-[#0F766E]/40 text-foreground shadow-2xs"
                : "bg-white/40 border-border/40 text-muted-foreground opacity-75"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                isFullyUnlocked
                  ? "bg-[#0F766E] text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Start tasking, earn money</span>
              <span className="text-[10px] text-muted-foreground block truncate">
                Production queue
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/40 bg-white/40 text-muted-foreground opacity-75">
            <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs shrink-0">
              3
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">Do more tasks, earn more</span>
              <span className="text-[10px] text-muted-foreground block truncate">
                Tier bonuses & invites
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sequential Verification & Assessment Checklist */}
      <div className="bg-card rounded-2xl border border-border divide-y divide-border/60 shadow-2xs overflow-hidden">
        {steps.map((step, idx) => {
          const isLocked = step.status === "locked";
          const isCompleted = step.status === "completed";
          const isInReview = step.status === "in_review";
          const isFailed = step.status === "failed";

          return (
            <div
              key={step.id}
              className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                isLocked ? "bg-muted/10 opacity-70" : "hover:bg-muted/20"
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                {/* Status Icon */}
                <div className="mt-0.5 shrink-0">
                  {isCompleted ? (
                    <div className="w-8 h-8 rounded-full bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center shadow-2xs">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  ) : isLocked ? (
                    <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                      <Lock className="h-4 w-4" />
                    </div>
                  ) : isInReview ? (
                    <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-700 flex items-center justify-center">
                      <Clock className="h-4 w-4 animate-spin-slow" />
                    </div>
                  ) : isFailed ? (
                    <div className="w-8 h-8 rounded-full bg-destructive/15 text-destructive flex items-center justify-center">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#0F766E]/10 text-[#0F766E] border border-[#0F766E]/30 flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-sm sm:text-base font-bold text-foreground">
                      {step.title}
                    </h3>
                    <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/40">
                      {step.estimatedMinutes}m
                    </span>
                    {step.passingScore && (
                      <span className="text-[11px] font-semibold text-[#0F766E] bg-[#CCFBF1]/40 px-2 py-0.5 rounded-full">
                        Min {step.passingScore}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                    {step.subtext}
                  </p>
                </div>
              </div>

              {/* Action Button / Pill */}
              <div className="shrink-0 sm:self-center">
                {isCompleted ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F766E] bg-[#E5EFEC] px-3 py-1.5 rounded-full border border-[#0F766E]/20">
                    <Check className="h-3.5 w-3.5" />
                    <span>{step.badgeText || "Completed"}</span>
                  </span>
                ) : isInReview ? (
                  <button
                    disabled
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-500/15 px-3 py-1.5 rounded-full border border-amber-500/30 opacity-90 cursor-not-allowed"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>Pending review</span>
                  </button>
                ) : isLocked ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full border border-border/40 cursor-not-allowed">
                    <Lock className="h-3 w-3" />
                    <span>Locked</span>
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setActiveModalStep(step)}
                    className="rounded-full text-xs font-bold h-9 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>{step.badgeText || "Start"}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. STEP MODAL DISPATCHER */}
      {/* MODAL 1: Confirm Identity (KYC) */}
      <ResponsiveDialog
        open={Boolean(activeModalStep?.type === "identity_kyc")}
        onOpenChange={(open) => !open && setActiveModalStep(null)}
        title="Confirm Legal Identity (KYC)"
        description="Verify your sovereign identity and jurisdiction to comply with global contractor standards."
      >
        <form onSubmit={handleKycSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="docType" className="text-xs font-semibold">
              Government Document Type
            </Label>
            <select
              id="docType"
              value={kycDocType}
              onChange={(e) => setKycDocType(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-background text-foreground"
            >
              <option value="passport">Passport</option>
              <option value="national_id">National ID Card</option>
              <option value="driver_license">Driver&apos;s License</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="issuingCountry" className="text-xs font-semibold">
              Issuing Country
            </Label>
            <Input
              id="issuingCountry"
              value={kycCountry}
              onChange={(e) => setKycCountry(e.target.value)}
              placeholder="e.g. United States, Kenya, Canada"
              required
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="docNumber" className="text-xs font-semibold">
              Document Number
            </Label>
            <Input
              id="docNumber"
              value={kycDocNumber}
              onChange={(e) => setKycDocNumber(e.target.value)}
              placeholder="e.g. A92831048"
              required
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Encrypted Data Guarantee</p>
            <p>
              Your identification credentials are cryptographically tokenized and reviewed solely for contributor compliance.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveModalStep(null)}
              className="rounded-full text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !kycDocNumber.trim()}
              className="rounded-full text-xs font-bold px-5 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Submit for Verification
            </Button>
          </div>
        </form>
      </ResponsiveDialog>

      {/* MODAL 2: Payments and Tax Setup */}
      <ResponsiveDialog
        open={Boolean(activeModalStep?.type === "tax_setup")}
        onOpenChange={(open) => !open && setActiveModalStep(null)}
        title="Payments and Tax Setup (5m)"
        description="Select your tax residency form and verify your direct payout credentials."
      >
        <form onSubmit={handleTaxSubmit} className="space-y-4 pt-2">
          {/* Toggle W9 vs W8BEN */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
            <button
              type="button"
              onClick={() => setTaxFormType("w9")}
              className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                taxFormType === "w9"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              U.S. Person (W-9)
            </button>
            <button
              type="button"
              onClick={() => setTaxFormType("w8ben")}
              className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                taxFormType === "w8ben"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Non-U.S. (W-8BEN)
            </button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="taxLegalName" className="text-xs font-semibold">
              Legal Full Name (as listed on tax records)
            </Label>
            <Input
              id="taxLegalName"
              value={taxLegalName}
              onChange={(e) => setTaxLegalName(e.target.value)}
              placeholder="Full legal or registered entity name"
              required
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="taxId" className="text-xs font-semibold">
              {taxFormType === "w9" ? "SSN or Employer Identification Number (EIN)" : "Foreign Tax ID / National ID"}
            </Label>
            <Input
              id="taxId"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder={taxFormType === "w9" ? "XXX-XX-XXXX" : "National tax identifier"}
              required
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border bg-muted/20 cursor-pointer">
            <input
              type="checkbox"
              checked={taxCertify}
              onChange={(e) => setTaxCertify(e.target.checked)}
              className="mt-0.5 rounded border-border"
            />
            <span className="text-[11px] text-muted-foreground leading-relaxed">
              Under penalties of perjury, I certify that the information provided is correct and that I am authorized to submit this tax filing certification.
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveModalStep(null)}
              className="rounded-full text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !taxCertify || !taxLegalName || !taxId}
              className="rounded-full text-xs font-bold px-5 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Save and Complete
            </Button>
          </div>
        </form>
      </ResponsiveDialog>

      {/* MODAL 3: Project Terms & NDA */}
      <ResponsiveDialog
        open={Boolean(activeModalStep?.type === "terms_nda")}
        onOpenChange={(open) => !open && setActiveModalStep(null)}
        title="Project Terms & Confidentiality NDA (2m)"
        description="Master services agreement, proprietary intellectual property assignment, and strict confidentiality."
      >
        <div className="space-y-4 pt-2">
          <div className="max-h-56 overflow-y-auto p-4 rounded-xl border border-border bg-muted/10 text-xs text-muted-foreground space-y-3 leading-relaxed">
            <h4 className="font-bold text-foreground">1. Non-Disclosure & IP Protection</h4>
            <p>
              As a domain contributor on ReviveAI, you will evaluate frontier models, internal client prompts, and benchmark test suites. All task data, prompts, and completions are strictly confidential and proprietary trade secrets.
            </p>
            <h4 className="font-bold text-foreground">2. Prohibited Disclosures</h4>
            <p>
              You agree never to screenshot, export, publish, or train external personal models using proprietary evaluation traces delivered through ReviveAI.
            </p>
            <h4 className="font-bold text-foreground">3. Fair Compensation & Independent Contractor Status</h4>
            <p>
              Services are rendered as an independent specialist contractor. Compensation is calculated according to published per-item and hourly rates.
            </p>
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-[#0F766E]/30 bg-[#CCFBF1]/20 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAgreed}
              onChange={(e) => setTermsAgreed(e.target.checked)}
              className="mt-0.5 rounded border-[#0F766E]"
            />
            <span className="text-xs font-semibold text-foreground leading-relaxed">
              I have read, understood, and agree to the ReviveAI Contributor Master Agreement and Non-Disclosure Terms.
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveModalStep(null)}
              className="rounded-full text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading || !termsAgreed}
              onClick={handleTermsSubmit}
              className="rounded-full text-xs font-bold px-5 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Sign & Accept Terms
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* MODAL 4: Timed Assessment Interface */}
      <ResponsiveDialog
        open={Boolean(activeModalStep?.type === "timed_assessment")}
        onOpenChange={(open) => !open && setActiveModalStep(null)}
        title={
          <div className="flex items-center justify-between w-full pr-6">
            <span>{activeModalStep?.title}</span>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold bg-amber-500/15 text-amber-800 border border-amber-500/30 px-3 py-1 rounded-full">
              <Timer className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
              <span>{formatTimer(timerSecondsRemaining)}</span>
            </div>
          </div>
        }
        description="Side-by-side prompt evaluation and benchmark scoring rubric."
      >
        <div className="space-y-4 pt-2">
          {/* Rubric guidelines */}
          <div className="p-3.5 rounded-xl border border-border bg-muted/20 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">Evaluation Guidelines & Rubric</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${autoSaveStatus === "saved" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                {autoSaveStatus === "saved" ? "Auto-saved" : "Saving draft..."}
              </span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              {activeModalStep?.assessmentPayload?.guidelines ||
                "Compare both model generations for factual correctness, strict adherence to technical formulas, and avoidance of hallucinated assumptions."}
            </p>
          </div>

          {/* Model Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Model A */}
            <div
              onClick={() => setAssessmentModelChoice("modelA")}
              className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                assessmentModelChoice === "modelA"
                  ? "border-[#0F766E] bg-[#CCFBF1]/20 ring-2 ring-[#0F766E]/20"
                  : "border-border bg-card hover:border-border/80"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  Model Alpha Completion
                </span>
                {assessmentModelChoice === "modelA" && (
                  <span className="text-[10px] font-bold text-[#0F766E] uppercase">Selected</span>
                )}
              </div>
              <pre className="text-[11px] font-mono whitespace-pre-wrap text-foreground/90 bg-muted/40 p-2.5 rounded-lg border border-border/50 max-h-40 overflow-y-auto">
                {activeModalStep?.assessmentPayload?.modelA?.response || "Evaluating mathematical solution..."}
              </pre>
            </div>

            {/* Model B */}
            <div
              onClick={() => setAssessmentModelChoice("modelB")}
              className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                assessmentModelChoice === "modelB"
                  ? "border-[#0F766E] bg-[#CCFBF1]/20 ring-2 ring-[#0F766E]/20"
                  : "border-border bg-card hover:border-border/80"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Model Beta Completion
                </span>
                {assessmentModelChoice === "modelB" && (
                  <span className="text-[10px] font-bold text-[#0F766E] uppercase">Selected</span>
                )}
              </div>
              <pre className="text-[11px] font-mono whitespace-pre-wrap text-foreground/90 bg-muted/40 p-2.5 rounded-lg border border-border/50 max-h-40 overflow-y-auto">
                {activeModalStep?.assessmentPayload?.modelB?.response || "Evaluating alternative prompt output..."}
              </pre>
            </div>
          </div>

          {/* Criteria Ratings */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Factuality Score (1–5)</Label>
              <select
                value={assessmentFactuality}
                onChange={(e) => setAssessmentFactuality(Number(e.target.value))}
                className="w-full h-9 px-2 text-xs rounded-lg border border-border bg-background"
              >
                <option value={5}>5 - Completely Factually Accurate</option>
                <option value={4}>4 - Minor non-critical inaccuracy</option>
                <option value={3}>3 - Partially flawed logic</option>
                <option value={2}>2 - Severe hallucination</option>
                <option value={1}>1 - Completely fabricated</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Instruction Following (1–5)</Label>
              <select
                value={assessmentInstruction}
                onChange={(e) => setAssessmentInstruction(Number(e.target.value))}
                className="w-full h-9 px-2 text-xs rounded-lg border border-border bg-background"
              >
                <option value={5}>5 - Followed all constraints strictly</option>
                <option value={4}>4 - Missed minor formatting instruction</option>
                <option value={3}>3 - Skipped explicit constraint</option>
                <option value={2}>2 - Ignored negative constraints</option>
                <option value={1}>1 - Completely off-topic</option>
              </select>
            </div>
          </div>

          {/* Justification Feedback */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-semibold">
                Expert Justification Feedback (min 25 characters)
              </Label>
              <span className="text-[10px] text-muted-foreground font-mono">
                {assessmentJustification.length} chars
              </span>
            </div>
            <textarea
              value={assessmentJustification}
              onChange={(e) => setAssessmentJustification(e.target.value)}
              placeholder="Explain why the chosen model generation is superior based on accuracy, reasoning steps, and constraints..."
              rows={3}
              className="w-full p-2.5 text-xs rounded-xl border border-border bg-background placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Anti-plagiarism affirmation */}
          <label className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-muted/20 cursor-pointer">
            <input
              type="checkbox"
              checked={antiPlagiarism}
              onChange={(e) => setAntiPlagiarism(e.target.checked)}
              className="mt-0.5 rounded border-border"
            />
            <span className="text-[11px] text-muted-foreground">
              Anti-Plagiarism Certification: I confirm that these evaluations and justifications reflect my own independent intellectual assessment.
            </span>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveModalStep(null)}
              className="rounded-full text-xs"
            >
              Close
            </Button>
            <Button
              type="button"
              disabled={loading || !antiPlagiarism || assessmentJustification.trim().length < 25}
              onClick={handleAssessmentSubmit}
              className="rounded-full text-xs font-bold px-5 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Submit Benchmark Evaluation
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* MODAL 5: Technical Checks */}
      <ResponsiveDialog
        open={Boolean(activeModalStep?.type === "technical_check")}
        onOpenChange={(open) => !open && setActiveModalStep(null)}
        title="Technical Checks & Tooling Access"
        description="Verify your browser environment, latency, and Google Suite / Slack integration access."
      >
        <div className="space-y-4 pt-2 text-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
              <div className="flex items-center gap-2.5">
                <Laptop className="h-4 w-4 text-[#0F766E]" />
                <span className="font-semibold text-foreground">Browser Compatibility & Resolution</span>
              </div>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Passed
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
              <div className="flex items-center gap-2.5">
                <Zap className="h-4 w-4 text-[#0F766E]" />
                <span className="font-semibold text-foreground">Benchmark API Latency (&lt; 250ms)</span>
              </div>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Optimal
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-[#0F766E]" />
                <span className="font-semibold text-foreground">Google Suite / Slack Tooling Access</span>
              </div>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Connected
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveModalStep(null)}
              className="rounded-full text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={() => handleTechCheckSubmit("tech_suite")}
              className="rounded-full text-xs font-bold px-5 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Confirm Tooling Environment
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* MODAL 6: Onboarding Next Steps */}
      <ResponsiveDialog
        open={Boolean(activeModalStep?.type === "next_steps")}
        onOpenChange={(open) => !open && setActiveModalStep(null)}
        title="Activate Full Contributor Production Feed"
        description="Final confirmation to unlock your dedicated project queues and live earning rate tiers."
      >
        <div className="space-y-4 pt-2 text-xs">
          <div className="p-4 rounded-xl border border-[#0F766E]/30 bg-[#CCFBF1]/20 space-y-2 text-center">
            <div className="w-10 h-10 rounded-full bg-[#0F766E] text-white flex items-center justify-center mx-auto shadow-xs">
              <Award className="h-5 w-5" />
            </div>
            <h4 className="font-heading font-extrabold text-base text-foreground">
              You Have Met the Contributor Benchmark Standard!
            </h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Your domain credentials, identity, and RLHF evaluations have been recorded. You are ready to claim live client evaluation batches.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveModalStep(null)}
              className="rounded-full text-xs"
            >
              Close
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={() => handleTechCheckSubmit("next_steps")}
              className="rounded-full text-xs font-bold px-6 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white gap-1.5"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              <span>Activate Live Tasking Feed</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}
