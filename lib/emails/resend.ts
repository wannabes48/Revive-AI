import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "placeholder-resend-key";

export const resend = new Resend(resendApiKey);

export const defaultSender =
  process.env.EMAIL_FROM || "Revive AI <hello@reviveai.com>";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  success: boolean;
  mocked?: boolean;
  error?: string;
  data?: any;
}

/**
 * Safe email dispatcher.
 * Wraps Resend in a fail-safe try/catch that NEVER throws, ensuring email
 * transport issues never interrupt core database mutations or user flows.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailOptions): Promise<SendEmailResult> {
  try {
    if (!to || typeof to !== "string" || !to.includes("@")) {
      console.warn("[Email Service] Invalid recipient address provided:", to);
      return { success: false, error: "Invalid recipient email address." };
    }

    if (
      !process.env.RESEND_API_KEY ||
      process.env.RESEND_API_KEY.includes("placeholder") ||
      process.env.RESEND_API_KEY.trim() === ""
    ) {
      console.log(
        `[Dev Email Mock] To: ${to} | Subject: ${subject} | Time: ${new Date().toISOString()}`
      );
      return { success: true, mocked: true };
    }

    const { data, error } = await resend.emails.send({
      from: defaultSender,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[Email Service] Resend API error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    // Fail-safe catch to guarantee zero exceptions thrown up the stack
    console.error("[Email Service] Unexpected error dispatching email:", err);
    return {
      success: false,
      error: err?.message || "Unexpected email delivery failure.",
    };
  }
}

// Alias for explicit safe naming
export const sendEmailSafe = sendEmail;

function isResendConfigured(): boolean {
  const key = process.env.RESEND_API_KEY;
  return Boolean(key && key.trim() !== "" && !key.includes("placeholder"));
}

const BATCH_LIMIT = 100; // Resend batch API maximum per request

/**
 * Sends many emails using Resend's batch API (100 per request), which avoids
 * the per-second rate limit hit by looping over sendEmail. Never throws.
 * Returns, per input index, whether that email was accepted.
 */
export async function sendEmailBatch(emails: SendEmailOptions[]): Promise<boolean[]> {
  const results: boolean[] = new Array(emails.length).fill(false);

  for (let start = 0; start < emails.length; start += BATCH_LIMIT) {
    const chunk = emails.slice(start, start + BATCH_LIMIT);
    try {
      if (!isResendConfigured()) {
        for (const email of chunk) {
          console.log(
            `[Dev Email Mock] To: ${email.to} | Subject: ${email.subject} | Time: ${new Date().toISOString()}`
          );
        }
        chunk.forEach((_, i) => (results[start + i] = true));
        continue;
      }

      const { error } = await resend.batch.send(
        chunk.map((email) => ({
          from: defaultSender,
          to: email.to,
          subject: email.subject,
          html: email.html,
        }))
      );

      if (error) {
        console.error("[Email Service] Resend batch error:", error);
        continue;
      }
      chunk.forEach((_, i) => (results[start + i] = true));
    } catch (err) {
      console.error("[Email Service] Unexpected batch dispatch error:", err);
    }
  }

  return results;
}
