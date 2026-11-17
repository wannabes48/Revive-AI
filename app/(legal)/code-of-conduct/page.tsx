import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Expert Code of Conduct — Revive AI",
  description:
    "The Revive AI Expert Code of Conduct establishing professional standards and integrity requirements for all contributors.",
};

export default function CodeOfConductPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
      {/* Page Header */}
      <div className="mb-10 pb-8 border-b border-[#D3E2DE]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CCFBF1] border border-[#99F6E4] text-[#0F766E] text-[11px] font-bold mb-4">
          Legal Document
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-3">
          Expert Code of Conduct
        </h1>
        <p className="text-sm text-muted-foreground">
          Last Updated: <time dateTime="2025-11-01">November 1, 2025</time>
        </p>
      </div>

      <div className="space-y-10 text-[15px] leading-7 text-foreground">
        {/* Introduction */}
        <section>
          <p className="text-muted-foreground leading-relaxed">
            The Revive AI Expert Code of Conduct (&ldquo;Code&rdquo;) establishes the professional
            standards, ethical obligations, and behavioral expectations for all contributors
            (&ldquo;Experts&rdquo;) on the Revive AI Platform. Adherence to this Code is a condition of your
            continued participation and compensation on the Platform. Violations may result in
            immediate suspension, account termination, and legal remedies.
          </p>
        </section>

        {/* Section 1 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            1. Professional Standards &amp; Quality
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              Revive AI engages experts to contribute genuine, domain-authoritative intelligence.
              You are expected to deliver your best professional judgment and analysis in every
              task. Minimum quality standards apply to all submissions.
            </p>
            <ul className="list-disc list-outside ml-5 space-y-1.5 text-sm">
              <li>
                All task submissions must reflect your genuine, independent professional expertise
                in the specified domain.
              </li>
              <li>
                You must read and follow all task instructions, rubrics, and evaluation guidelines
                in their entirety before submitting responses.
              </li>
              <li>
                Responses must be thorough, accurate, well-reasoned, and formatted according to
                task-specific specifications.
              </li>
              <li>
                If you lack sufficient expertise for a specific task, you must decline it rather
                than submit low-quality or speculative work.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 2 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            2. Academic Integrity &amp; Anti-Plagiarism
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              The integrity of AI training data depends entirely on the authenticity of expert
              contributions. Revive AI employs automated and manual detection systems to identify
              integrity violations.
            </p>
            <ul className="list-disc list-outside ml-5 space-y-1.5 text-sm">
              <li>
                All submitted work must be original and authored by you during the task session.
                Submitting plagiarized content is grounds for immediate termination and legal action.
              </li>
              <li>
                You must not use any AI language model, automated writing assistant, or generative
                AI tool to produce, assist with, or modify your task submissions, unless
                expressly permitted in writing for a specific task.
              </li>
              <li>
                You must not copy content from published papers, websites, textbooks, or other
                sources without attribution, and even attributed content must only be used as
                supporting reference, not as a primary response.
              </li>
              <li>
                You must not share task questions, model outputs, or evaluation rubrics with other
                contributors or external parties to coordinate responses.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 3 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            3. Task Session Integrity
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              Timed assessments and task sessions are conducted under honor-system conditions
              equivalent to formal academic and professional examinations.
            </p>
            <ul className="list-disc list-outside ml-5 space-y-1.5 text-sm">
              <li>
                You must complete timed tasks within the allotted session window without pausing,
                abandoning, or re-entering the session to gain additional time.
              </li>
              <li>
                You must not receive assistance from other persons, reference materials beyond those
                explicitly allowed, or external tools not sanctioned for the task.
              </li>
              <li>
                Auto-saved progress is recorded continuously. Any manipulation of session data or
                timestamps constitutes a material breach of this Code.
              </li>
              <li>
                By submitting a task, you certify that the work is your own and meets all stated
                requirements.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            4. Communication &amp; Professional Conduct
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <ul className="list-disc list-outside ml-5 space-y-1.5 text-sm">
              <li>
                All communications with Revive AI staff and other contributors must be professional,
                respectful, and constructive. Harassment, intimidation, discriminatory language, or
                hostile conduct of any kind will not be tolerated.
              </li>
              <li>
                You must respond to Revive AI quality assurance inquiries, audit requests, and
                policy notices within 5 business days.
              </li>
              <li>
                You must immediately disclose to Revive AI any potential conflict of interest
                related to a task (e.g., prior involvement with the subject matter, competitive
                interest, or personal relationship with parties involved).
              </li>
              <li>
                Public statements, social media posts, or publications referencing your work on the
                Platform must comply with the Confidentiality Agreement and may require prior
                written approval.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 5 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            5. Conflict of Interest
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              Experts must maintain objectivity and impartiality in all evaluations and
              contributions. You must disclose any actual or potential conflict of interest to
              Revive AI before accepting or completing a task. Failure to disclose conflicts is a
              material violation of this Code.
            </p>
            <ul className="list-disc list-outside ml-5 space-y-1.5 text-sm">
              <li>
                You must not accept tasks where you have a financial, personal, or competitive
                interest that could reasonably impair your objectivity.
              </li>
              <li>
                You must not evaluate work or models produced by organizations where you are
                currently employed, consulting, or have a significant equity stake.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 6 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            6. Data Privacy &amp; Security
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <ul className="list-disc list-outside ml-5 space-y-1.5 text-sm">
              <li>
                You must not store, copy, or transmit any Platform data, model outputs, or task
                materials outside of the Platform&rsquo;s designated workspace.
              </li>
              <li>
                You are responsible for maintaining the security of your account credentials. Any
                suspected compromise must be reported to{" "}
                <a href="mailto:security@reviveai.com" className="text-[#0F766E] hover:underline">
                  security@reviveai.com
                </a>{" "}
                immediately.
              </li>
              <li>
                You must comply with all applicable data protection laws (including GDPR where
                applicable) in connection with any personal data you process during task completion.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 7 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            7. Consequences of Violations
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>Violations of this Code may result in one or more of the following:</p>
            <ul className="list-disc list-outside ml-5 space-y-1.5 text-sm">
              <li>
                <strong className="text-foreground">Warning:</strong> Formal written notice for
                minor first-time violations.
              </li>
              <li>
                <strong className="text-foreground">Task Suspension:</strong> Removal from active
                tasks pending review for moderate violations.
              </li>
              <li>
                <strong className="text-foreground">Payment Withholding:</strong> Withholding or
                clawback of compensation for tasks where violations occurred.
              </li>
              <li>
                <strong className="text-foreground">Account Termination:</strong> Permanent ban
                from the Platform for serious or repeated violations.
              </li>
              <li>
                <strong className="text-foreground">Legal Action:</strong> Pursuit of civil or
                criminal remedies, including injunctive relief and damages, for violations causing
                material harm to Revive AI or its clients.
              </li>
            </ul>
            <p>
              Revive AI&rsquo;s determination of violations is final and binding, subject to the dispute
              resolution process outlined in the Terms of Service.
            </p>
          </div>
        </section>

        {/* Section 8 */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground mb-3 pb-2 border-b border-[#E2EAD9]">
            8. Reporting Violations
          </h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              If you observe violations of this Code by other contributors or Revive AI staff, you
              are encouraged to report them in good faith to{" "}
              <a
                href="mailto:conduct@reviveai.com"
                className="text-[#0F766E] font-semibold hover:underline"
              >
                conduct@reviveai.com
              </a>
              . Reports are treated confidentially. Retaliation against anyone who reports a
              violation in good faith is itself a violation of this Code.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="p-5 rounded-xl bg-card border border-[#D3E2DE]">
          <h2 className="font-heading text-base font-bold text-foreground mb-2">
            Questions &amp; Conduct Reports
          </h2>
          <p className="text-sm text-muted-foreground">
            For questions about this Code or to report a conduct concern, contact us at{" "}
            <a
              href="mailto:conduct@reviveai.com"
              className="text-[#0F766E] font-semibold hover:underline"
            >
              conduct@reviveai.com
            </a>
            {". "}Revive AI Inc., 1234 Innovation Way, Wilmington, DE 19801, USA.
          </p>
        </section>
      </div>
    </article>
  );
}
