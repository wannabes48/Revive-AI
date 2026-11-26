import { signOutAction } from "@/actions/auth";

export const metadata = {
  title: "Account Suspended — Revive AI",
  description: "This Revive AI contributor account has been deactivated.",
};

const SUPPORT_EMAIL = "support@joinreviveai.com";

export default function SuspendedPage() {
  return (
    <main className="min-h-screen bg-white text-[#1F2937] flex flex-col items-center overflow-hidden">
      <div className="w-full max-w-3xl px-6 pt-20 sm:pt-28 text-center space-y-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
          Your account has been suspended
        </h1>
        <p className="text-sm text-[#4B5563] leading-relaxed max-w-2xl mx-auto">
          Following a review of your account activity, we identified violations of our{" "}
          <a href="/terms" className="text-[#0EA5C6] hover:underline">
            Terms of Use
          </a>{" "}
          and{" "}
          <a href="/code-of-conduct" className="text-[#0EA5C6] hover:underline">
            Community Guidelines
          </a>
          . Your contract has been permanently terminated and your account deactivated. You can
          no longer access the platform or take part in further projects.
          <br />
          Please contact our{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Account%20Suspension`}
            className="text-[#0EA5C6] hover:underline"
          >
            support center
          </a>{" "}
          if you have any questions.
        </p>
        <form action={signOutAction} className="pt-1">
          <button
            type="submit"
            className="text-xs font-semibold text-[#6B7280] underline underline-offset-2 hover:text-[#111827] cursor-pointer"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="flex-1 w-full flex items-end justify-center mt-12">
        <SlumpedFigure className="w-[300px] sm:w-[420px] h-auto -mb-1" />
      </div>
    </main>
  );
}

/** A dejected figure, head tilted and shoulders slumped, cut off at the bottom of the screen. */
function SlumpedFigure({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 420"
      className={className}
      role="img"
      aria-label="A sad person with a lowered head"
    >
      {/* Body / sweater */}
      <path
        d="M70 420 C 62 330, 80 250, 150 215 C 175 203, 225 203, 250 215 C 320 250, 338 330, 330 420 Z"
        fill="#F2C9BC"
      />
      {/* Sweater shading */}
      <path d="M150 215 C 120 240, 100 300, 96 420 L 70 420 C 62 330, 80 250, 150 215 Z" fill="#EAB9AA" />
      <path d="M200 262 C 196 320, 186 380, 182 420 L 214 420 C 210 380, 204 320, 200 262 Z" fill="#E3AE9E" opacity="0.7" />
      {/* Knit texture */}
      <g stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.55">
        <path d="M118 300 l3 14" />
        <path d="M140 340 l2 12" />
        <path d="M112 370 l3 12" />
        <path d="M262 290 l-2 13" />
        <path d="M286 336 l-3 12" />
        <path d="M250 372 l-2 12" />
        <path d="M168 300 l1 10" />
        <path d="M234 318 l-1 11" />
      </g>
      {/* Collar */}
      <path
        d="M152 214 C 165 236, 235 236, 248 214 C 238 206, 162 206, 152 214 Z"
        fill="#FBEDE4"
        stroke="#F7E1D5"
        strokeWidth="2"
      />
      {/* Neck */}
      <path d="M178 176 L 176 222 C 190 230, 210 230, 222 222 L 220 176 Z" fill="#E86F64" />
      {/* Head, tilted down to one side */}
      <g transform="rotate(-14 180 130)">
        {/* Ear */}
        <ellipse cx="226" cy="134" rx="9" ry="13" fill="#E86F64" />
        {/* Face */}
        <ellipse cx="184" cy="134" rx="44" ry="50" fill="#EC7E72" />
        {/* Hair */}
        <path
          d="M138 128 C 132 86, 162 66, 196 70 C 228 74, 240 100, 232 128 C 224 112, 212 102, 196 100 C 176 108, 156 112, 140 136 Z"
          fill="#4A1F1B"
        />
        <path d="M222 112 C 230 118, 232 128, 230 138 L 224 132 Z" fill="#4A1F1B" />
        {/* Brows, raised in the middle */}
        <path d="M160 124 q 8 -6 16 -2" stroke="#4A1F1B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M190 122 q 8 -4 15 2" stroke="#4A1F1B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* Eyes, looking down */}
        <ellipse cx="170" cy="136" rx="3.2" ry="4" fill="#2A1210" />
        <ellipse cx="198" cy="136" rx="3.2" ry="4" fill="#2A1210" />
        {/* Cheeks */}
        <circle cx="160" cy="152" r="7" fill="#D9544B" opacity="0.45" />
        <circle cx="208" cy="152" r="7" fill="#D9544B" opacity="0.45" />
        {/* Frown */}
        <path d="M176 164 q 8 -6 16 0" stroke="#2A1210" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}
