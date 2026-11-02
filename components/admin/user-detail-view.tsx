"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Profile, UserRole, ApplicationStatus } from "@/lib/supabase/types";
import {
  updateUserRole,
  adminUpdateUserProfile,
  adminSendNotification,
  adminDeleteUser,
} from "@/actions/users";
import { setApplicationStatus } from "@/actions/applications";
import { profileCompleteness, parseEducation, parseExperience } from "@/lib/profile";
import { formatDate, formatPay } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Clock,
  Briefcase,
  GraduationCap,
  Shield,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Send,
  Edit3,
  Trash2,
  ExternalLink,
  Loader2,
  ArrowRight,
  Hourglass,
  FileText,
  Zap,
  Check,
} from "lucide-react";

interface UserDetailViewProps {
  user: Profile;
  initialApplications: any[];
  currentUserId: string;
}

type TabKey = "overview" | "applications" | "actions" | "edit";

export function UserDetailView({
  user: initialUser,
  initialApplications,
  currentUserId,
}: UserDetailViewProps) {
  const router = useRouter();

  const [user, setUser] = React.useState<Profile>(initialUser);
  const [applications, setApplications] = React.useState<any[]>(initialApplications);
  const [activeTab, setActiveTab] = React.useState<TabKey>("overview");

  // App status updates
  const [updatingAppId, setUpdatingAppId] = React.useState<string | null>(null);
  const [adminNotes, setAdminNotes] = React.useState<Record<string, string>>(() => {
    const notes: Record<string, string> = {};
    initialApplications.forEach((app) => {
      if (app.admin_note) {
        notes[app.id] = app.admin_note;
      }
    });
    return notes;
  });

  // Role action
  const [roleLoading, setRoleLoading] = React.useState(false);

  // Send notification form
  const [notifTitle, setNotifTitle] = React.useState("");
  const [notifBody, setNotifBody] = React.useState("");
  const [notifHref, setNotifHref] = React.useState("");
  const [sendingNotif, setSendingNotif] = React.useState(false);

  // Edit user profile state
  const [editFullName, setEditFullName] = React.useState(user.full_name || "");
  const [editHeadline, setEditHeadline] = React.useState(user.headline || "");
  const [editCountry, setEditCountry] = React.useState(user.country || "");
  const [editExpertise, setEditExpertise] = React.useState(user.expertise || "");
  const [editBio, setEditBio] = React.useState(user.bio || "");
  const [editPhone, setEditPhone] = React.useState(user.phone || "");
  const [editWeeklyHours, setEditWeeklyHours] = React.useState<number | "">(
    user.weekly_hours ?? ""
  );
  const [savingEdit, setSavingEdit] = React.useState(false);

  // Delete user loading
  const [deletingUser, setDeletingUser] = React.useState(false);

  const isCurrentAdmin = user.id === currentUserId;
  const displayName = user.full_name || user.email.split("@")[0] || "Contributor";
  const completeness = profileCompleteness(user as any);
  const education = parseEducation(user.education);
  const experience = parseExperience(user.experience);

  // Role Change Handler
  const handleRoleToggle = async () => {
    const targetRole: UserRole = user.role === "admin" ? "user" : "admin";
    if (
      !confirm(
        `Are you sure you want to change ${displayName}'s role to ${targetRole.toUpperCase()}?`
      )
    ) {
      return;
    }

    setRoleLoading(true);
    const res = await updateUserRole(user.id, targetRole);
    setRoleLoading(false);

    if (res.error) {
      toast.error("Failed to update role", { description: res.error });
    } else {
      toast.success("Role updated", { description: `User is now an ${targetRole}.` });
      setUser((prev) => ({ ...prev, role: targetRole }));
      router.refresh();
    }
  };

  // Application Status Update Handler
  const handleAppStatusChange = async (appId: string, newStatus: ApplicationStatus) => {
    setUpdatingAppId(appId);
    const note = adminNotes[appId] || undefined;
    const res = await setApplicationStatus(appId, newStatus, note);
    setUpdatingAppId(null);

    if (res.error) {
      toast.error("Failed to update status", { description: res.error });
    } else {
      toast.success("Application updated", {
        description: `Status changed to ${newStatus}.`,
      });
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus, admin_note: note } : a))
      );
      router.refresh();
    }
  };

  // Send Notification Handler
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim()) {
      toast.error("Notification title is required.");
      return;
    }

    setSendingNotif(true);
    const res = await adminSendNotification(
      user.id,
      notifTitle.trim(),
      notifBody.trim() || undefined,
      notifHref.trim() || undefined
    );
    setSendingNotif(false);

    if (res.error) {
      toast.error("Failed to send notification", { description: res.error });
    } else {
      toast.success("Notification sent!", {
        description: `Delivered to ${displayName}'s alert feed.`,
      });
      setNotifTitle("");
      setNotifBody("");
      setNotifHref("");
      setActiveTab("overview");
    }
  };

  // Edit Profile Save Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);

    const res = await adminUpdateUserProfile(user.id, {
      full_name: editFullName.trim(),
      headline: editHeadline.trim(),
      country: editCountry.trim(),
      expertise: editExpertise.trim(),
      bio: editBio.trim(),
      phone: editPhone.trim(),
      weekly_hours: editWeeklyHours !== "" ? Number(editWeeklyHours) : null,
    });
    setSavingEdit(false);

    if (res.error) {
      toast.error("Update failed", { description: res.error });
    } else {
      toast.success("Profile updated", {
        description: "User profile changes have been saved.",
      });
      setUser((prev) => ({
        ...prev,
        full_name: editFullName.trim(),
        headline: editHeadline.trim(),
        country: editCountry.trim(),
        expertise: editExpertise.trim(),
        bio: editBio.trim(),
        phone: editPhone.trim(),
        weekly_hours: editWeeklyHours !== "" ? Number(editWeeklyHours) : null,
      }));
      setActiveTab("overview");
      router.refresh();
    }
  };

  // Delete User Handler
  const handleDeleteUser = async () => {
    if (
      !confirm(
        `DANGER: Are you sure you want to permanently delete ${displayName}'s account? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingUser(true);
    const res = await adminDeleteUser(user.id);
    setDeletingUser(false);

    if (res.error) {
      toast.error("Could not delete user", { description: res.error });
    } else {
      toast.success("Account deleted", {
        description: "The user has been purged from the platform.",
      });
      router.push("/admin/users");
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button & Quick metadata */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <Link href="/admin/users">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5 -ml-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Users Directory</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
            ID: {user.id}
          </span>
          <span
            className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
              user.role === "admin"
                ? "bg-[#E5EFEC] text-[#0F766E] border border-[#0F766E]/20"
                : "bg-muted text-muted-foreground border border-border"
            }`}
          >
            <Shield className="h-3 w-3" />
            {user.role}
          </span>
        </div>
      </div>

      {/* Main Dossier Card Banner */}
      <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-heading font-black text-2xl sm:text-3xl shadow-2xs shrink-0">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div className="space-y-1">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {displayName}
              </h1>
              <p className="text-sm font-medium text-muted-foreground">
                {user.headline || user.expertise || "Domain Contributor"}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground pt-0.5">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </span>
                {user.country && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {user.country}
                  </span>
                )}
                <span>Joined {formatDate(user.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Completeness Badge */}
          <div className="bg-muted/30 p-4 rounded-xl border border-border/80 flex items-center gap-4 shrink-0 sm:self-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-heading font-black text-lg">
              {completeness.score}%
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span>Profile Completeness</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {completeness.completedCount} of {completeness.totalCount} criteria fulfilled
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-t border-border pt-4 overflow-x-auto scrollbar-none">
          {[
            { id: "overview", label: "Overview & Credentials", icon: User },
            {
              id: "applications",
              label: `Applications (${applications.length})`,
              icon: Briefcase,
            },
            { id: "actions", label: "Admin Actions", icon: Shield },
            { id: "edit", label: "Edit Profile", icon: Edit3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabKey)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW & CREDENTIALS */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Contact & Quick Info */}
          <div className="space-y-6">
            <div className="bg-card rounded-[14px] border border-border p-5 shadow-2xs space-y-4">
              <h3 className="font-heading text-sm font-bold text-foreground">
                Contact & Regional Details
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
                    Location
                  </span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {user.country || "Not specified"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
                    Timezone
                  </span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {user.timezone || "Not specified"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
                    Weekly Availability
                  </span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {user.weekly_hours ? `${user.weekly_hours} hours / week` : "Not specified"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
                    Phone Contact
                  </span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {user.phone || "Not specified"}
                  </span>
                </div>

                {user.linkedin_url && (
                  <div className="pt-2 border-t border-border/60">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground block">
                      LinkedIn Dossier
                    </span>
                    <a
                      href={user.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-semibold inline-flex items-center gap-1 mt-1 truncate max-w-full"
                    >
                      <span className="truncate">{user.linkedin_url}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Primary Category & Skills */}
            <div className="bg-card rounded-[14px] border border-border p-5 shadow-2xs space-y-4">
              <h3 className="font-heading text-sm font-bold text-foreground">
                Domain & Verified Skills
              </h3>

              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                    Primary Domain
                  </span>
                  <p className="font-semibold text-xs text-foreground mt-0.5">
                    {user.expertise || "General Contributor"}
                  </p>
                </div>

                {user.skills && user.skills.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <span className="text-[11px] font-semibold text-muted-foreground block">
                      Specialist Skills:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {user.skills.map((skill: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {user.languages && user.languages.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border/60">
                    <span className="text-[11px] font-semibold text-muted-foreground block">
                      Languages:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {user.languages.map((lang: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-full bg-muted border border-border text-foreground text-xs font-medium"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right 2 Columns: Bio, Academic Credentials & Experience */}
          <div className="md:col-span-2 space-y-6">
            {/* Bio */}
            <div className="bg-card rounded-[14px] border border-border p-5 shadow-2xs space-y-3">
              <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                Professional Summary & Bio
              </h3>
              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {user.bio || "No professional biography provided yet."}
              </div>
            </div>

            {/* Academic Credentials */}
            <div className="bg-card rounded-[14px] border border-border p-5 shadow-2xs space-y-4">
              <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-primary" />
                Academic Degrees ({education.length})
              </h3>

              {education.length > 0 ? (
                <div className="space-y-3">
                  {education.map((edu, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-border/80 bg-muted/20 text-xs space-y-1"
                    >
                      <p className="font-bold text-foreground">
                        {edu.degree} {edu.field && `in ${edu.field}`}
                      </p>
                      <p className="text-muted-foreground">
                        {edu.school} {edu.year && `• Class of ${edu.year}`}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No academic degrees recorded.
                </p>
              )}
            </div>

            {/* Experience */}
            <div className="bg-card rounded-[14px] border border-border p-5 shadow-2xs space-y-4">
              <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-primary" />
                Industry & Research Experience ({experience.length})
              </h3>

              {experience.length > 0 ? (
                <div className="space-y-3">
                  {experience.map((exp, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-border/80 bg-muted/20 text-xs space-y-1.5"
                    >
                      <p className="font-bold text-foreground">{exp.title}</p>
                      <p className="text-muted-foreground font-medium">
                        {exp.company}{" "}
                        {(exp.from || exp.to) &&
                          `• ${exp.from || ""} – ${exp.to || "Present"}`}
                      </p>
                      {exp.summary && (
                        <p className="text-muted-foreground/90 leading-relaxed text-[11px] pt-1">
                          {exp.summary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No past work roles recorded.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TASK APPLICATIONS */}
      {activeTab === "applications" && (
        <div className="space-y-4">
          <div className="bg-card rounded-[14px] border border-border p-5 shadow-2xs">
            <h3 className="font-heading text-base font-bold text-foreground">
              Submitted Task Applications ({applications.length})
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review, approve, or adjust waitlist queue status for all applications submitted by this contributor.
            </p>
          </div>

          {applications.length > 0 ? (
            <div className="space-y-4">
              {applications.map((app) => {
                const task = app.tasks;
                const isUpdating = updatingAppId === app.id;

                return (
                  <div
                    key={app.id}
                    className="p-5 sm:p-6 rounded-[14px] border border-border bg-card shadow-2xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {task?.category || "Task"}
                          </span>
                          <StatusBadge status={app.status} />
                          {app.status === "waitlisted" && app.position != null && (
                            <span className="text-[11px] font-bold text-[#78350F] flex items-center gap-1">
                              <Hourglass className="h-3 w-3 text-[#B45309]" />
                              Waitlist Queue #{app.position}
                            </span>
                          )}
                        </div>
                        <h4 className="font-heading font-bold text-base text-foreground mt-1.5">
                          {task?.title || "Evaluation Task"}
                        </h4>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-bold text-foreground block">
                          {formatPay(task?.pay_min, task?.pay_max, task?.pay_unit)}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Applied {formatDate(app.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Contributor Note */}
                    {app.note && (
                      <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs">
                        <span className="font-semibold text-muted-foreground text-[10px] uppercase block mb-1">
                          Applicant Note
                        </span>
                        <p className="italic text-foreground/90 leading-relaxed">
                          &ldquo;{app.note}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Admin Note Input */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor={`note_${app.id}`}
                        className="text-xs font-semibold text-muted-foreground"
                      >
                        Admin Evaluation Note / Feedback:
                      </Label>
                      <Input
                        id={`note_${app.id}`}
                        placeholder="e.g. Approved for Phase 1 annotators batch."
                        value={adminNotes[app.id] ?? ""}
                        onChange={(e) =>
                          setAdminNotes({ ...adminNotes, [app.id]: e.target.value })
                        }
                        className="text-xs h-9 bg-background"
                      />
                    </div>

                    {/* Decision Action Toolbar */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/50">
                      <Link
                        href={`/admin/tasks/${task?.id}/waitlist`}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <span>Open Task Waitlist Control</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>

                      <div className="flex items-center gap-2">
                        {app.status !== "approved" && (
                          <Button
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => handleAppStatusChange(app.id, "approved")}
                            className="h-8 text-xs font-semibold rounded-full bg-[#0F766E] text-white hover:bg-[#0D655E] gap-1 px-3.5"
                          >
                            {isUpdating ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            <span>Approve</span>
                          </Button>
                        )}

                        {app.status !== "waitlisted" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => handleAppStatusChange(app.id, "waitlisted")}
                            className="h-8 text-xs font-semibold rounded-full text-[#78350F] border-[#FDE68A] hover:bg-[#FEF3C7] gap-1 px-3.5"
                          >
                            <Hourglass className="h-3.5 w-3.5" />
                            <span>Waitlist</span>
                          </Button>
                        )}

                        {app.status !== "rejected" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => handleAppStatusChange(app.id, "rejected")}
                            className="h-8 text-xs font-semibold rounded-full text-destructive hover:bg-destructive/10 px-3.5"
                          >
                            <span>Reject</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center bg-card rounded-[14px] border border-dashed border-border text-xs text-muted-foreground">
              This user has not submitted applications to any tasks yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ADMIN ACTIONS */}
      {activeTab === "actions" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Role Promotion / Demotion */}
          <div className="bg-card rounded-[14px] border border-border p-5 shadow-2xs space-y-4">
            <div>
              <h4 className="font-heading text-sm font-bold text-foreground">
                Account Platform Role
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Current status: <strong className="capitalize text-foreground">{user.role}</strong>
              </p>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Administrators hold universal authorization to create and manage tasks, evaluate
              waitlists, adjust user accounts, and view platform metrics.
            </p>

            <div className="pt-2">
              {isCurrentAdmin ? (
                <p className="text-xs text-muted-foreground italic">
                  Security guard: You cannot alter your own administrator role.
                </p>
              ) : (
                <Button
                  size="sm"
                  variant={user.role === "user" ? "default" : "outline"}
                  disabled={roleLoading}
                  onClick={handleRoleToggle}
                  className="rounded-full text-xs font-bold gap-1.5 h-8 px-4"
                >
                  {roleLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Shield className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {user.role === "user" ? "Promote to Administrator" : "Demote to Contributor"}
                  </span>
                </Button>
              )}
            </div>
          </div>

          {/* Danger Zone: Account Deletion */}
          <div className="bg-card rounded-[14px] border border-destructive/20 bg-destructive/5 p-5 shadow-2xs space-y-4">
            <div>
              <h4 className="font-heading text-sm font-bold text-destructive flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4" />
                Danger Zone
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently delete this user account and cascade delete all their applications.
              </p>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This action cannot be undone. All database records, waitlist positions, and profile credentials will be permanently erased.
            </p>

            <div className="pt-2">
              {isCurrentAdmin ? (
                <p className="text-xs text-muted-foreground italic">
                  You cannot delete your own active administrator session.
                </p>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={deletingUser}
                  onClick={handleDeleteUser}
                  className="rounded-full text-xs font-bold gap-1.5 h-8 px-4"
                >
                  {deletingUser ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  <span>Permanently Delete User</span>
                </Button>
              )}
            </div>
          </div>

          {/* Direct Notification Composer */}
          <div className="md:col-span-2 bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-4">
            <div>
              <h4 className="font-heading text-sm font-bold text-foreground flex items-center gap-1.5">
                <Send className="h-4 w-4 text-primary" />
                Deliver In-App Notification
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send a notification that will appear in this user&apos;s alert feed and top navigation bell.
              </p>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="page_notif_title" className="text-xs font-semibold">
                    Notification Title *
                  </Label>
                  <Input
                    id="page_notif_title"
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="e.g. Action Required: Verification Credentials"
                    className="text-xs h-8 bg-background"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="page_notif_href" className="text-xs font-semibold">
                    Target Link (Optional)
                  </Label>
                  <Input
                    id="page_notif_href"
                    value={notifHref}
                    onChange={(e) => setNotifHref(e.target.value)}
                    placeholder="e.g. /profile?tab=background"
                    className="text-xs h-8 bg-background"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="page_notif_body" className="text-xs font-semibold">
                    Message Body (Optional)
                  </Label>
                  <Textarea
                    id="page_notif_body"
                    value={notifBody}
                    onChange={(e) => setNotifBody(e.target.value)}
                    placeholder="Please upload proof of credentials for review..."
                    className="text-xs bg-background"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={sendingNotif || !notifTitle.trim()}
                  className="rounded-full text-xs font-bold gap-1.5 h-8 px-5"
                >
                  {sendingNotif ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Deliver Notification</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: EDIT PROFILE */}
      {activeTab === "edit" && (
        <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-5">
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">
              Administrative Profile Override
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Directly edit or correct this user&apos;s credentials and profile data.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="edit_p_name" className="text-xs font-semibold">
                  Full Legal Name
                </Label>
                <Input
                  id="edit_p_name"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="text-xs h-8 bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit_p_phone" className="text-xs font-semibold">
                  Phone Number
                </Label>
                <Input
                  id="edit_p_phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="text-xs h-8 bg-background"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="edit_p_headline" className="text-xs font-semibold">
                  Headline
                </Label>
                <Input
                  id="edit_p_headline"
                  value={editHeadline}
                  onChange={(e) => setEditHeadline(e.target.value)}
                  className="text-xs h-8 bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit_p_country" className="text-xs font-semibold">
                  Country
                </Label>
                <Input
                  id="edit_p_country"
                  value={editCountry}
                  onChange={(e) => setEditCountry(e.target.value)}
                  className="text-xs h-8 bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit_p_expertise" className="text-xs font-semibold">
                  Primary Expertise
                </Label>
                <select
                  id="edit_p_expertise"
                  value={editExpertise}
                  onChange={(e) => setEditExpertise(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs text-foreground"
                >
                  <option value="">Select category...</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit_p_hours" className="text-xs font-semibold">
                  Weekly Availability (Hours)
                </Label>
                <Input
                  id="edit_p_hours"
                  type="number"
                  value={editWeeklyHours}
                  onChange={(e) =>
                    setEditWeeklyHours(e.target.value ? Number(e.target.value) : "")
                  }
                  className="text-xs h-8 bg-background"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="edit_p_bio" className="text-xs font-semibold">
                  Professional Bio
                </Label>
                <Textarea
                  id="edit_p_bio"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={4}
                  className="text-xs bg-background leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border/60">
              <Button
                type="submit"
                disabled={savingEdit}
                className="rounded-full text-xs font-bold gap-1.5 h-8 px-5 shadow-2xs"
              >
                {savingEdit ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                <span>Save Profile Changes</span>
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
