import Link from "next/link";
import { ProfileCompletenessResult } from "@/lib/profile";
import { MIN_PROFILE_TO_APPLY } from "@/lib/constants";
import { AlertCircle, CheckCircle2, ChevronRight, Zap } from "lucide-react";

interface CompletenessCardProps {
  completeness: ProfileCompletenessResult;
}

export function CompletenessCard({ completeness }: CompletenessCardProps) {
  // Hidden at 100%
  if (completeness.score >= 100) return null;

  const isBelowThreshold = completeness.score < MIN_PROFILE_TO_APPLY;
  const topMissing = completeness.missing.slice(0, 3);

  return (
    <div
      className={`rounded-[14px] p-5 border shadow-2xs transition-all ${
        isBelowThreshold
          ? "bg-[#FEF3C7] border-[#FDE68A] text-[#78350F]"
          : "bg-card border-border text-foreground"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isBelowThreshold ? (
              <AlertCircle className="h-4 w-4 text-[#B45309] shrink-0" />
            ) : (
              <Zap className="h-4 w-4 text-primary shrink-0" />
            )}
            <h3 className="font-heading text-sm font-bold">
              {isBelowThreshold
                ? "Complete your profile to start applying."
                : `Profile Completeness: ${completeness.score}%`}
            </h3>
          </div>
          <p
            className={`text-xs ${
              isBelowThreshold ? "text-[#78350F]/90" : "text-muted-foreground"
            }`}
          >
            {isBelowThreshold
              ? `You need at least ${MIN_PROFILE_TO_APPLY}% completeness to submit task applications. Currently at ${completeness.score}%.`
              : "Complete all sections to boost review priority when domain leads evaluate applicants."}
          </p>
        </div>

        {/* Progress Bar & Jump Button */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`w-32 sm:w-44 h-2 rounded-full overflow-hidden ${
              isBelowThreshold ? "bg-[#FDE68A]" : "bg-muted"
            }`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isBelowThreshold ? "bg-[#B45309]" : "bg-primary"
              }`}
              style={{ width: `${completeness.score}%` }}
            />
          </div>

          <Link href={topMissing[0]?.href || "/profile"}>
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1 transition-colors ${
                isBelowThreshold
                  ? "bg-[#B45309] text-white hover:bg-[#92400E]"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              <span>Continue</span>
              <ChevronRight className="h-3 w-3" />
            </span>
          </Link>
        </div>
      </div>

      {/* Top 3 Missing Items */}
      {topMissing.length > 0 && (
        <div
          className={`mt-3.5 pt-3 border-t flex flex-wrap items-center gap-2 text-xs ${
            isBelowThreshold ? "border-[#FDE68A]/80" : "border-border/60"
          }`}
        >
          <span className="text-[11px] font-semibold opacity-80">
            Next steps:
          </span>
          {topMissing.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-1.5 ${
                isBelowThreshold
                  ? "bg-white/80 border-[#FDE68A] text-[#78350F] hover:bg-white"
                  : "bg-muted/40 border-border/80 text-foreground hover:bg-muted/70"
              }`}
            >
              <span>+ {item.label}</span>
              <ChevronRight className="h-3 w-3 opacity-60" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
