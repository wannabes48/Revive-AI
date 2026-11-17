import Link from "next/link";
import { Compass, ArrowLeft, LayoutDashboard } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#F7FAF9] text-[#0B2B2B] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#D3E2DE] rounded-2xl p-8 shadow-xs text-center space-y-6">
        {/* Brand Header */}
        <Link
          href="/"
          className="inline-block text-xl font-extrabold tracking-tight text-[#0B2B2B]"
        >
          Revive<span className="text-[#0F766E]">AI</span>
        </Link>

        {/* Icon Badge */}
        <div className="mx-auto w-14 h-14 rounded-full bg-[#CCFBF1] border border-[#99F6E4] flex items-center justify-center text-[#0F766E]">
          <Compass className="h-7 w-7" />
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#E5EFEC] text-[#0F766E]">
            Error 404
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B2B2B] pt-1">
            Page Not Found
          </h1>
          <p className="text-sm text-[#5B7773] leading-relaxed">
            The page or evaluation task you are looking for does not exist, has expired, or has been moved.
          </p>
        </div>

        {/* Navigation Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <Link
            href="/dashboard"
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0F766E] hover:bg-[#0F766E]/90 text-white text-xs font-semibold h-10 px-5 transition"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Go to Dashboard</span>
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-full border border-[#D3E2DE] bg-white hover:bg-[#F7FAF9] text-[#0B2B2B] text-xs font-semibold h-10 px-5 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Home</span>
          </Link>
        </div>
      </div>

      <p className="mt-6 text-xs text-[#5B7773]">
        Revive AI &bull; Expert Tasking &amp; Benchmark Platform
      </p>
    </main>
  );
}