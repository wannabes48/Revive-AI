import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getReferralSettings } from "@/lib/referrals-server";
import { formatUsd, REFERRAL_MIN_PROFILE_PERCENT } from "@/lib/referrals";

export const metadata: Metadata = {
  title: "Referral Terms — Revive AI",
  description: "Terms of the Revive AI contributor referral program.",
};

export const dynamic = "force-dynamic";

export default async function ReferralTermsPage() {
  const supabase = await createClient();
  const s = await getReferralSettings(supabase);

  const sections: { title: string; body: React.ReactNode }[] = [
    {
      title: "1. Who can refer",
      body: (
        <>
          Any Revive AI contributor in good standing whose profile is at least{" "}
          {REFERRAL_MIN_PROFILE_PERCENT}% complete receives a personal referral link. Only people who
          create a brand-new Revive AI account through your link count as your referral. Each person can
          only ever be credited to one referrer, and you cannot refer yourself.
        </>
      ),
    },
    {
      title: "2. What qualifies",
      body: (
        <>
          A referral qualifies when the person you invited earns {formatUsd(s.min_earned_cents)} in
          approved work within {s.window_days} days of creating their account. Only work approved by our
          reviewers counts; rejected work, bonuses and adjustments do not. Referrals that do not reach
          this amount in time expire.
        </>
      ),
    },
    {
      title: "3. Rewards and timing",
      body: (
        <>
          When a referral qualifies, the referrer receives {formatUsd(s.referrer_reward_cents)}
          {s.referred_reward_cents > 0 && (
            <> and the new member receives a {formatUsd(s.referred_reward_cents)} welcome bonus</>
          )}
          . Rewards are added to your Revive AI wallet and are held for {s.hold_days} days before they
          become available, the same as other earnings. They are then included in the regular payout
          cycle.
        </>
      ),
    },
    {
      title: "4. Limits",
      body: (
        <>
          Each referrer can receive at most {s.max_rewards_per_referrer} referral rewards. The program is
          single level only: you are rewarded for people you invite directly, never for people they
          invite. The program is not a way to earn income by recruiting, and must not be described as
          one.
        </>
      ),
    },
    {
      title: "5. Reviews, fraud and abuse",
      body: (
        <>
          Some referrals are reviewed by our team before rewards are paid, for example when accounts share
          payout details. We may decline, withhold or reverse any reward obtained through fraud, duplicate
          or fake accounts, self-referral, or other abuse, and may block payouts or close accounts
          involved.
        </>
      ),
    },
    {
      title: "6. Sharing your link",
      body: (
        <>
          Share your link honestly and personally. Do not spam, do not post your link where the rules of
          a platform, group or forum forbid it, and do not make claims about how much anyone will earn.
        </>
      ),
    },
    {
      title: "7. Payments, identity checks and taxes",
      body: (
        <>
          Referral rewards are earnings paid through your wallet. They are subject to the same identity
          verification, payout rules and any tax obligations as your other earnings on Revive AI. You are
          responsible for reporting them where required.
        </>
      ),
    },
    {
      title: "8. Privacy",
      body: (
        <>
          Referrers only see a shortened name, signup date and progress for the people they invite. We
          never show a referrer anyone&apos;s email address, country or earnings details.
        </>
      ),
    },
    {
      title: "9. Changes",
      body: (
        <>
          Revive AI may change the reward amounts, qualification rules or limits, pause the program, or
          end it at any time. The amounts on this page always reflect the current program. These terms
          are part of our <Link href="/terms" className="text-[#0F766E] underline">Terms of Service</Link>.
        </>
      ),
    },
  ];

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
      <div className="mb-10 pb-8 border-b border-[#D3E2DE]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CCFBF1] border border-[#99F6E4] text-[#0F766E] text-[11px] font-bold mb-4">
          Legal Document
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-3">
          Referral Program Terms
        </h1>
        <p className="text-sm text-muted-foreground">
          {s.enabled ? "The referral program is currently open." : "The referral program is currently paused."}
        </p>
      </div>

      <div className="space-y-8 text-[15px] leading-7 text-foreground">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-heading text-xl font-bold mb-2">{section.title}</h2>
            <p className="text-muted-foreground leading-relaxed">{section.body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
