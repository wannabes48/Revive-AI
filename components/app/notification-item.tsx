"use client";

import Link from "next/link";
import { Notification } from "@/types";
import { formatDate } from "@/lib/utils";
import { markNotificationRead } from "@/actions/notifications";
import { Bell, ArrowRight } from "lucide-react";

interface NotificationItemProps {
  notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const isUnread = !notification.read_at;

  const handleClick = () => {
    if (isUnread) {
      markNotificationRead(notification.id);
    }
  };

  const content = (
    <div
      onClick={handleClick}
      className={`p-3 rounded-xl border text-xs transition-colors flex items-start gap-3 cursor-pointer ${
        isUnread
          ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
          : "bg-muted/20 border-border/60 hover:bg-muted/40 text-muted-foreground"
      }`}
    >
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          isUnread ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        <Bell className="h-3.5 w-3.5" />
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate text-xs ${isUnread ? "font-bold text-foreground" : "font-medium"}`}>
            {notification.title}
          </p>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {formatDate(notification.created_at)}
          </span>
        </div>

        {notification.body && (
          <p className="text-[11px] text-muted-foreground line-clamp-1 leading-relaxed">
            {notification.body}
          </p>
        )}
      </div>
    </div>
  );

  if (notification.href) {
    return <Link href={notification.href}>{content}</Link>;
  }

  return content;
}
