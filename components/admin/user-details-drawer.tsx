"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserRole, ApplicationStatus, Task } from "@/lib/supabase/types";
import { UserProfileRow } from "@/components/admin/users-table";
import {
  getUserApplications,
  updateUserRole,
  adminUpdateUserProfile,
  adminSendNotification,
  adminDeleteUser,
  approveUserAccount,
  rejectUserAccount,
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
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Briefcase,
  GraduationCap,
  Clock,
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
  MessageSquare,
  Hourglass,
  FileText,
  Sparkles,
  Zap,
  Check,
} from "lucide-react";

interface UserDetailsDrawerProps {
  user: UserProfileRow | null;
  currentUserId: string;
  onClose: () => void;
  onUserUpdated?: () => void;
}

type DrawerTab = "overview" | "applications" | "actions" | "edit";

export function UserDetailsDrawer({
  user,
  currentUserId,
  onClose,
  onUserUpdated,
}: UserDetailsDrawerProps) {
  const router = useRouter();

  // Active tab inside drawer
  const [activeTab, setActiveTab] = React.useState<DrawerTab>("overview");

  // User applications state
  const [applications, setApplications] = React.useState<any[]>([]);
  const [loadingApps, setLoadingApps] = React.useState(false);

  // App status update in progress
  const [updatingAppId, setUpdatingAppId] = React.useState<string | null>(null);
  const [adminNotes, setAdminNotes] = React.useState<Record<string, string>>({});

  // Role action loading
  const [roleLoading, setRoleLoading] = React.useState(false);

  // Send notification form state
  const [notifTitle, setNotifTitle] = React.useState("");
  const [notifBody, setNotifBody] = React.useState("");
  const [notifHref, setNotifHref] = React.useState("");
  const [sendingNotif, setSendingNotif] = React.useState(false);

  // Edit user profile state
  const [editFullName, setEditFullName] = React.useState("");
  const [editHeadline, setEditHeadline] = React.useState("");
  const [editCountry, setEditCountry] = React.useState("");
  const [editExpertise, setEditExpertise] = React.useState("");
  const [editBio, setEditBio] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [editWeeklyHours, setEditWeeklyHours] = React.useState<number | "">("");
  const [savingEdit, setSavingEdit] = React.useState(false);

  // Delete user loading
  const [deletingUser, setDeletingUser] = React.useState(false);
  const [approvalLoading, setApprovalLoading] = React.useState(false);

  const handleApproveAdmission = async () => {
    if (!user) return;
    setApprovalLoading(true);
    const res = await approveUserAccount(user.id);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`${displayName}'s account has been approved.`);
      onUserUpdated?.();
      router.refresh();
      onClose();
    }
    setApprovalLoading(false);
  };

  const handleRejectAdmission = async () => {
    if (!user) return;
    if (!confirm(`Are you sure you want to reject admission for ${displayName}?`)) return;
    setApprovalLoading(true);
    const res = await rejectUserAccount(user.id);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Admissions status updated to rejected for ${displayName}.`);
      onUserUpdated?.();
      router.refresh();
      onClose();
    }
    setApprovalLoading(false);
  };

  // Prevent body scroll when drawer is open
  React.useEffect(() => {
    if (user) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [user, onClose]);

  // Reset and populate form fields when user changes
  React.useEffect(() => {
    if (user) {
      setEditFullName(user.full_name || "");
      setEditHeadline(user.headline || "");
      setEditCountry(user.country || "");
      setEditExpertise(user.expertise || "");
      setEditBio(user.bio || "");
      setEditPhone(user.phone || "");
      setEditWeeklyHours(user.weekly_hours ?? "");
      setActiveTab("overview");

      // Load user's applications
      setLoadingApps(true);
      getUserApplications(user.id)
        .then((data) => {
          setApplications(data);
          const initialNotes: Record<string, string> = {};
          data.forEach((app: any) => {
            if (app.admin_note) {
              initialNotes[app.id] = app.admin_note;
            }
          });
          setAdminNotes(initialNotes);
          setLoadingApps(false);
        })
        .catch((err) => {
          console.error("Failed to load user applications:", err);
          setLoadingApps(false);
        });
    }
  }, [user]);

  if (!user) return null;

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
      user.role = targetRole;
      if (onUserUpdated) onUserUpdated();
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
      if (onUserUpdated) onUserUpdated();
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
      user.full_name = editFullName.trim();
      user.headline = editHeadline.trim();
      user.country = editCountry.trim();
      user.expertise = editExpertise.trim();
      user.bio = editBio.trim();
      user.phone = editPhone.trim();
      user.weekly_hours = editWeeklyHours !== "" ? Number(editWeeklyHours) : null;
      setActiveTab("overview");
      if (onUserUpdated) onUserUpdated();
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
      onClose();
      if (onUserUpdated) onUserUpdated();
      router.refresh();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in-0 duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Sheet Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen sm:max-w-2xl h-[100dvh] bg-card sm:border-l border-border shadow-2xl flex flex-col justify-between overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-border bg-muted/10 space-y-3 shrink-0 pt-safe">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  User ID: {user.id.slice(0, 8)}...
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    user.role === "admin"
                      ? "bg-[#E5EFEC] text-[#0F766E] border border-[#0F766E]/20"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  <Shield className="h-3 w-3" />
                  {user.role}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Link
                  href={`/admin/users/${user.id}`}
                  className="text-xs text-muted-foreground hover:text-foreground w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center hover:bg-muted touch-target"
                  title="Open full page view"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer touch-target"
                  aria-label="Close drawer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Profile Avatar & Name */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-heading font-black text-xl shadow-2xs shrink-0">
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

                <div className="min-w-0">
                  <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground truncate">
                    {displayName}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {user.headline || user.expertise || "Domain Contributor"}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground mt-1">
                    <span>{user.email}</span>
                    {user.country && <span>• {user.country}</span>}
                    <span>• Joined {formatDate(user.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Profile Completeness Pill */}
              <div className="hidden sm:block text-right bg-muted/40 p-2.5 rounded-xl border border-border/60 shrink-0">
                <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-foreground">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span>{completeness.score}%</span>
                </div>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Completeness Score
                </span>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="flex items-center gap-1 border-t border-border/70 pt-3 overflow-x-auto scrollbar-none">
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
                    onClick={() => setActiveTab(tab.id as DrawerTab)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
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

          {/* Drawer Body */}
          <div className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto pb-safe">
            {/* TAB 1: OVERVIEW & CREDENTIALS */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Admissions Waitlist Alert Banner */}
                {user.approval_status === "waitlisted" && (
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-3">
                    <div className="flex items-center gap-2 text-amber-800">
                      <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold font-heading">
                          Admissions Waitlist — Pending Review
                        </h4>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          This contributor is currently restricted from logging in to the dashboard until an admin grants admission.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        disabled={approvalLoading}
                        onClick={handleApproveAdmission}
                        className="rounded-full text-xs font-semibold h-8 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white gap-1.5 cursor-pointer"
                      >
                        {approvalLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        <span>Approve Contributor</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={approvalLoading}
                        onClick={handleRejectAdmission}
                        className="rounded-full text-xs font-semibold h-8 px-3 text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Contact & Geography Bento */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl border border-border bg-muted/20 text-xs">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                      Country
                    </span>
                    <span className="font-bold text-foreground mt-0.5 block truncate">
                      {user.country || "Not set"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-border bg-muted/20 text-xs">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                      Timezone
                    </span>
                    <span className="font-bold text-foreground mt-0.5 block truncate">
                      {user.timezone || "Not set"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-border bg-muted/20 text-xs">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                      Availability
                    </span>
                    <span className="font-bold text-foreground mt-0.5 block">
                      {user.weekly_hours ? `${user.weekly_hours} hrs/wk` : "Not set"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-border bg-muted/20 text-xs">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                      Phone
                    </span>
                    <span className="font-bold text-foreground mt-0.5 block truncate">
                      {user.phone || "Not set"}
                    </span>
                  </div>
                </div>

                {/* Primary Category & Domain Skills */}
                <div className="space-y-3 p-4 rounded-xl border border-border bg-card">
                  <div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                      Primary Category
                    </span>
                    <p className="font-heading font-bold text-sm text-foreground mt-0.5">
                      {user.expertise || "General Contributor"}
                    </p>
                  </div>

                  {user.skills && user.skills.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-border/60">
                      <span className="text-[11px] font-semibold text-muted-foreground block">
                        Verified Skills:
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
                        Working Languages:
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

                {/* Biography */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    Professional Biography
                  </h4>
                  <div className="p-4 rounded-xl border border-border bg-muted/20 text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {user.bio || "No professional biography provided yet."}
                  </div>
                </div>

                {/* LinkedIn Profile */}
                {user.linkedin_url && (
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card text-xs">
                    <span className="font-semibold text-foreground">
                      LinkedIn Dossier
                    </span>
                    <a
                      href={user.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      <span>{user.linkedin_url}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}

                {/* Academic Credentials */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    Academic Degrees ({education.length})
                  </h4>
                  {education.length > 0 ? (
                    <div className="space-y-2">
                      {education.map((edu, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-border/80 bg-muted/20 text-xs"
                        >
                          <p className="font-bold text-foreground">
                            {edu.degree} {edu.field && `in ${edu.field}`}
                          </p>
                          <p className="text-muted-foreground mt-0.5">
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

                {/* Experience History */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Industry & Research Experience ({experience.length})
                  </h4>
                  {experience.length > 0 ? (
                    <div className="space-y-2">
                      {experience.map((exp, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-border/80 bg-muted/20 text-xs space-y-1"
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
            )}

            {/* TAB 2: TASK APPLICATIONS */}
            {activeTab === "applications" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-heading text-sm font-bold text-foreground">
                      Submitted Applications ({applications.length})
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Directly evaluate, approve, or reject this contributor&apos;s submissions.
                    </p>
                  </div>
                </div>

                {loadingApps ? (
                  <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Loading submissions...</span>
                  </div>
                ) : applications.length > 0 ? (
                  <div className="space-y-4">
                    {applications.map((app) => {
                      const task = app.tasks;
                      const isUpdating = updatingAppId === app.id;

                      return (
                        <div
                          key={app.id}
                          className="p-4 sm:p-5 rounded-xl border border-border bg-card shadow-2xs space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                  {task?.category || "Task"}
                                </span>
                                <StatusBadge status={app.status} />
                                {app.status === "waitlisted" && app.position != null && (
                                  <span className="text-[11px] font-bold text-[#78350F] flex items-center gap-1">
                                    <Hourglass className="h-3 w-3 text-[#B45309]" />
                                    Queue #{app.position}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-heading font-bold text-sm text-foreground mt-1">
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

                          {/* Submitted Brief Note */}
                          {app.note && (
                            <div className="p-3 rounded-lg bg-muted/30 border border-border/60 text-xs">
                              <span className="font-semibold text-muted-foreground text-[10px] uppercase block mb-0.5">
                                Contributor Brief Note
                              </span>
                              <p className="italic text-foreground/90 leading-relaxed">
                                &ldquo;{app.note}&rdquo;
                              </p>
                            </div>
                          )}

                          {/* Admin Note Input */}
                          <div className="space-y-1.5 pt-1">
                            <Label htmlFor={`note_${app.id}`} className="text-[11px] font-semibold text-muted-foreground">
                              Admin Review Note / Feedback:
                            </Label>
                            <Input
                              id={`note_${app.id}`}
                              placeholder="e.g. Excellent oncology background, admitted for Phase 1 batch."
                              value={adminNotes[app.id] ?? ""}
                              onChange={(e) =>
                                setAdminNotes({ ...adminNotes, [app.id]: e.target.value })
                              }
                              className="text-xs h-8 bg-background"
                            />
                          </div>

                          {/* Quick Decision Actions */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                            <Link
                              href={`/admin/tasks/${task?.id}/waitlist`}
                              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                            >
                              <span>Task Waitlist Table</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>

                            <div className="flex items-center gap-1.5">
                              {app.status !== "approved" && (
                                <Button
                                  size="sm"
                                  disabled={isUpdating}
                                  onClick={() => handleAppStatusChange(app.id, "approved")}
                                  className="h-7 text-xs font-semibold rounded-full bg-[#0F766E] text-white hover:bg-[#0D655E] gap-1"
                                >
                                  {isUpdating ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3 w-3" />
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
                                  className="h-7 text-xs font-semibold rounded-full text-[#78350F] border-[#FDE68A] hover:bg-[#FEF3C7] gap-1"
                                >
                                  <Hourglass className="h-3 w-3" />
                                  <span>Waitlist</span>
                                </Button>
                              )}

                              {app.status !== "rejected" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isUpdating}
                                  onClick={() => handleAppStatusChange(app.id, "rejected")}
                                  className="h-7 text-xs font-semibold rounded-full text-destructive hover:bg-destructive/10"
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
                  <div className="p-8 text-center bg-muted/20 rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                    This user has not submitted applications to any tasks yet.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ADMIN ACTIONS */}
            {activeTab === "actions" && (
              <div className="space-y-6">
                {/* Role Promotion / Demotion */}
                <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        Platform Access Role
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Current role: <strong className="capitalize">{user.role}</strong>
                      </p>
                    </div>

                    {isCurrentAdmin ? (
                      <span className="text-xs text-muted-foreground italic">
                        Your account
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant={user.role === "user" ? "default" : "outline"}
                        disabled={roleLoading}
                        onClick={handleRoleToggle}
                        className="rounded-full text-xs font-bold gap-1.5 h-8"
                      >
                        {roleLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Shield className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {user.role === "user" ? "Promote to Admin" : "Demote to Contributor"}
                        </span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Send Notification Form */}
                <form
                  onSubmit={handleSendNotification}
                  className="p-4 rounded-xl border border-border bg-card space-y-3"
                >
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Send className="h-3.5 w-3.5 text-primary" />
                      Send In-App Notification
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Deliver a real-time notification alert to this contributor&apos;s notification bell.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="notif_title" className="text-[11px] font-semibold">
                        Notification Title *
                      </Label>
                      <Input
                        id="notif_title"
                        value={notifTitle}
                        onChange={(e) => setNotifTitle(e.target.value)}
                        placeholder="e.g. Action Required: Verification Credentials"
                        className="text-xs h-8 bg-background"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="notif_body" className="text-[11px] font-semibold">
                        Message Body
                      </Label>
                      <Textarea
                        id="notif_body"
                        value={notifBody}
                        onChange={(e) => setNotifBody(e.target.value)}
                        placeholder="Please update your clinical licenses on your profile page..."
                        className="text-xs bg-background"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="notif_href" className="text-[11px] font-semibold">
                        Target Link (Optional)
                      </Label>
                      <Input
                        id="notif_href"
                        value={notifHref}
                        onChange={(e) => setNotifHref(e.target.value)}
                        placeholder="e.g. /profile?tab=background"
                        className="text-xs h-8 bg-background"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      type="submit"
                      disabled={sendingNotif || !notifTitle.trim()}
                      className="rounded-full text-xs font-bold gap-1.5 h-8 px-4"
                    >
                      {sendingNotif ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      <span>Deliver Notification</span>
                    </Button>
                  </div>
                </form>

                {/* Danger Zone: Account Deletion */}
                <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-destructive flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Danger Zone
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Permanently purge this user account and its application records from the platform.
                    </p>
                  </div>

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
                      className="rounded-full text-xs font-bold gap-1.5 h-8"
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
            )}

            {/* TAB 4: EDIT PROFILE */}
            {activeTab === "edit" && (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <h3 className="font-heading text-sm font-bold text-foreground">
                    Edit Contributor Details
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Administrative override for user profile fields.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="edit_name" className="text-xs font-semibold">
                      Full Legal Name
                    </Label>
                    <Input
                      id="edit_name"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="text-xs h-8 bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit_phone" className="text-xs font-semibold">
                      Phone Number
                    </Label>
                    <Input
                      id="edit_phone"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="text-xs h-8 bg-background"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <Label htmlFor="edit_headline" className="text-xs font-semibold">
                      Headline
                    </Label>
                    <Input
                      id="edit_headline"
                      value={editHeadline}
                      onChange={(e) => setEditHeadline(e.target.value)}
                      className="text-xs h-8 bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit_country" className="text-xs font-semibold">
                      Country
                    </Label>
                    <Input
                      id="edit_country"
                      value={editCountry}
                      onChange={(e) => setEditCountry(e.target.value)}
                      className="text-xs h-8 bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit_expertise" className="text-xs font-semibold">
                      Primary Expertise
                    </Label>
                    <select
                      id="edit_expertise"
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
                    <Label htmlFor="edit_hours" className="text-xs font-semibold">
                      Weekly Hours
                    </Label>
                    <Input
                      id="edit_hours"
                      type="number"
                      value={editWeeklyHours}
                      onChange={(e) =>
                        setEditWeeklyHours(e.target.value ? Number(e.target.value) : "")
                      }
                      className="text-xs h-8 bg-background"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <Label htmlFor="edit_bio" className="text-xs font-semibold">
                      Professional Bio
                    </Label>
                    <Textarea
                      id="edit_bio"
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      rows={4}
                      className="text-xs bg-background leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
