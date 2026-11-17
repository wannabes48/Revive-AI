import Link from "next/link";
import { GlobeLock, Mail, ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Service Unavailable in Your Region — Revive AI",
  description: "Revive AI is currently not available in your geographic region.",
};

export default function RegionRestrictedPage() {
  return (
    <main className="min-h-screen bg-[#F7FAF9] text-[#0B2B2B] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#D3E2DE] rounded-2xl p-8 shadow-xs text-center space-y-6">
        {/* Brand Header */}
        <div className="text-xl font-extrabold tracking-tight text-[#0B2B2B]">
          Revive<span className="text-[#0F766E]">AI</span>
        </div>

        {/* Icon Badge */}
        <div className="mx-auto w-14 h-14 rounded-full bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#78350F]">
          <GlobeLock className="h-7 w-7" />
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>403 &bull; Region Restricted</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B2B2B] pt-1">
            Unavailable in Your Region
          </h1>
          <p className="text-sm text-[#5B7773] leading-relaxed">
            Due to regional compliance and project client restrictions, Revive AI contributor access is currently unavailable from your location.
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-[#F7FAF9] border-l-4 border-[#0F766E] rounded-r-lg p-4 text-left text-xs text-[#0B2B2B] space-y-1">
          <p className="font-semibold text-[#0F766E]">Think this is an error?</p>
          <p className="text-[#5B7773] leading-relaxed">
            If you are traveling or believe your IP address has been misclassified, please contact our support team for assistance.
          </p>
        </div>

        {/* Support Action */}
        <div className="pt-1">
          <a
            href="mailto:support@joinreviveai.com?subject=Regional%20Access%20Inquiry"
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-xs font-semibold h-10 px-6 transition"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Contact Support</span>
          </a>
        </div>
      </div>

      <p className="mt-6 text-xs text-[#5B7773]">
        &copy; {new Date().getFullYear()} Revive AI &bull;{" "}
        <Link href="mailto:support@joinreviveai.com" className="underline text-[#0F766E]">
          support@joinreviveai.com
        </Link>
      </p>
    </main>
  );
}