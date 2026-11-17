import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyOnboardingProgress } from "@/lib/emails/automation";

/**
 * Recursively produces sorted, Unicode-preserved canonical JSON.
 * Required for Didit X-Signature-V2 verification.
 */
function canonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalizeJson).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${canonicalizeJson(obj[key])}`);
  return "{" + entries.join(",") + "}";
}

/**
 * Constant-time comparison between two hex strings to prevent timing attacks.
 */
function safeTimingEqual(a: string, b: string): boolean {
  const cleanA = a.replace(/^sha256=/, "").trim();
  const cleanB = b.replace(/^sha256=/, "").trim();
  if (!cleanA || !cleanB || cleanA.length !== cleanB.length) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(cleanA, "hex"), Buffer.from(cleanB, "hex"));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Read raw body as text. DO NOT parse JSON before signature verification.
    const rawBody = await req.text();

    const sigV2 = req.headers.get("x-signature-v2") || req.headers.get("X-Signature-V2") || "";
    const sigRaw = req.headers.get("x-signature") || req.headers.get("X-Signature") || "";
    const sigSimple =
      req.headers.get("x-signature-simple") || req.headers.get("X-Signature-Simple") || "";

    const webhookSecret = process.env.DIDIT_WEBHOOK_SECRET;

    // 2. Parse JSON body safely to evaluate payload data & signed timestamp
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
    }

    // 3. Verify HMAC-SHA256 signature
    // Supported headers: X-Signature-V2 (canonical), X-Signature (raw bytes), X-Signature-Simple
    if (webhookSecret && webhookSecret !== "placeholder_webhook_secret") {
      let isVerified = false;

      // Option A: X-Signature-V2 (Recommended by Didit: canonical sorted Unicode JSON)
      if (sigV2) {
        try {
          const canonical = canonicalizeJson(payload);
          const computedV2 = crypto
            .createHmac("sha256", webhookSecret)
            .update(canonical, "utf8")
            .digest("hex");
          if (safeTimingEqual(sigV2, computedV2)) {
            isVerified = true;
          }
        } catch (v2Err) {
          console.warn("X-Signature-V2 evaluation notice:", v2Err);
        }
      }

      // Option B: X-Signature (Raw body exact bytes)
      if (!isVerified && sigRaw) {
        try {
          const computedRaw = crypto
            .createHmac("sha256", webhookSecret)
            .update(rawBody, "utf8")
            .digest("hex");
          if (safeTimingEqual(sigRaw, computedRaw)) {
            isVerified = true;
          }
        } catch (rawErr) {
          console.warn("X-Signature evaluation notice:", rawErr);
        }
      }

      // Option C: X-Signature-Simple fallback ("{timestamp}:{session_id}:{status}:{webhook_type}")
      if (!isVerified && sigSimple) {
        try {
          const simpleTarget = `${payload.timestamp || payload.created_at || ""}:${
            payload.session_id || payload.business_session_id || ""
          }:${payload.status || ""}:${payload.webhook_type || ""}`;
          const computedSimple = crypto
            .createHmac("sha256", webhookSecret)
            .update(simpleTarget, "utf8")
            .digest("hex");
          if (safeTimingEqual(sigSimple, computedSimple)) {
            isVerified = true;
          }
        } catch (simpleErr) {
          console.warn("X-Signature-Simple evaluation notice:", simpleErr);
        }
      }

      if (!isVerified) {
        console.error("Didit webhook signature verification failed. Provided headers:", {
          hasSigV2: Boolean(sigV2),
          hasSigRaw: Boolean(sigRaw),
          hasSigSimple: Boolean(sigSimple),
        });
        return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 401 });
      }
    }

    // 4. Validate SIGNED body timestamp field is fresh (within 300 seconds / 5 minutes)
    // NEVER use the unsigned X-Timestamp header, which is excluded from the signature
    const nowEpochSeconds = Math.floor(Date.now() / 1000);
    const signedTimestamp = Number(payload.timestamp || payload.created_at);

    if (signedTimestamp && !isNaN(signedTimestamp)) {
      const driftSeconds = Math.abs(nowEpochSeconds - signedTimestamp);
      if (driftSeconds > 300) {
        console.error(
          `Didit webhook rejected: signed timestamp expired (drift: ${driftSeconds}s > 300s). Now: ${nowEpochSeconds}, Payload: ${signedTimestamp}`
        );
        return NextResponse.json(
          { error: "Webhook timestamp expired (replay attack prevention). Must be within 5m." },
          { status: 400 }
        );
      }
    }

    // 5. Extract Envelope identifiers
    const sessionObj = payload.session || payload;
    const sessionId =
      payload.session_id ||
      payload.business_session_id ||
      sessionObj.session_id ||
      sessionObj.id ||
      "unknown_session";

    const webhookType = payload.webhook_type || "status.updated";
    const rawStatus = (
      payload.status ||
      payload.decision?.status ||
      sessionObj.status ||
      ""
    ).toString();

    const eventId =
      payload.event_id || `${sessionId}_${rawStatus}_${webhookType}_${signedTimestamp || nowEpochSeconds}`;

    // Fellow Supabase UUID is passed via vendor_data during session creation
    const userId =
      payload.vendor_data ||
      sessionObj.vendor_data ||
      payload.metadata?.user_id ||
      payload.user_id;

    const adminClient = createAdminClient();
    const nowIso = new Date().toISOString();

    // 6. Deduplicate idempotently on event_id using atomic store
    try {
      const { error: dedupeError } = await adminClient.from("didit_webhook_events").insert({
        event_id: eventId,
        session_id: sessionId,
        webhook_type: webhookType,
        status: rawStatus,
        vendor_data: userId || null,
        processed_at: nowIso,
        raw_payload: payload,
      });

      if (dedupeError) {
        // Unique violation code: 23505
        if (dedupeError.code === "23505" || dedupeError.message?.includes("duplicate")) {
          return NextResponse.json(
            {
              received: true,
              deduplicated: true,
              event_id: eventId,
              message: "Event already processed idempotently.",
            },
            { status: 200 }
          );
        }
      }
    } catch {
      // Table may not yet be migrated in dev sandbox
    }

    // 7. Parse V3 Decision Object & Features
    const decision = payload.decision || {};
    const idVerifications = Array.isArray(decision.id_verifications) ? decision.id_verifications : [];
    const livenessChecks = Array.isArray(decision.liveness_checks) ? decision.liveness_checks : [];
    const faceMatches = Array.isArray(decision.face_matches) ? decision.face_matches : [];
    const amlScreenings = Array.isArray(decision.aml_screenings) ? decision.aml_screenings : [];
    const ipAnalyses = Array.isArray(decision.ip_analyses) ? decision.ip_analyses : [];

    // Extract primary document metadata
    const primaryId = idVerifications[0] || payload.document || sessionObj.document || {};
    const documentType =
      primaryId.type ||
      primaryId.document_type ||
      primaryId.category ||
      payload.document_type ||
      null;

    const countryCode =
      primaryId.issuing_country ||
      primaryId.country ||
      primaryId.country_code ||
      payload.country_code ||
      null;

    // Collect decline warnings & reasons across all V3 feature nodes
    const declineReasons: string[] = [];
    if (payload.decline_reasons) {
      if (Array.isArray(payload.decline_reasons)) declineReasons.push(...payload.decline_reasons);
      else declineReasons.push(String(payload.decline_reasons));
    }
    [...idVerifications, ...livenessChecks, ...faceMatches, ...amlScreenings, ...ipAnalyses].forEach(
      (node: any) => {
        if (Array.isArray(node.warnings)) {
          declineReasons.push(...node.warnings);
        } else if (node.warning) {
          declineReasons.push(String(node.warning));
        }
        if (node.status === "Declined" && node.declined_reason) {
          declineReasons.push(String(node.declined_reason));
        }
      }
    );

    const livenessPassed = livenessChecks.length > 0 ? livenessChecks.every((l: any) => l.status === "Approved") : null;
    const amlPassed = amlScreenings.length > 0 ? amlScreenings.every((a: any) => a.status === "Approved" || !a.hits?.length) : null;
    const ipRiskScore = ipAnalyses[0]?.risk_score ? Number(ipAnalyses[0].risk_score) : null;

    // 8. Map status to profiles.kyc_status & onboarding checklist gate
    // Status enum: "Approved" | "Declined" | "In Review" | "In Progress" | "Not Started" | "Abandoned" | "Expired" | "KYC Expired" | "Resubmitted"
    const lowerStatus = rawStatus.toLowerCase();
    let kycStatus: "verified" | "pending" | "in_progress" | "rejected" | "expired" | "abandoned" = "pending";
    let fellowStatus: "completed" | "in_review" | "failed" = "in_review";

    switch (rawStatus) {
      case "Approved":
        kycStatus = "verified";
        fellowStatus = "completed";
        break;
      case "Declined":
        kycStatus = "rejected";
        fellowStatus = "failed";
        break;
      case "In Review":
      case "Resubmitted":
        kycStatus = "pending";
        fellowStatus = "in_review";
        break;
      case "In Progress":
        kycStatus = "in_progress";
        fellowStatus = "in_review";
        break;
      case "Abandoned":
        kycStatus = "abandoned";
        fellowStatus = "in_review";
        break;
      case "Expired":
      case "KYC Expired":
        kycStatus = "expired";
        fellowStatus = "failed";
        break;
      default:
        if (lowerStatus.includes("approv") || lowerStatus === "verified") {
          kycStatus = "verified";
          fellowStatus = "completed";
        } else if (lowerStatus.includes("declin") || lowerStatus.includes("fail") || lowerStatus.includes("reject")) {
          kycStatus = "rejected";
          fellowStatus = "failed";
        } else if (lowerStatus.includes("progress")) {
          kycStatus = "in_progress";
          fellowStatus = "in_review";
        } else {
          kycStatus = "pending";
          fellowStatus = "in_review";
        }
        break;
    }

    // 9. Update database records if userId is available
    if (userId) {
      // Auth user metadata
      try {
        await adminClient.auth.admin.updateUserById(userId, {
          user_metadata: {
            kyc_status: kycStatus,
            didit_session_id: sessionId,
            kyc_verified_at: kycStatus === "verified" ? nowIso : null,
          },
        });
      } catch (err) {
        console.warn("Auth user metadata sync warning:", err);
      }

      // Profiles table
      try {
        const profileUpdates: any = {
          kyc_status: kycStatus,
          didit_session_id: sessionId,
          kyc_verified_at: kycStatus === "verified" ? nowIso : null,
        };
        if (countryCode) {
          profileUpdates.country = countryCode;
          profileUpdates.country_code = countryCode;
        }
        await adminClient.from("profiles").update(profileUpdates).eq("id", userId);
      } catch (err) {
        console.warn("Profile update warning:", err);
      }

      // Fellow Onboarding Progress (Step 1)
      try {
        await adminClient.from("fellow_onboarding_progress").upsert({
          user_id: userId,
          step_id: "step_1_kyc",
          status: fellowStatus,
          score: kycStatus === "verified" ? 100 : null,
          submitted_payload: {
            sessionId,
            provider: "didit.me",
            webhookType,
            decision: rawStatus,
            documentType,
            countryCode,
            livenessPassed,
            amlPassed,
            processedAt: nowIso,
          },
          updated_at: nowIso,
        });
      } catch {
        // Non-fatal
      }

      // Contributor notification
      try {
        let notifTitle = "Identity Verification Update";
        let notifBody = "Your Didit verification documents have been received.";

        if (kycStatus === "verified") {
          notifTitle = "Identity Verified! Onboarding Step 2 Unlocked";
          notifBody =
            "Your sovereign identity check has been approved. You may now complete your tax and payment setup.";
        } else if (kycStatus === "rejected") {
          notifTitle = "Identity Verification Needs Attention";
          notifBody =
            "Your identity document could not be approved. Please review requirements and resubmit, or reach out to support.";
        } else if (kycStatus === "in_progress") {
          notifTitle = "Verification in Progress";
          notifBody = "Your identity session is currently active and awaiting completion.";
        } else if (kycStatus === "expired") {
          notifTitle = "Verification Session Expired";
          notifBody = "Your verification session timed out. Please restart verification from the checklist.";
        }

        await adminClient.from("notifications").insert({
          user_id: userId,
          type: "admin_message",
          title: notifTitle,
          body: notifBody,
          href: "/dashboard?tab=ai-work",
        });
      } catch {
        // Non-fatal
      }

      if (kycStatus === "verified") {
        const { data: profile, error: profileError } = await adminClient
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          console.error("Could not fetch profile for KYC approval email:", profileError);
        } else if (profile?.email) {
          await notifyOnboardingProgress({
            userId,
            email: profile.email,
            name: profile.full_name || "Contributor",
            stepKey: "step_1_kyc_approved",
            completedStepLabel: "Identity Verification (KYC)",
            nextStepLabel: "Payments and Tax Setup (5m)",
            progressPercent: 17,
          });
        }
      }
    }

    

    // 10. Durable Store in kyc_verifications table for Admin Console
    try {
      await adminClient.from("kyc_verifications").upsert(
        {
          user_id: userId || null,
          session_id: sessionId,
          event_id: eventId,
          webhook_type: webhookType,
          workflow_id: payload.workflow_id || sessionObj.workflow_id || "didit_default",
          status: kycStatus,
          decision: rawStatus,
          document_type: documentType,
          country_code: countryCode,
          vendor_data: userId || null,
          verified_at: kycStatus === "verified" ? nowIso : null,
          decline_reasons: declineReasons.length > 0 ? declineReasons : null,
          warnings: declineReasons.length > 0 ? declineReasons : null,
          ip_risk_score: ipRiskScore,
          liveness_passed: livenessPassed,
          aml_passed: amlPassed,
          raw_payload: payload,
          updated_at: nowIso,
        },
        { onConflict: "session_id" }
      );
    } catch (upsertErr) {
      // Fallback insert if session_id conflict constraint is missing
      try {
        await adminClient.from("kyc_verifications").insert({
          user_id: userId || null,
          session_id: sessionId,
          event_id: eventId,
          webhook_type: webhookType,
          workflow_id: payload.workflow_id || sessionObj.workflow_id || "didit_default",
          status: kycStatus,
          decision: rawStatus,
          document_type: documentType,
          country_code: countryCode,
          vendor_data: userId || null,
          verified_at: kycStatus === "verified" ? nowIso : null,
          decline_reasons: declineReasons.length > 0 ? declineReasons : null,
          raw_payload: payload,
          updated_at: nowIso,
        });
      } catch {
        // Table fallback
      }
    }

    // 11. Return 2xx HTTP response immediately
    return NextResponse.json(
      {
        received: true,
        event_id: eventId,
        session_id: sessionId,
        webhook_type: webhookType,
        status: kycStatus,
        decision: rawStatus,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Didit webhook processing critical error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
