"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { REFERRAL_SHARE_MESSAGE } from "@/lib/referrals";
import { Briefcase, Check, Copy, Mail, MessageCircle, Share2 } from "lucide-react";

export function ReferralShareCard({ link, code }: { link: string; code: string }) {
  const [copied, setCopied] = React.useState(false);
  const [canNativeShare, setCanNativeShare] = React.useState(false);

  React.useEffect(() => {
    // navigator is only available after mount; feature-detect once.
    const supported = typeof navigator !== "undefined" && typeof navigator.share === "function";
    if (supported) queueMicrotask(() => setCanNativeShare(true));
  }, []);

  const message = `${REFERRAL_SHARE_MESSAGE} ${link}`;
  const shareTargets = [
    {
      label: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodeURIComponent(message)}`,
    },
    {
      label: "Email",
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent("Join me on Revive AI")}&body=${encodeURIComponent(message)}`,
    },
    {
      label: "LinkedIn",
      icon: Briefcase,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
    },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Referral link copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the link and copy it manually.");
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: "Revive AI", text: REFERRAL_SHARE_MESSAGE, url: link });
    } catch {
      // User cancelled the share sheet — nothing to do.
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-1.5 bg-background rounded-xl border border-border">
        <span className="text-xs font-mono text-muted-foreground px-2 truncate flex-1 select-all">
          {link}
        </span>
        <Button
          size="sm"
          onClick={copy}
          className="rounded-lg text-xs font-bold h-9 px-4 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white shrink-0 gap-1.5"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground px-1">
        Your code: <strong className="font-mono text-foreground">{code}</strong>
      </p>
      <div className="flex flex-wrap gap-2">
        {shareTargets.map(({ label, icon: Icon, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <Icon className="h-3.5 w-3.5 text-[#0F766E]" />
            {label}
          </a>
        ))}
        {canNativeShare && (
          <button
            type="button"
            onClick={nativeShare}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <Share2 className="h-3.5 w-3.5 text-[#0F766E]" />
            More
          </button>
        )}
      </div>
    </div>
  );
}
