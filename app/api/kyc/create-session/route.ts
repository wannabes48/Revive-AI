import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      `${protocol}://${host}`;

    const clientId = process.env.DIDIT_CLIENT_ID;
    const clientSecret = process.env.DIDIT_CLIENT_SECRET;
    const workflowId = process.env.DIDIT_WORKFLOW_ID;

    let sessionId: string | null = null;
    let verificationUrl: string | null = null;

    // 1. If Didit.me credentials are configured, create real verification session
    if (clientId && clientSecret && workflowId && clientId !== "placeholder_client_id") {
      try {
        // Step A: Request Didit API token
        const tokenResponse = await fetch("https://apx.didit.me/auth/v2/token/", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          },
          body: new URLSearchParams({
            grant_type: "client_credentials",
          }),
        });

        if (!tokenResponse.ok) {
          const errText = await tokenResponse.text();
          console.error("Didit token request failed:", tokenResponse.status, errText);
          throw new Error(`Didit token error: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Step B: Create Verification Session with Didit
        const callbackUrl = `${appUrl}/dashboard?kyc_return=true`;
        const sessionResponse = await fetch("https://verification.didit.me/v2/session/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            vendor_data: user.id,
            callback: callbackUrl,
            workflow_id: workflowId,
          }),
        });

        if (!sessionResponse.ok) {
          const sessionErr = await sessionResponse.text();
          console.error("Didit session creation failed:", sessionResponse.status, sessionErr);
          throw new Error(`Didit session error: ${sessionResponse.status}`);
        }

        const sessionData = await sessionResponse.json();
        sessionId = sessionData.session_id || sessionData.id;
        verificationUrl = sessionData.url;
      } catch (err: any) {
        console.warn("Didit live API error, falling back to sandbox session:", err.message);
      }
    }

    // 2. Sandbox/Dev Fallback if Didit keys are not set or in local testing
    if (!sessionId || !verificationUrl) {
      sessionId = `didit_sandbox_${user.id.slice(0, 8)}_${Date.now()}`;
      verificationUrl = `${appUrl}/dashboard?kyc_return=true&didit_session=${sessionId}&sandbox=true`;
    }

    // 3. Update Supabase User & Profile
    const adminClient = createAdminClient();

    try {
      await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: {
          kyc_status: "pending",
          didit_session_id: sessionId,
        },
      });
    } catch (e) {
      console.warn("Could not update auth metadata:", e);
    }

    try {
      await adminClient
        .from("profiles")
        .update({
          kyc_status: "pending",
          didit_session_id: sessionId,
        })
        .eq("id", user.id);
    } catch (e) {
      console.warn("Could not update profile kyc_status:", e);
    }

    // 4. Update fellow onboarding checklist progress
    try {
      await adminClient.from("fellow_onboarding_progress").upsert({
        user_id: user.id,
        step_id: "step_1_kyc",
        status: "in_review",
        submitted_payload: {
          sessionId,
          provider: "didit.me",
          initiatedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Non-fatal if table not yet migrated
    }

    // 5. Store record in kyc_verifications table
    try {
      await adminClient.from("kyc_verifications").insert({
        user_id: user.id,
        session_id: sessionId,
        workflow_id: workflowId || "didit_default",
        status: "pending",
        decision: "In Review",
        vendor_data: user.id,
        raw_payload: {
          provider: "didit.me",
          url: verificationUrl,
          createdAt: new Date().toISOString(),
        },
      });
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      url: verificationUrl,
      session_id: sessionId,
      status: "pending",
    });
  } catch (error: any) {
    console.error("KYC create-session route error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
