"use client";

import * as React from "react";
import Link from "next/link";
import { Project, ProjectInvitation, OpenOpportunity } from "@/lib/supabase/types";
import { submitOpportunityInterest, respondToProjectInvitation } from "@/actions/onboarding";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import {
  Briefcase,
  Clock,
  Sparkles,
  ArrowRight,
  Check,
  CheckCircle2,
  Users,
  ChevronRight,
  Send,
  Loader2,
  X,
  ExternalLink,
} from "lucide-react";

interface ProjectsFeedProps {
  currentProjects: Project[];
  pastProjects: Project[];
  invitations: (ProjectInvitation & { project: Project })[];
  opportunities: OpenOpportunity[];
}

export function ProjectsFeed({
  currentProjects,
  pastProjects,
  invitations: initialInvitations,
  opportunities: initialOpportunities,
}: ProjectsFeedProps) {
  const [projectTab, setProjectTab] = React.useState<"current" | "past">("current");
  const [invitations, setInvitations] = React.useState(initialInvitations);
  const [opportunities, setOpportunities] = React.useState(initialOpportunities);

  // Selected invitation dialog
  const [selectedInvite, setSelectedInvite] = React.useState<
    (ProjectInvitation & { project: Project }) | null
  >(null);
  const [inviteActionLoading, setInviteActionLoading] = React.useState(false);

  // Interest submission loading set
  const [submittingInterestIds, setSubmittingInterestIds] = React.useState<Set<string>>(new Set());
  const [submittedInterestIds, setSubmittedInterestIds] = React.useState<Set<string>>(new Set());

  const handleAcceptInvite = async (invitationId: string) => {
    setInviteActionLoading(true);
    const res = await respondToProjectInvitation(invitationId, "accepted");
    setInviteActionLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(res.message || "Invitation accepted!");
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      setSelectedInvite(null);
    }
  };

  const handleDeclineInvite = async (invitationId: string) => {
    setInviteActionLoading(true);
    const res = await respondToProjectInvitation(invitationId, "declined");
    setInviteActionLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.info(res.message || "Invitation declined.");
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      setSelectedInvite(null);
    }
  };

  const handleSubmitInterest = async (oppId: string) => {
    setSubmittingInterestIds((prev) => new Set(prev).add(oppId));
    const res = await submitOpportunityInterest(oppId);
    setSubmittingInterestIds((prev) => {
      const next = new Set(prev);
      next.delete(oppId);
      return next;
    });

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(res.message || "Interest submitted!");
      setSubmittedInterestIds((prev) => new Set(prev).add(oppId));
    }
  };

  const activeProjectList = projectTab === "current" ? currentProjects : pastProjects;

  return (
    <div className="space-y-8">
      {/* SECTION 1: Active / Current Projects */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground">
              Project Assignments
            </h3>
            <p className="text-xs text-muted-foreground">
              Frontier domain projects and ongoing client verification batches.
            </p>
          </div>

          {/* Segmented Toggle: Current vs Past */}
          <div className="inline-flex items-center p-1 bg-muted rounded-full self-start sm:self-auto border border-border/40">
            <button
              type="button"
              onClick={() => setProjectTab("current")}
              className={`px-3.5 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                projectTab === "current"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Current ({currentProjects.length})
            </button>
            <button
              type="button"
              onClick={() => setProjectTab("past")}
              className={`px-3.5 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                projectTab === "past"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Past ({pastProjects.length})
            </button>
          </div>
        </div>

        {/* Project Cards List */}
        {activeProjectList.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {activeProjectList.map((project) => {
              const totalTasks = project.total_tasks || 25;
              const completedTasks = project.tasks_completed || 0;
              const progressPct = Math.round((completedTasks / totalTasks) * 100);

              const rateCents = project.rate_cents_per_hour || project.hourly_rate_cents || 4500;
              const rateFormatted = `$${(rateCents / 100).toFixed(2)}/hr`;
              const projectTitle = project.title || project.name || "Specialist Tasking Project";
              const domainName = project.category || project.domain || "Specialist AI";

              return (
                <div
                  key={project.id}
                  className="bg-card rounded-2xl border border-border p-5 shadow-2xs hover:border-border/80 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {domainName}
                        </span>
                        <span className="text-xs font-extrabold text-[#0F766E] bg-[#CCFBF1]/50 px-2.5 py-0.5 rounded-full border border-[#0F766E]/20">
                          {rateFormatted}
                        </span>
                      </div>
                      <h4 className="font-heading text-base font-bold text-foreground">
                        {projectTitle}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 max-w-xl">
                        {project.description}
                      </p>
                    </div>

                    <div className="shrink-0 sm:self-center">
                      <Link href={`/work`}>
                        <Button
                          size="sm"
                          className="rounded-full text-xs font-bold h-9 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white gap-1.5 cursor-pointer shadow-xs"
                        >
                          <span>{projectTab === "current" ? "Continue Tasking" : "View Logs"}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Progress Bar & Task Completion Ratio */}
                  <div className="pt-2 border-t border-border/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-muted-foreground">Progress Completion</span>
                      <span className="font-mono text-foreground font-semibold">
                        {completedTasks} / {totalTasks} tasks completed ({progressPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-[#0F766E] rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-2">
            <Briefcase className="h-8 w-8 text-muted-foreground mx-auto" />
            <h4 className="font-heading text-sm font-bold text-foreground">
              No {projectTab === "current" ? "active" : "past"} projects found
            </h4>
            <p className="text-xs text-muted-foreground">
              Complete your initial onboarding benchmark to be assigned to active client verification pods.
            </p>
          </div>
        )}
      </div>

      {/* SECTION 2: "You're Invited to Join" Cards */}
      {invitations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-heading text-lg font-bold text-foreground">
              You&apos;re Invited to Join ({invitations.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {invitations.map((inv) => {
              const project = inv.project;
              const rateCents = project?.rate_cents_per_hour || project?.hourly_rate_cents || 6500;
              const rateFormatted = `$${(rateCents / 100).toFixed(2)}/hr`;
              const projectTitle = project?.title || project?.name || "Specialist AI Project";

              return (
                <div
                  key={inv.id}
                  className="bg-gradient-to-r from-card via-card to-[#F8FAF3] rounded-2xl border border-[#0F766E]/30 p-5 shadow-2xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 border border-amber-500/30">
                          Priority Invitation
                        </span>
                        <span className="text-xs font-extrabold text-[#0F766E] bg-[#CCFBF1] px-2.5 py-0.5 rounded-full border border-[#0F766E]/20">
                          {rateFormatted}
                        </span>
                      </div>
                      <h4 className="font-heading text-base font-bold text-foreground">
                        {projectTitle}
                      </h4>
                      <p className="text-xs text-muted-foreground max-w-xl">
                        {project?.description}
                      </p>

                      {/* Participant Avatar Stack */}
                      <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                        <div className="flex -space-x-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 border border-white text-white flex items-center justify-center text-[9px] font-bold">
                            DK
                          </span>
                          <span className="w-5 h-5 rounded-full bg-cyan-600 border border-white text-white flex items-center justify-center text-[9px] font-bold">
                            AR
                          </span>
                          <span className="w-5 h-5 rounded-full bg-indigo-600 border border-white text-white flex items-center justify-center text-[9px] font-bold">
                            MT
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-foreground">
                          +18 domain contributors active now
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 sm:self-center">
                      <Button
                        size="sm"
                        onClick={() => setSelectedInvite(inv)}
                        className="rounded-full text-xs font-bold h-9 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span>View Invite</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: "Open Opportunities" List */}
      <div className="space-y-4">
        <div>
          <h3 className="font-heading text-lg font-bold text-foreground">
            Open Domain Opportunities
          </h3>
          <p className="text-xs text-muted-foreground">
            Specialized client queues seeking authoritative disciplinary reviewers.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border divide-y divide-border/60 shadow-2xs overflow-hidden">
          {opportunities.map((opp) => {
            const isSubmitting = submittingInterestIds.has(opp.id);
            const isSubmitted =
              submittedInterestIds.has(opp.id) || opp.user_interest_status === "submitted";

            const rateFormatted = `$${(opp.rate_cents_per_hour / 100).toFixed(2)}/hr`;

            return (
              <div
                key={opp.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/40">
                      {opp.category}
                    </span>
                    <span className="text-xs font-bold text-[#0F766E] bg-[#CCFBF1]/40 px-2.5 py-0.5 rounded-full">
                      {rateFormatted}
                    </span>
                  </div>
                  <h4 className="font-heading text-sm sm:text-base font-bold text-foreground">
                    {opp.title}
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-xl">
                    {opp.description}
                  </p>
                  {opp.requirements && (
                    <span className="text-[11px] text-muted-foreground italic block">
                      Requirement: {opp.requirements}
                    </span>
                  )}
                </div>

                <div className="shrink-0 sm:self-center">
                  {isSubmitted ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F766E] bg-[#E5EFEC] px-3.5 py-1.5 rounded-full border border-[#0F766E]/20">
                      <Check className="h-3.5 w-3.5" />
                      <span>Submitted</span>
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => handleSubmitInterest(opp.id)}
                      className="rounded-full text-xs font-semibold h-9 px-4 text-[#0F766E] border-[#0F766E]/40 hover:bg-[#CCFBF1]/40 gap-1.5 cursor-pointer touch-target"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      <span>Submit interest</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invitation Modal Dialog */}
      <ResponsiveDialog
        open={Boolean(selectedInvite)}
        onOpenChange={(open) => !open && setSelectedInvite(null)}
        title="Project Invitation Details"
        description="Review project scope, benchmark compensation, and contributor expectations."
      >
        {selectedInvite && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F766E]">
                {selectedInvite.project.category || selectedInvite.project.domain || "Specialist AI"}
              </span>
              <h4 className="font-heading text-base font-bold text-foreground">
                {selectedInvite.project.title || selectedInvite.project.name}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {selectedInvite.project.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-border bg-card">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                  Hourly Compensation
                </span>
                <span className="text-base font-extrabold text-[#0F766E] block mt-0.5">
                  ${((selectedInvite.project.rate_cents_per_hour || selectedInvite.project.hourly_rate_cents || 6500) / 100).toFixed(2)}/hr
                </span>
              </div>
              <div className="p-3 rounded-xl border border-border bg-card">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                  Estimated Scope
                </span>
                <span className="text-base font-bold text-foreground block mt-0.5">
                  {selectedInvite.project.total_tasks || 30} Benchmark Tasks
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={inviteActionLoading}
                onClick={() => handleDeclineInvite(selectedInvite.id)}
                className="rounded-full text-xs text-destructive hover:bg-destructive/10"
              >
                Decline
              </Button>
              <Button
                type="button"
                disabled={inviteActionLoading}
                onClick={() => handleAcceptInvite(selectedInvite.id)}
                className="rounded-full text-xs font-bold px-5 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white gap-1.5"
              >
                {inviteActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>Accept Invitation</span>
              </Button>
            </div>
          </div>
        )}
      </ResponsiveDialog>
    </div>
  );
}
