"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserRole, Profile } from "@/lib/supabase/types";
import { updateUserRole, approveUserAccount, rejectUserAccount } from "@/actions/users";
import { formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserDetailsDrawer } from "@/components/admin/user-details-drawer";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ResponsiveTable, type ColumnDef } from "@/components/ui/responsive-table";
import {
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Users,
  Briefcase,
  MapPin,
  ChevronRight,
  Eye,
  Clock,
  Check,
  X,
} from "lucide-react";

export interface UserProfileRow extends Profile {
  applications?: { count: number }[];
}

interface UsersTableProps {
  currentUserId: string;
  users: UserProfileRow[];
  initialUserId?: string;
}

export function UsersTable({ currentUserId, users, initialUserId }: UsersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");

  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Drawer selected user state
  const urlUserParam = searchParams.get("user") || initialUserId || null;
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(urlUserParam);

  React.useEffect(() => {
    const param = searchParams.get("user");
    if (param !== selectedUserId) {
      setSelectedUserId(param);
    }
  }, [searchParams]);

  const selectedUser = React.useMemo(() => {
    if (!selectedUserId) return null;
    return users.find((u) => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  const handleOpenUser = (u: UserProfileRow) => {
    setSelectedUserId(u.id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("user", u.id);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleCloseUser = () => {
    setSelectedUserId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("user");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Role Change Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = React.useState<{
    user: UserProfileRow;
    targetRole: UserRole;
  } | null>(null);

  const waitlistedCount = React.useMemo(() => {
    return users.filter((u) => u.approval_status === "waitlisted").length;
  }, [users]);

  const filteredUsers = React.useMemo(() => {
    return users.filter((u) => {
      let matchesRole = true;
      if (roleFilter === "waitlist") {
        matchesRole = u.approval_status === "waitlisted";
      } else if (roleFilter === "approved_user") {
        matchesRole = u.role === "user" && u.approval_status === "approved";
      } else if (roleFilter !== "all") {
        matchesRole = u.role === roleFilter;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.expertise?.toLowerCase().includes(q) ||
        u.country?.toLowerCase().includes(q);

      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, searchQuery]);

  async function handleApprove(userId: string, name: string) {
    setLoadingId(userId);
    const res = await approveUserAccount(userId);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Approved ${name} for platform access.`);
      router.refresh();
    }
    setLoadingId(null);
  }

  async function handleReject(userId: string, name: string) {
    if (!confirm(`Are you sure you want to reject admission for ${name}?`)) return;
    setLoadingId(userId);
    const res = await rejectUserAccount(userId);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Rejected admission for ${name}.`);
      router.refresh();
    }
    setLoadingId(null);
  }

  async function handleConfirmRoleChange() {
    if (!confirmDialog) return;

    const { user, targetRole } = confirmDialog;
    setLoadingId(user.id);
    setFeedback(null);

    const res = await updateUserRole(user.id, targetRole);

    if (res.error) {
      setFeedback({ type: "error", text: res.error });
      toast.error(res.error);
    } else {
      setFeedback({
        type: "success",
        text: `Successfully updated ${user.full_name || user.email} to ${targetRole}.`,
      });
      toast.success(`User role updated to ${targetRole}.`);
      router.refresh();
    }

    setConfirmDialog(null);
    setLoadingId(null);
  }

  return (
    <div className="space-y-4">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl text-xs font-medium border ${
            feedback.type === "success"
              ? "bg-[#CCFBF1]/50 border-[#99F6E4] text-[#0F766E]"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-muted-foreground hover:text-foreground text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-[14px] border border-border shadow-2xs">
        {/* Role Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Users" },
            {
              id: "waitlist",
              label: `Admissions Waitlist ${waitlistedCount > 0 ? `(${waitlistedCount})` : ""}`,
              highlight: waitlistedCount > 0,
            },
            { id: "approved_user", label: "Contributors" },
            { id: "admin", label: "Admins" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                roleFilter === tab.id
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : tab.highlight
                  ? "bg-amber-500/15 text-amber-700 font-bold hover:bg-amber-500/25 border border-amber-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search platform users"
            placeholder="Search by name, email, skill..."
            className="pl-9 h-8 text-xs rounded-full border-border bg-background"
          />
        </div>
      </div>

      {/* Users Table */}
      <ResponsiveTable
        data={filteredUsers}
        keyExtractor={(user) => user.id}
        onRowClick={(user) => handleOpenUser(user)}
        emptyMessage={
          <div className="p-8 text-center space-y-2">
            <Users className="h-8 w-8 text-muted-foreground mx-auto" />
            <h4 className="text-sm font-heading font-bold text-foreground">
              No users found
            </h4>
            <p className="text-xs text-muted-foreground">
              No registered profiles match the search query.
            </p>
          </div>
        }
        columns={[
          {
            header: "User Profile",
            priority: "primary",
            cell: (user) => {
              const isCurrent = user.id === currentUserId;
              const displayName = user.full_name || user.email.split("@")[0];
              return (
                <div className="flex items-center gap-2.5 max-w-xs">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
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
                  <div className="truncate">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground leading-tight">
                      <span className="hover:text-primary transition-colors">
                        {displayName}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </div>
                  </div>
                </div>
              );
            },
          },
          {
            header: "Expertise & Location",
            priority: "secondary",
            cell: (user) => (
              <div className="text-xs">
                {user.expertise ? (
                  <span className="font-medium text-foreground block truncate">
                    {user.expertise}
                  </span>
                ) : (
                  <span className="text-muted-foreground italic">Not specified</span>
                )}
                {user.country && (
                  <span className="text-muted-foreground text-[11px] flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {user.country}
                  </span>
                )}
              </div>
            ),
          },
          {
            header: "Platform Role",
            priority: "primary",
            cell: (user) =>
              user.role === "admin" ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E5EFEC] text-[#0F766E] border border-[#0F766E]/20">
                  <Shield className="h-3 w-3" />
                  Admin
                </span>
              ) : (
                <span className="inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                  Contributor
                </span>
              ),
          },
          {
            header: "Applications",
            priority: "secondary",
            cell: (user) => {
              const appCount = user.applications?.[0]?.count || 0;
              return (
                <span className="text-xs">
                  <span className="font-semibold text-foreground">{appCount}</span>{" "}
                  <span className="text-muted-foreground">submitted</span>
                </span>
              );
            },
          },
          {
            header: "Admission Status",
            priority: "secondary",
            cell: (user) => {
              const status = user.approval_status || "approved";
              if (status === "waitlisted") {
                return (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/30">
                    <Clock className="h-3 w-3" />
                    Waitlisted
                  </span>
                );
              }
              if (status === "rejected") {
                return (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/30">
                    <UserX className="h-3 w-3" />
                    Rejected
                  </span>
                );
              }
              return (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E5EFEC] text-[#0F766E] border border-[#0F766E]/20">
                  <CheckCircle2 className="h-3 w-3" />
                  Approved
                </span>
              );
            },
          },
          {
            header: "Joined Date",
            priority: "secondary",
            cell: (user) => (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(user.created_at)}
              </span>
            ),
          },
          {
            header: "Quick Actions",
            priority: "primary",
            align: "right",
            cell: (user) => {
              const isCurrent = user.id === currentUserId;
              const isLoading = loadingId === user.id;
              const displayName = user.full_name || user.email.split("@")[0];
              const isWaitlisted = user.approval_status === "waitlisted";

              return (
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenUser(user);
                    }}
                    className="rounded-full text-xs font-semibold h-8 touch-target px-2.5 text-primary hover:bg-primary/10 gap-1 cursor-pointer"
                  >
                    <Eye className="h-3 w-3" />
                    <span>Details</span>
                  </Button>

                  {isCurrent ? (
                    <span className="text-xs text-muted-foreground italic px-2">Self</span>
                  ) : isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />
                  ) : isWaitlisted ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(user.id, displayName);
                        }}
                        className="rounded-full text-xs font-semibold h-8 touch-target px-2.5 text-[#0F766E] border-[#0F766E]/30 hover:bg-[#CCFBF1]/50 gap-1 cursor-pointer"
                        title="Approve contributor admission"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Approve</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(user.id, displayName);
                        }}
                        className="rounded-full text-xs font-semibold h-8 touch-target px-2 text-destructive hover:bg-destructive/10 gap-1 cursor-pointer"
                        title="Reject admission"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : user.role === "user" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDialog({ user, targetRole: "admin" });
                      }}
                      className="rounded-full text-xs font-semibold h-8 touch-target px-2.5 text-[#0F766E] border-[#0F766E]/30 hover:bg-[#CCFBF1]/50 gap-1"
                    >
                      <Shield className="h-3 w-3" />
                      <span>Promote</span>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDialog({ user, targetRole: "user" });
                      }}
                      className="rounded-full text-xs font-semibold h-8 touch-target px-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
                    >
                      <UserX className="h-3 w-3" />
                      <span>Demote</span>
                    </Button>
                  )}
                </div>
              );
            },
          },
        ]}
      />

      {/* User Details Slide-over Drawer */}
      <UserDetailsDrawer
        user={selectedUser}
        currentUserId={currentUserId}
        onClose={handleCloseUser}
        onUserUpdated={() => router.refresh()}
      />

      {/* Role Change Confirmation Dialog */}
      <ResponsiveDialog
        open={Boolean(confirmDialog)}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
        title={confirmDialog?.targetRole === "admin" ? "Grant Administrator Privileges?" : "Demote to Contributor?"}
        description={
          confirmDialog?.targetRole === "admin" ? (
            <>
              You are about to promote{" "}
              <strong>{confirmDialog?.user.full_name || confirmDialog?.user.email}</strong> to an{" "}
              <strong>Administrator</strong>. They will gain full permissions to create tasks, modify applications, approve and reject contributors, and adjust other roles.
            </>
          ) : (
            <>
              You are demoting{" "}
              <strong>{confirmDialog?.user.full_name || confirmDialog?.user.email}</strong> back to a regular{" "}
              <strong>Contributor</strong> role. They will lose access to all administrative command views.
            </>
          )
        }
        footer={
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDialog(null)}
              className="rounded-full text-xs h-10 touch-target"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmRoleChange}
              className={`rounded-full text-xs font-semibold gap-1.5 h-10 touch-target ${
                confirmDialog?.targetRole === "admin"
                  ? "bg-primary text-primary-foreground"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>
                Confirm {confirmDialog?.targetRole === "admin" ? "Promotion" : "Demotion"}
              </span>
            </Button>
          </div>
        }
      >
        <div className="py-2 text-xs text-muted-foreground">
          {confirmDialog?.targetRole === "admin"
            ? "Please ensure this user is an authorized platform operator before confirming."
            : "The user will remain active as a tasking contributor with existing earnings and balance intact."}
        </div>
      </ResponsiveDialog>
    </div>
  );
}
