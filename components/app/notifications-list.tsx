"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Notification } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Bell, ArrowRight, Check, CheckCheck, Loader2 } from "lucide-react";

interface NotificationsListProps {
  initialNotifications: Notification[];
}

export function NotificationsList({ initialNotifications }: NotificationsListProps) {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<Notification[]>(initialNotifications);
  const [markingAll, setMarkingAll] = React.useState(false);
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 20;

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const totalPages = Math.ceil(notifications.length / pageSize) || 1;
  const pagedNotifications = notifications.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  async function handleMarkRead(id: string) {
    setLoadingId(id);
    const res = await markNotificationAsRead(id);
    setLoadingId(null);

    if (res.error) {
      toast.error("Error", { description: res.error });
    } else {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      router.refresh();
    }
  }

  async function handleMarkAll() {
    setMarkingAll(true);
    const res = await markAllNotificationsAsRead();
    setMarkingAll(false);

    if (res.error) {
      toast.error("Error", { description: res.error });
    } else {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      toast.success("Marked as read", { description: "All notifications have been marked as read." });
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Notification History
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Real-time milestone updates, waitlist admissions, and reviewer notifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-accent/20 text-[#78350F] border border-accent/30">
              {unreadCount} unread
            </span>
          )}

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAll}
              disabled={markingAll}
              className="rounded-full text-xs font-medium gap-1.5 h-8 border-border text-foreground hover:bg-muted"
            >
              {markingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5 text-primary" />
              )}
              <span>Mark all as read</span>
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-card rounded-[14px] border border-border shadow-2xs overflow-hidden">
        {pagedNotifications.length > 0 ? (
          <div className="divide-y divide-border/60">
            {pagedNotifications.map((item) => {
              const isUnread = !item.read_at;

              return (
                <div
                  key={item.id}
                  className={`p-4 sm:p-5 flex items-start gap-3.5 transition-colors ${
                    isUnread ? "bg-primary/5 font-semibold" : "hover:bg-muted/20"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isUnread
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Bell className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-heading text-sm text-foreground ${isUnread ? "font-bold" : "font-semibold"}`}>
                          {item.title}
                        </h4>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap font-mono">
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    {item.body && (
                      <p className="text-xs text-muted-foreground leading-relaxed font-normal">
                        {item.body}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 gap-2">
                      {item.href ? (
                        <Link
                          href={item.href}
                          onClick={() => {
                            if (isUnread) handleMarkRead(item.id);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          <span>View details</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      ) : <div />}

                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(item.id)}
                          disabled={loadingId === item.id}
                          className="text-[11px] font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          {loadingId === item.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          <span>Mark read</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
              <Bell className="h-6 w-6" />
            </div>
            <h3 className="font-heading text-base font-bold text-foreground">
              No notifications yet
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              You will receive automated updates here whenever admins evaluate your application, reorder waitlists, or assign tasks.
            </p>
          </div>
        )}

        {/* Pagination Controls (20 per page) */}
        {totalPages > 1 && (
          <div className="p-3.5 border-t border-border/70 flex items-center justify-between bg-muted/10 text-xs">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="text-xs h-8 rounded-full"
            >
              Previous
            </Button>
            <span className="text-muted-foreground font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="text-xs h-8 rounded-full"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
