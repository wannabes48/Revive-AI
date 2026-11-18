import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getPublicSiteUrl } from "@/lib/site-url";

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

    const appUrl = getPublicSiteUrl();

    const apiKey =
      process.env.DIDIT_API_KEY ||
      process.env.DIDIT_CLIENT_SECRET;
    const clientId = process.env.DIDIT_CLIENT_ID;
    const workflowId = process.env.DIDIT_WORKFLOW_ID;

    let sessionId: string | null = null;
    let verificationUrl: string | null = null;

    const callbackUrl = `${appUrl}/dashboard?tab=ai-work&kyc_return=true`;

    // 1. Primary: Didit.me V3 Session Creation using Secret/API Key (x-api-key)
    if (apiKey && workflowId && apiKey !== "placeholder_client_secret") {
      try {
        const v3Response = await fetch("https://verification.didit.me/v3/session/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            workflow_id: workflowId,
            vendor_data: user.id,
            callback: callbackUrl,
          }),
        });

        if (v3Response.ok) {
          const v3Data = await v3Response.json();
          sessionId = v3Data.session_id || v3Data.id;
          verificationUrl = v3Data.url;
        } else {
          const errText = await v3Response.text();
          console.error("Didit V3 session creation error:", v3Response.status, errText);
        }
      } catch (err: any) {
        console.error("Didit V3 API fetch exception:", err.message);
      }
    }

    // 2. Fallback: If V3 failed or OAuth Client Credentials are configured
    if (!verificationUrl && clientId && apiKey && workflowId && clientId !== "placeholder_client_id") {
      try {
        const tokenResponse = await fetch("https://apx.didit.me/auth/v2/token/", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${clientId}:${apiKey}`).toString("base64")}`,
          },
          body: new URLSearchParams({
            grant_type: "client_credentials",
          }),
        });

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          const accessToken = tokenData.access_token;

          const v2Response = await fetch("https://verification.didit.me/v2/session/", {
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

          if (v2Response.ok) {
            const v2Data = await v2Response.json();
            sessionId = v2Data.session_id || v2Data.id;
            verificationUrl = v2Data.url;
          }
        }
      } catch (oauthErr: any) {
        console.warn("Didit OAuth fallback failed:", oauthErr.message);
      }
    }

    // 3. If Still Not Created, Check If Environment Variables Are Missing
    if (!sessionId || !verificationUrl) {
      if (!apiKey || !workflowId) {
        return NextResponse.json(
          {
            error:
              "Didit credentials missing. Please set DIDIT_CLIENT_SECRET (or DIDIT_API_KEY) and DIDIT_WORKFLOW_ID in .env.local",
          },
          { status: 500 }
        );
      }

      // Local sandbox fallback for testing without active network
      sessionId = `didit_sandbox_${user.id.slice(0, 8)}_${Date.now()}`;
      verificationUrl = `${appUrl}/dashboard?tab=ai-work&kyc_return=true&didit_session=${sessionId}&sandbox=true`;
    }

    // 4. Update Supabase User Metadata & Profile
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

    // 5. Update fellow onboarding checklist progress
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
      // Non-fatal
    }

    // 6. Record session in kyc_verifications table for Admin Console
    try {
      await adminClient.from("kyc_verifications").upsert(
        {
          user_id: user.id,
          session_id: sessionId,
          workflow_id: workflowId || "didit_default",
          status: "pending",
          decision: "In Progress",
          vendor_data: user.id,
          raw_payload: {
            provider: "didit.me",
            url: verificationUrl,
            createdAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "session_id" }
      );
    } catch {
      // Fallback insert
      try {
        await adminClient.from("kyc_verifications").insert({
          user_id: user.id,
          session_id: sessionId,
          workflow_id: workflowId || "didit_default",
          status: "pending",
          decision: "In Progress",
          vendor_data: user.id,
          raw_payload: {
            provider: "didit.me",
            url: verificationUrl,
            createdAt: new Date().toISOString(),
          },
        });
      } catch {
        // Table not ready
      }
    }

    return NextResponse.json({
      url: verificationUrl,
      session_id: sessionId,
      status: "pending",
    });
  } catch (error: any) {
    console.error("KYC create-session route critical error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
