"use client";

import * as React from "react";
import { Profile } from "@/types";
import { changePassword, requestAccountDeletion } from "@/actions/profile";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Key, Shield, AlertTriangle, Loader2, Check } from "lucide-react";

interface AccountTabProps {
  profile: Profile;
}

export function AccountTab({ profile }: AccountTabProps) {
  // Password states
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordLoading, setPasswordLoading] = React.useState(false);

  // Deletion request state
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [deleteRequested, setDeleteRequested] = React.useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    const res = await changePassword({ password, confirmPassword });
    setPasswordLoading(false);

    if (res.error) {
      if (typeof res.error === "string" && res.error.toLowerCase().includes("reauthentication")) {
        toast.error("Session expired", {
          description: "Please log out and log back in to verify your identity before changing password.",
        });
      } else {
        toast.error("Failed to change password", {
          description: typeof res.error === "string" ? res.error : "Validation failed.",
        });
      }
    } else {
      setPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully", {
        description: "Your security credentials have been updated.",
      });
    }
  };

  const handleDeleteRequest = async () => {
    if (
      !confirm(
        "Are you sure you want to request account deletion? Platform administrators will be notified to review and process your data purging request."
      )
    ) {
      return;
    }

    setDeleteLoading(true);
    const res = await requestAccountDeletion();
    setDeleteLoading(false);

    if (res.error) {
      toast.error("Request failed", {
        description: typeof res.error === "string" ? res.error : "Could not submit request.",
      });
    } else {
      setDeleteRequested(true);
      toast.success("Deletion requested", {
        description: "Your account deletion request has been submitted to administrators.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Identity */}
      <div className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-6">
        <div>
          <h3 className="font-heading text-base font-bold text-foreground">
            Account Identity & Role
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your registered authentication identifier and contributor access tier.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="input_email" className="text-xs font-semibold">
              Primary Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="input_email"
                value={profile.email}
                disabled
                className="pl-9 text-xs bg-muted/50 cursor-not-allowed opacity-80"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Changing email is currently managed via support administrators.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Platform Access Role</Label>
            <div className="h-9 px-3 rounded-md border border-border bg-muted/40 flex items-center justify-between text-xs">
              <span className="font-semibold capitalize text-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" />
                {profile.role}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Verified
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Access permissions determined by lead domain administrators.
            </p>
          </div>
        </div>
      </div>

      {/* Change Password Form */}
      <form onSubmit={handlePasswordSubmit} className="bg-card rounded-[14px] border border-border p-6 shadow-2xs space-y-6">
        <div>
          <h3 className="font-heading text-base font-bold text-foreground">
            Security & Password
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Update your authentication password (requires minimum 8 characters).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="input_password" className="text-xs font-semibold">
              New Password
            </Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="input_password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9 text-xs"
                minLength={8}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="input_confirm_password" className="text-xs font-semibold">
              Confirm New Password
            </Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="input_confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9 text-xs"
                minLength={8}
                required
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={passwordLoading || !password}
            className="rounded-full text-xs font-bold gap-1.5 h-11 min-h-[44px] touch-target px-6 shadow-2xs w-full sm:w-auto"
          >
            {passwordLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Key className="h-3.5 w-3.5" />
            )}
            <span>Update Password</span>
          </Button>
        </div>
      </form>

      {/* Danger Zone: Account Deletion */}
      <div className="bg-card rounded-[14px] border border-destructive/20 p-6 shadow-2xs space-y-4">
        <div>
          <h3 className="font-heading text-base font-bold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Request permanent purging of your contributor profile and submitted task evaluation records.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-foreground">
              Request Account Deletion
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Creates a compliance notification for administrators. Evaluation dossiers and personal credentials will be reviewed for active escrow tasks prior to permanent deletion.
            </p>
          </div>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDeleteRequest}
            disabled={deleteLoading || deleteRequested}
            className="rounded-full text-xs font-bold h-11 min-h-[44px] touch-target px-5 shrink-0 w-full sm:w-auto"
          >
            {deleteLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : deleteRequested ? (
              <span className="inline-flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                <span>Requested</span>
              </span>
            ) : (
              "Request Deletion"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
