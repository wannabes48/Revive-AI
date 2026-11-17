import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyOnboardingProgress } from "@/lib/emails/automation";

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
    const rawBody = await req.text();

    const sigV2 = req.headers.get("x-signature-v2") || req.headers.get("X-Signature-V2") || "";
    const sigRaw = req.headers.get("x-signature") || req.headers.get("X-Signature") || "";
    const sigSimple =
      req.headers.get("x-signature-simple") || req.headers.get("X-Signature-Simple") || "";

    const webhookSecret = process.env.DIDIT_WEBHOOK_SECRET;

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
    }

    // 1. Verify HMAC-SHA256 signature
    if (webhookSecret && webhookSecret !== "placeholder_webhook_secret") {
      let isVerified = false;

      if (sigV2) {
        try {
          const canonical = canonicalizeJson(payload);
          const computedV2 = crypto
            .createHmac("sha256", webhookSecret)
            .update(canonical, "utf8")
            .digest("hex");
          if (safeTimingEqual(sigV2, computedV2)) isVerified = true;
        } catch {}
      }

      if (!isVerified && sigRaw) {
        try {
          const computedRaw = crypto
            .createHmac("sha256", webhookSecret)
            .update(rawBody, "utf8")
            .digest("hex");
          if (safeTimingEqual(sigRaw, computedRaw)) isVerified = true;
        } catch {}
      }

      if (!isVerified && sigSimple) {
        try {
          const simpleTarget = `${payload.timestamp || payload.created_at || ""}:${
            payload.session_id || payload.business_session_id || ""
          }:${payload.status || ""}:${payload.webhook_type || ""}`;
          const computedSimple = crypto
            .createHmac("sha256", webhookSecret)
            .update(simpleTarget, "utf8")
            .digest("hex");
          if (safeTimingEqual(sigSimple, computedSimple)) isVerified = true;
        } catch {}
      }

      if (!isVerified) {
        console.error("Didit webhook signature verification failed.");
        return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 401 });
      }
    }

    // 2. Validate timestamp freshness (within 5 minutes)
    const nowEpochSeconds = Math.floor(Date.now() / 1000);
    const signedTimestamp = Number(payload.timestamp || payload.created_at);

    if (signedTimestamp && !isNaN(signedTimestamp)) {
      const driftSeconds = Math.abs(nowEpochSeconds - signedTimestamp);
      if (driftSeconds > 300) {
        return NextResponse.json(
          { error: "Webhook timestamp expired." },
          { status: 400 }
        );
      }
    }

    // 3. Extract session & status
    const sessionObj = payload.session || payload;
    const sessionId =
      payload.session_id ||
      payload.business_session_id ||
      sessionObj.session_id ||
      sessionObj.id ||
      "unknown_session";

    const webhookType = payload.webhook_type || "status.updated";
    const rawStatus = String(
      payload.status ||
      payload.decision?.status ||
      sessionObj.status ||
      ""
    ).trim();
    const lowerStatus = rawStatus.toLowerCase();

    const adminClient = createAdminClient();
    const nowIso = new Date().toISOString();

    // 4. Resolve userId from vendor_data OR fallback lookup by session_id
    let userId: string | undefined =
      payload.vendor_data ||
      sessionObj.vendor_data ||
      payload.metadata?.user_id ||
      payload.user_id;

    if (!userId && sessionId !== "unknown_session") {
      const { data: existingSession } = await adminClient
        .from("kyc_verifications")
        .select("user_id")
        .eq("session_id", sessionId)
        .maybeSingle();

      if (existingSession?.user_id) {
        userId = existingSession.user_id;
      }
    }

    const eventId =
      payload.event_id || `${sessionId}_${lowerStatus}_${webhookType}_${signedTimestamp || nowEpochSeconds}`;

    // 5. Deduplicate idempotently on event_id
    try {
      const { error: dedupeError } = await adminClient.from("didit_webhook_events").insert({
        event_id: eventId,
        session_id: sessionId,
        webhook_type: webhookType,
        status: lowerStatus,
        vendor_data: userId || null,
        processed_at: nowIso,
        raw_payload: payload,
      });

      if (dedupeError && (dedupeError.code === "23505" || dedupeError.message?.includes("duplicate"))) {
        return NextResponse.json(
          { received: true, deduplicated: true, event_id: eventId },
          { status: 200 }
        );
      }
    } catch {}

    // 6. Parse V3 Decision Object & Features
    const decision = payload.decision || {};
    const idVerifications = Array.isArray(decision.id_verifications) ? decision.id_verifications : [];
    const livenessChecks = Array.isArray(decision.liveness_checks) ? decision.liveness_checks : [];
    const faceMatches = Array.isArray(decision.face_matches) ? decision.face_matches : [];
    const amlScreenings = Array.isArray(decision.aml_screenings) ? decision.aml_screenings : [];
    const ipAnalyses = Array.isArray(decision.ip_analyses) ? decision.ip_analyses : [];

    const primaryId = idVerifications[0] || payload.document || sessionObj.document || {};
    const documentType =
      primaryId.type || primaryId.document_type || primaryId.category || payload.document_type || null;

    const countryCode =
      primaryId.issuing_country || primaryId.country || primaryId.country_code || payload.country_code || null;

    const extractedFullName =
      primaryId.full_name ||
      [primaryId.first_name, primaryId.last_name].filter(Boolean).join(" ") ||
      null;

    const declineReasons: string[] = [];
    if (payload.decline_reasons) {
      if (Array.isArray(payload.decline_reasons)) declineReasons.push(...payload.decline_reasons);
      else declineReasons.push(String(payload.decline_reasons));
    }
    [...idVerifications, ...livenessChecks, ...faceMatches, ...amlScreenings, ...ipAnalyses].forEach(
      (node: any) => {
        if (Array.isArray(node.warnings)) declineReasons.push(...node.warnings);
        else if (node.warning) declineReasons.push(String(node.warning));
        if (String(node.status).toLowerCase() === "declined" && node.declined_reason) {
          declineReasons.push(String(node.declined_reason));
        }
      }
    );

    const livenessPassed =
      livenessChecks.length > 0
        ? livenessChecks.every((l: any) => String(l.status).toLowerCase() === "approved")
        : null;
    const amlPassed =
      amlScreenings.length > 0
        ? amlScreenings.every((a: any) => String(a.status).toLowerCase() === "approved" || !a.hits?.length)
        : null;
    const ipRiskScore = ipAnalyses[0]?.risk_score != null ? Number(ipAnalyses[0].risk_score) : null;

    // 7. Map normalized lowercase status cleanly
    let kycStatus: "verified" | "pending" | "in_progress" | "rejected" | "expired" | "abandoned" = "pending";
    let fellowStatus: "completed" | "in_review" | "failed" = "in_review";

    if (lowerStatus === "approved" || lowerStatus === "verified") {
      kycStatus = "verified";
      fellowStatus = "completed";
    } else if (lowerStatus === "declined" || lowerStatus === "rejected" || lowerStatus === "failed") {
      kycStatus = "rejected";
      fellowStatus = "failed";
    } else if (lowerStatus === "in review" || lowerStatus === "in_review" || lowerStatus === "resubmitted") {
      kycStatus = "pending";
      fellowStatus = "in_review";
    } else if (lowerStatus === "in progress" || lowerStatus === "in_progress") {
      kycStatus = "in_progress";
      fellowStatus = "in_review";
    } else if (lowerStatus === "abandoned") {
      kycStatus = "abandoned";
      fellowStatus = "in_review";
    } else if (lowerStatus === "expired" || lowerStatus === "kyc expired") {
      kycStatus = "expired";
      fellowStatus = "failed";
    }

    // 8. Update user records safely (isolated queries so missing optional columns never block kyc_status)
    if (userId) {
      // A. Auth user metadata
      await adminClient.auth.admin
        .updateUserById(userId, {
          user_metadata: {
            kyc_status: kycStatus,
            didit_session_id: sessionId,
            kyc_verified_at: kycStatus === "verified" ? nowIso : null,
          },
        })
        .catch((err) => console.warn("Auth metadata sync warning:", err));

      // B. Core profiles.kyc_status update (isolated so optional columns cannot fail it)
      const { error: coreProfileErr } = await adminClient
        .from("profiles")
        .update({ kyc_status: kycStatus })
        .eq("id", userId);

      if (coreProfileErr) {
        console.error("CRITICAL: Failed updating profiles.kyc_status:", coreProfileErr);
      }

      // C. Optional profile metadata (best-effort)
      if (countryCode) {
        await adminClient
          .from("profiles")
          .update({ country_code: countryCode })
          .eq("id", userId)
          .then(() => {});
      }

      // D. Fellow Onboarding Progress (Step 1)
      const { error: onboardingProgressErr } = await adminClient
        .from("fellow_onboarding_progress")
        .upsert(
          {
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
          },
          { onConflict: "user_id,step_id" }
        );

      if (onboardingProgressErr) {
        console.warn("Onboarding progress upsert warning:", onboardingProgressErr);
      }

      // E. In-app notification & automated email on approval
      if (kycStatus === "verified") {
        const { data: profile } = await adminClient
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .maybeSingle();

        if (profile?.email) {
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

    // 9. Update kyc_verifications table for Admin Console
    const { error: kycTableErr } = await adminClient
      .from("kyc_verifications")
      .update({
        user_id: userId || null,
        event_id: eventId,
        webhook_type: webhookType,
        status: kycStatus === "verified" ? "approved" : kycStatus === "rejected" ? "declined" : kycStatus,
        decision: rawStatus,
        document_type: documentType,
        issuing_country: countryCode,
        extracted_full_name: extractedFullName,
        ip_risk_score: ipRiskScore,
        liveness_passed: livenessPassed,
        aml_passed: amlPassed,
        warnings: declineReasons.length > 0 ? declineReasons : null,
        raw_payload: payload,
        updated_at: nowIso,
      })
      .eq("session_id", sessionId);

    if (kycTableErr) {
      console.warn("kyc_verifications update warning:", kycTableErr);
    }

    return NextResponse.json(
      {
        received: true,
        event_id: eventId,
        session_id: sessionId,
        status: kycStatus,
        userIdResolved: Boolean(userId),
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