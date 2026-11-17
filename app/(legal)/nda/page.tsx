import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confidentiality Precursor (NDA) — Revive AI",
  description:
    "Review the Revive AI Confidentiality Precursor governing the protection of proprietary and sensitive information shared on the platform.",
};

export default function NdaPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
      {/* Page Header */}
      <div className="mb-10 pb-8 border-b border-[#D3E2DE]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CCFBF1] border border-[#99F6E4] text-[#0F766E] text-[11px] font-bold mb-4">
          Legal Document
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-3">
          Confidentiality Precursor
          <span className="block text-lg font-semibold text-muted-foreground mt-1">
            Non-Disclosure Agreement (NDA)
          </span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Last Updated: <time dateTime="2025-11-01">November 1, 2025</time>
        </p>
      </div>

      <div className="space-y-10 text-[15px] leading-7 text-foreground">
        {/* Introduction */}
        <section>
          <p className="text-muted-foreground leading-relaxed">
            This Confidentiality Precursor (&ldquo;Agreement&rdquo;) is entered into between you
            (&ldquo;Contributor&rdquo;) and Revive AI Inc. (&ldquo;Company&rdquo;) upon your creation of a
            contributor account on the Revive AI Platform. This Agreement governs your obligations
            with respect to Confidential Information you receive access to in the course of your
            engagement as an independent contributor. By using the Platform, you agree to be legally
            bound by the terms of this Agreement.
          </p>
        </section>

        {/* Section 1 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            1. Definition of Confidential Information
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              &ldquo;Confidential Information&rdquo; means any and all non-public information disclosed by the
              Company or its clients to the Contributor, whether disclosed orally, in writing,
              electronically, or in any other form, that is designated as confidential or that
              reasonably should be understood to be confidential given the nature of the information
              and circumstances of disclosure.
            </p>
            <p>Confidential Information includes, without limitation:</p>
            <ul className="list-disc list-outside ml-5 space-y-1.5 text-sm">
              <li>
                Proprietary AI model architectures, weights, training datasets, evaluation
                benchmarks, rubrics, and scoring methodologies.
              </li>
              <li>
                Task descriptions, project briefs, research questions, and client-specific
                instructions provided within the Platform.
              </li>
              <li>
                Output data, annotations, evaluation scores, model responses, and any derivative
                analysis produced during tasks.
              </li>
              <li>
                Business strategies, pricing structures, client identities, contractual terms, and
                roadmaps disclosed in connection with your engagement.
              </li>
              <li>
                Technical systems, Platform source code, APIs, and infrastructure details to which
                you gain access.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 2 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            2. Confidentiality Obligations
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>Contributor agrees to:</p>
            <ul className="list-disc list-outside ml-5 space-y-1.5 text-sm">
              <li>
                Hold all Confidential Information in strict confidence and not disclose it to any
                third party without prior written consent from Revive AI.
              </li>
              <li>
                Use Confidential Information solely for the purpose of completing assigned tasks on
                the Platform and for no other purpose.
              </li>
              <li>
                Not reproduce, copy, or distribute Confidential Information beyond what is strictly
                necessary for task completion.
              </li>
              <li>
                Implement reasonable security measures to protect Confidential Information from
                unauthorized access, including password protection and device security.
              </li>
              <li>
                Promptly notify Revive AI in writing if Contributor becomes aware of any
                unauthorized use, disclosure, or breach of Confidential Information.
              </li>
              <li>
                Not discuss, post, publish, or reference Confidential Information on social media,
                public forums, academic papers, or in any other public venue.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 3 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            3. Exceptions to Confidentiality
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              The obligations in Section 2 shall not apply to information that:
            </p>
            <ul className="list-disc list-outside ml-5 space-y-1.5 text-sm">
              <li>
                Was already in the public domain at the time of disclosure without breach of this
                Agreement.
              </li>
              <li>
                Was already known to Contributor before receipt from the Company, as evidenced by
                contemporaneous written records.
              </li>
              <li>
                Is independently developed by Contributor without reference to or use of the
                Confidential Information.
              </li>
              <li>
                Is required to be disclosed by applicable law, court order, or governmental
                authority, provided that Contributor provides prompt prior written notice to Revive
                AI and cooperates to seek a protective order.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            4. Term &amp; Duration
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              This Agreement is effective from the date you create a Revive AI account and
              continues indefinitely. Confidentiality obligations survive the termination or
              expiration of your engagement with the Platform for a period of{" "}
              <strong className="text-foreground">five (5) years</strong> from the date of last
              access, or indefinitely for trade secrets and proprietary AI-related materials.
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            5. Return or Destruction of Materials
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              Upon termination of your engagement, or upon request by Revive AI, you shall promptly
              return or permanently destroy all Confidential Information in your possession or
              control, including all copies, notes, and derivative materials, and provide written
              certification of such destruction if requested.
            </p>
          </div>
        </section>

        {/* Section 6 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            6. Remedies for Breach
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              Contributor acknowledges that any breach or threatened breach of this Agreement will
              cause irreparable harm to Revive AI and its clients that cannot be adequately
              compensated by monetary damages alone. Accordingly, Revive AI shall be entitled to
              seek injunctive relief, specific performance, and any other equitable remedy available
              in a court of competent jurisdiction, in addition to all legal remedies.
            </p>
            <p>
              Contributor may be held liable for direct, indirect, incidental, consequential, and
              punitive damages resulting from any unauthorized disclosure or use of Confidential
              Information.
            </p>
          </div>
        </section>

        {/* Section 7 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            7. No License
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              Nothing in this Agreement grants the Contributor any right, title, license, or
              interest in or to the Confidential Information, or any intellectual property rights
              therein, beyond the limited right to use it solely for the purpose of completing
              assigned Platform tasks.
            </p>
          </div>
        </section>

        {/* Section 8 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            8. Governing Law
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              This Agreement shall be governed by and construed in accordance with the laws of the
              State of Delaware, USA. Any disputes arising under this Agreement shall be subject to
              the exclusive jurisdiction of the federal and state courts located in Delaware.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="p-5 rounded-xl bg-card border border-[#D3E2DE]">
          <h2 className="font-heading text-base font-bold text-foreground mb-2">
            Questions About This Agreement
          </h2>
          <p className="text-sm text-muted-foreground">
            Direct all confidentiality inquiries to{" "}
            <a
              href="mailto:legal@reviveai.com"
              className="text-[#0F766E] font-semibold hover:underline"
            >
              legal@reviveai.com
            </a>
            . Revive AI Inc., Legal Department, 1234 Innovation Way, Wilmington, DE 19801, USA.
          </p>
        </section>
      </div>
    </article>
  );
}
