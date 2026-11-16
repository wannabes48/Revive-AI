import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("x-signature") ||
      req.headers.get("x-didit-signature") ||
      req.headers.get("x-hub-signature-256") ||
      "";

    const webhookSecret = process.env.DIDIT_WEBHOOK_SECRET;

    // 1. Verify HMAC-SHA256 signature if secret is provided in environment
    if (webhookSecret && webhookSecret !== "placeholder_webhook_secret") {
      const computedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      const cleanSig = signature.replace(/^sha256=/, "");

      try {
        const isMatch = crypto.timingSafeEqual(
          Buffer.from(cleanSig, "hex"),
          Buffer.from(computedSignature, "hex")
        );
        if (!isMatch) {
          console.error("Didit webhook signature mismatch.");
          return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
        }
      } catch (sigErr) {
        console.error("Signature comparison failure:", sigErr);
        return NextResponse.json({ error: "Invalid signature format" }, { status: 401 });
      }
    }

    // 2. Parse payload
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Extract core fields from Didit payload
    // Didit sends either direct properties or nested under session / decision
    const sessionObj = payload.session || payload;
    const sessionId = sessionObj.session_id || sessionObj.id || payload.session_id || "unknown";
    const rawDecision = (
      payload.decision ||
      payload.status ||
      sessionObj.status ||
      sessionObj.decision ||
      ""
    ).toString();

    // User ID is passed via vendor_data during session creation
    const userId = sessionObj.vendor_data || payload.vendor_data || payload.user_id;

    if (!userId) {
      console.warn("Didit webhook received without vendor_data/user_id:", sessionId);
      return NextResponse.json({ message: "No user id found in vendor_data, skipped" });
    }

    // Extract metadata
    const docInfo = payload.document || sessionObj.document || payload.extracted_data || {};
    const documentType = docInfo.type || docInfo.document_type || payload.document_type || null;
    const countryCode =
      docInfo.issuing_country || docInfo.country || payload.country_code || null;
    const declineReasons = payload.decline_reasons || payload.warnings || null;
    const nowIso = new Date().toISOString();

    // 3. Map status to profiles.kyc_status
    // "Approved" -> 'verified'
    // "In Review" -> 'pending'
    // "Declined" / "Expired" -> 'rejected'
    const lowerDecision = rawDecision.toLowerCase();
    let kycStatus: "verified" | "pending" | "rejected" = "pending";
    let fellowStatus: "completed" | "in_review" | "failed" = "in_review";

    if (lowerDecision.includes("approv") || lowerDecision.includes("success") || lowerDecision === "verified") {
      kycStatus = "verified";
      fellowStatus = "completed";
    } else if (
      lowerDecision.includes("declin") ||
      lowerDecision.includes("fail") ||
      lowerDecision.includes("reject") ||
      lowerDecision.includes("expir")
    ) {
      kycStatus = "rejected";
      fellowStatus = "failed";
    } else {
      kycStatus = "pending";
      fellowStatus = "in_review";
    }

    const adminClient = createAdminClient();

    // 4. Update auth user metadata
    try {
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: {
          kyc_status: kycStatus,
          didit_session_id: sessionId,
          kyc_verified_at: kycStatus === "verified" ? nowIso : null,
        },
      });
    } catch (e) {
      console.warn("Could not update auth user metadata:", e);
    }

    // 5. Update profiles table
    const profileUpdates: any = {
      kyc_status: kycStatus,
      didit_session_id: sessionId,
      kyc_verified_at: kycStatus === "verified" ? nowIso : null,
    };
    if (countryCode) {
      profileUpdates.country = countryCode;
      profileUpdates.country_code = countryCode;
    }

    try {
      await adminClient.from("profiles").update(profileUpdates).eq("id", userId);
    } catch (e) {
      console.warn("Could not update profiles table:", e);
    }

    // 6. Update fellow_onboarding_progress (Step 1 KYC)
    try {
      await adminClient.from("fellow_onboarding_progress").upsert({
        user_id: userId,
        step_id: "step_1_kyc",
        status: fellowStatus,
        score: kycStatus === "verified" ? 100 : null,
        submitted_payload: {
          sessionId,
          provider: "didit.me",
          decision: rawDecision,
          documentType,
          countryCode,
          processedAt: nowIso,
        },
        updated_at: nowIso,
      });
    } catch {
      // Non-fatal
    }

    // 7. Store / update kyc_verifications table
    try {
      await adminClient.from("kyc_verifications").upsert(
        {
          user_id: userId,
          session_id: sessionId,
          workflow_id: payload.workflow_id || sessionObj.workflow_id || "didit",
          status: kycStatus,
          decision: rawDecision,
          document_type: documentType,
          country_code: countryCode,
          vendor_data: userId,
          verified_at: kycStatus === "verified" ? nowIso : null,
          decline_reasons: declineReasons ? (Array.isArray(declineReasons) ? declineReasons : [String(declineReasons)]) : null,
          raw_payload: payload,
          updated_at: nowIso,
        },
        { onConflict: "session_id" }
      );
    } catch {
      // Fallback: try standard insert
      try {
        await adminClient.from("kyc_verifications").insert({
          user_id: userId,
          session_id: sessionId,
          workflow_id: payload.workflow_id || sessionObj.workflow_id || "didit",
          status: kycStatus,
          decision: rawDecision,
          document_type: documentType,
          country_code: countryCode,
          vendor_data: userId,
          verified_at: kycStatus === "verified" ? nowIso : null,
          raw_payload: payload,
          updated_at: nowIso,
        });
      } catch {
        // Table not yet migrated
      }
    }

    // 8. Dispatch notification to contributor
    try {
      const notifTitle =
        kycStatus === "verified"
          ? "Identity Verified! Onboarding Step 2 Unlocked"
          : kycStatus === "rejected"
          ? "Identity Verification Needs Attention"
          : "Identity Verification in Review";

      const notifBody =
        kycStatus === "verified"
          ? "Your Didit.me sovereign identity check has been approved. You may now complete your tax and payment setup."
          : kycStatus === "rejected"
          ? "Your identity document could not be automatically approved. Please retry verification or contact fellow support."
          : "Your Didit verification documents have been submitted and are under compliance review.";

      await adminClient.from("notifications").insert({
        user_id: userId,
        type: "admin_message",
        title: notifTitle,
        body: notifBody,
        href: "/dashboard",
      });
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      received: true,
      userId,
      kycStatus,
      sessionId,
    });
  } catch (error: any) {
    console.error("Didit webhook processing error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
