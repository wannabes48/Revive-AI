import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Revive AI",
  description:
    "Read the Revive AI Terms of Service governing the use of our expert tasking platform.",
};

export default function TermsPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
      {/* Page Header */}
      <div className="mb-10 pb-8 border-b border-[#D3E2DE]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CCFBF1] border border-[#99F6E4] text-[#0F766E] text-[11px] font-bold mb-4">
          Legal Document
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-3">
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground">
          Last Updated: <time dateTime="2025-11-01">November 1, 2025</time>
        </p>
      </div>

      <div className="space-y-10 text-[15px] leading-7 text-foreground">
        {/* Introduction */}
        <section>
          <p className="text-muted-foreground leading-relaxed">
            Welcome to Revive AI. These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and
            use of the Revive AI platform, services, tools, and websites (collectively, the
            &ldquo;Platform&rdquo;), operated by Revive AI Inc. (&ldquo;Revive AI&rdquo;, &ldquo;we&rdquo;,
            &ldquo;our&rdquo;, or &ldquo;us&rdquo;). By accessing or using the Platform, you agree to be
            bound by these Terms. If you do not agree, please discontinue use immediately.
          </p>
        </section>

        {/* Section 1 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            1. Platform Use &amp; Eligibility
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              The Revive AI Platform is available to qualified domain experts who have successfully
              completed the application process, identity verification, and onboarding assessment.
              You must be at least 18 years of age and legally authorized to perform independent
              contractor work in your country of residence.
            </p>
            <p>
              Access to paid tasks and project assignments is conditional on administrator approval
              of your account. Creating an account places you on a waitlist; approval grants you
              access to the contributor workspace and task feed.
            </p>
            <ul className="list-disc list-outside ml-5 space-y-1.5 text-sm">
              <li>You may not share, sublicense, or transfer your account to any third party.</li>
              <li>
                You must maintain accurate, current, and truthful profile information at all times.
              </li>
              <li>
                Multiple accounts per individual are prohibited and will result in permanent
                suspension.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 2 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            2. Contractor Relationship
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              Contributors on the Revive AI Platform are engaged as{" "}
              <strong className="text-foreground font-semibold">independent contractors</strong>,
              not employees, agents, partners, or joint-venture partners of Revive AI. Nothing in
              these Terms creates an employment relationship between you and Revive AI.
            </p>
            <p>
              As an independent contractor, you are solely responsible for:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-1.5 text-sm">
              <li>
                All federal, state, provincial, or local taxes applicable to your compensation,
                including self-employment taxes.
              </li>
              <li>
                Compliance with all laws and regulations applicable to your work and location.
              </li>
              <li>
                Maintaining any professional licenses, credentials, or certifications required by
                your domain.
              </li>
              <li>Your own tools, equipment, software, and internet connectivity.</li>
            </ul>
          </div>
        </section>

        {/* Section 3 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            3. Payment Terms &amp; Compensation
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              Compensation rates are set per task or project, as displayed in the task detail view
              prior to acceptance. Payment is processed through the Revive AI payment system
              following task completion, review, and quality verification.
            </p>
            <ul className="list-disc list-outside ml-5 space-y-1.5 text-sm">
              <li>
                Payment is contingent on successful completion and acceptance of deliverables by
                the Revive AI quality assurance team.
              </li>
              <li>
                Disputed submissions may be held pending review. Revive AI reserves the right to
                adjust, withhold, or clawback compensation for work that does not meet stated
                quality benchmarks, contains fabrications, or violates task guidelines.
              </li>
              <li>
                You are responsible for submitting accurate tax documentation (W-9 for U.S.
                persons, W-8BEN for non-U.S. persons) through the platform Payment Setup before
                receiving payments.
              </li>
              <li>
                Revive AI issues 1099-NEC forms to eligible U.S. contributors earning above the
                IRS reporting threshold per calendar year.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            4. Intellectual Property &amp; Work Product
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              All work product, annotations, evaluations, generated content, benchmark
              contributions, and deliverables created by you in connection with Platform tasks
              (&ldquo;Work Product&rdquo;) are considered works made for hire to the maximum extent
              permitted by applicable law.
            </p>
            <p>
              To the extent any Work Product does not qualify as a work made for hire, you hereby
              irrevocably assign to Revive AI all right, title, and interest in and to the Work
              Product, including all intellectual property rights therein, without additional
              compensation.
            </p>
            <ul className="list-disc list-outside ml-5 space-y-1.5 text-sm">
              <li>
                You warrant that all Work Product is original to you and does not infringe any
                third-party intellectual property rights.
              </li>
              <li>
                Use of AI-generated content in task submissions without express written permission
                from Revive AI is strictly prohibited.
              </li>
              <li>
                You retain ownership of your general skills, knowledge, and pre-existing
                intellectual property not incorporated into Work Product.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 5 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            5. Prohibited Conduct
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>When using the Platform, you agree not to:</p>
            <ul className="list-disc list-outside ml-5 space-y-1.5 text-sm">
              <li>Submit plagiarized, fabricated, or intentionally misleading work product.</li>
              <li>
                Circumvent, reverse-engineer, or attempt to bypass any Platform security,
                authentication, or access control systems.
              </li>
              <li>
                Share task content, proprietary datasets, model outputs, or evaluation materials
                with unauthorized third parties.
              </li>
              <li>Use automated bots, scripts, or AI tools to complete tasks on your behalf.</li>
              <li>
                Engage in coordinated manipulation, review-farming, or any form of collusion with
                other contributors.
              </li>
              <li>
                Harass, threaten, or engage in discriminatory conduct toward Revive AI staff or
                other contributors.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 6 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            6. Termination &amp; Suspension
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              Revive AI reserves the right to suspend or permanently terminate your account at any
              time, with or without notice, for violation of these Terms, breach of the
              Confidentiality Agreement or Expert Code of Conduct, or any conduct that Revive AI
              determines, in its sole discretion, to be harmful to the Platform, its clients, or
              other contributors.
            </p>
            <p>
              Upon termination, your right to access the Platform ceases immediately. Any earned
              but unpaid compensation for work completed and accepted prior to termination will be
              paid out per the standard payment schedule, unless the termination is due to fraud,
              policy violation, or misrepresentation, in which case Revive AI may withhold or
              clawback such amounts.
            </p>
          </div>
        </section>

        {/* Section 7 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            7. Limitation of Liability &amp; Disclaimer
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              THE PLATFORM IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTY OF
              ANY KIND. TO THE FULLEST EXTENT PERMITTED BY LAW, REVIVE AI DISCLAIMS ALL WARRANTIES,
              EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p>
              IN NO EVENT SHALL REVIVE AI&rsquo;S TOTAL CUMULATIVE LIABILITY TO YOU EXCEED THE GREATER
              OF (A) THE TOTAL FEES PAID TO YOU IN THE THREE MONTHS PRECEDING THE CLAIM, OR (B)
              ONE HUNDRED DOLLARS (\$100 USD).
            </p>
          </div>
        </section>

        {/* Section 8 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            8. Governing Law &amp; Dispute Resolution
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              These Terms are governed by the laws of the State of Delaware, USA, without regard to
              its conflict-of-law provisions. Any dispute, claim, or controversy arising out of or
              relating to these Terms or the Platform shall be resolved by binding individual
              arbitration administered by the American Arbitration Association (AAA) under its
              Commercial Arbitration Rules. Class action and class arbitration are expressly waived.
            </p>
          </div>
        </section>

        {/* Section 9 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            9. Changes to These Terms
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              Revive AI may update these Terms from time to time. We will notify you of material
              changes via email or in-platform notice at least 14 days before the changes take
              effect. Your continued use of the Platform after the effective date constitutes
              acceptance of the revised Terms.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="p-5 rounded-xl bg-card border border-[#D3E2DE]">
          <h2 className="font-heading text-base font-bold text-foreground mb-2">
            Contact &amp; Questions
          </h2>
          <p className="text-sm text-muted-foreground">
            If you have questions about these Terms, please contact us at{" "}
            <a
              href="mailto:legal@reviveai.com"
              className="text-[#0F766E] font-semibold hover:underline"
            >
              legal@reviveai.com
            </a>
            {" "}or write to Revive AI Inc., Legal Department, 1234 Innovation Way, Wilmington, DE
            19801, USA.
          </p>
        </section>
      </div>
    </article>
  );
}
