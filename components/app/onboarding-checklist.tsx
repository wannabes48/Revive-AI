import Link from "next/link";
import { ProfileCompletenessResult } from "@/lib/profile";
import { MIN_PROFILE_TO_APPLY } from "@/lib/constants";
import { CheckCircle2, Circle, ArrowRight, UserCheck, Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingChecklistProps {
  completeness: ProfileCompletenessResult;
  applicationCount: number;
}

export function OnboardingChecklist({
  completeness,
  applicationCount,
}: OnboardingChecklistProps) {
  const step1Done = completeness.score >= MIN_PROFILE_TO_APPLY;
  const step2Done = step1Done; // Unlocked once profile meets minimum
  const step3Done = applicationCount > 0;

  const steps = [
    {
      title: "1. Complete your domain profile",
      description: `Add your credentials, expertise, and availability (at least ${MIN_PROFILE_TO_APPLY}%). Currently: ${completeness.score}%.`,
      done: step1Done,
      href: "/profile",
      cta: "Edit Profile",
      icon: UserCheck,
    },
    {
      title: "2. Browse open evaluation tasks",
      description: "Explore benchmark opportunities matching your specialty category.",
      done: step2Done,
      href: "/tasks",
      cta: "Explore Tasks",
      icon: Sparkles,
    },
    {
      title: "3. Apply and join the waitlist",
      description: "Submit a brief cover summary and enter review queues in real-time.",
      done: step3Done,
      href: "/tasks",
      cta: "Submit First Application",
      icon: Send,
    },
  ];

  return (
    <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-5">
      <div className="space-y-1">
        <h3 className="font-heading text-lg font-bold text-foreground">
          Welcome to Revive AI — Quick Start Guide
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Follow these three steps to begin contributing to state-of-the-art AI benchmarking and expert evaluation cohorts.
        </p>
      </div>

      <div className="space-y-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;

          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                step.done
                  ? "bg-primary/5 border-primary/20"
                  : "bg-muted/20 border-border/70"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  {step.done ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h4
                    className={`text-sm font-bold ${
                      step.done ? "text-foreground line-through opacity-80" : "text-foreground"
                    }`}
                  >
                    {step.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>

              {!step.done && (
                <Link href={step.href} className="self-end sm:self-center shrink-0">
                  <Button
                    size="sm"
                    className="rounded-full text-xs font-semibold gap-1.5 h-8 shadow-2xs"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{step.cta}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
