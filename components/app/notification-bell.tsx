"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Notification } from "@/types";
import { formatDate } from "@/lib/utils";
import { markNotificationRead, markAllNotificationsRead } from "@/actions/notifications";
import { Bell, CheckCheck, ExternalLink, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationBellProps {
  initialNotifications?: Notification[];
  unreadCount?: number;
}

export function NotificationBell({
  initialNotifications = [],
  unreadCount = 0,
}: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>(initialNotifications);
  const [markingAll, setMarkingAll] = React.useState(false);
  const bellRef = React.useRef<HTMLDivElement>(null);

  const count = notifications.filter((n) => !n.read_at).length;

  // Close when clicked outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Periodic refresh every 60s as specified in 24
  React.useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
    }, 60000);
    return () => clearInterval(timer);
  }, [router]);

  const handleMarkAll = async () => {
    setMarkingAll(true);
    await markAllNotificationsRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
    setMarkingAll(false);
    router.refresh();
  };

  const handleItemClick = (n: Notification) => {
    if (!n.read_at) {
      markNotificationRead(n.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item))
      );
    }
    setOpen(false);
  };

  const displayList = notifications.slice(0, 8);

  return (
    <div ref={bellRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Open notifications"
        className="touch-target rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors relative cursor-pointer"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-accent text-[#78350F] text-[10px] font-bold flex items-center justify-center border border-background shadow-xs">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-xs sm:max-w-sm sm:w-96 rounded-2xl bg-card border border-border shadow-xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95">
          {/* Header */}
          <div className="p-3.5 border-b border-border/70 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <span className="font-heading text-xs font-bold text-foreground">
                Notifications
              </span>
              {count > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-accent/20 text-[#78350F]">
                  {count} new
                </span>
              )}
            </div>

            {count > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={markingAll}
                className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                {markingAll ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCheck className="h-3 w-3" />
                )}
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
            {displayList.length > 0 ? (
              displayList.map((n) => {
                const isUnread = !n.read_at;

                return (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`p-3 text-xs transition-colors cursor-pointer ${
                      isUnread ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"
                    }`}
                  >
                    <Link href={n.href || "/notifications"} className="block space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`truncate ${
                            isUnread ? "font-bold text-foreground" : "font-medium text-muted-foreground"
                          }`}
                        >
                          {n.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDate(n.created_at)}
                        </span>
                      </div>
                      {n.body && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {n.body}
                        </p>
                      )}
                    </Link>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No notifications right now.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-border/70 bg-muted/10 text-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>View all notifications</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
