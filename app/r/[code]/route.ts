import { NextResponse } from "next/server";
import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_MAX_AGE,
  normalizeReferralCode,
} from "@/lib/referrals";

/**
 * Referral links look like https://joinreviveai.com/r/<CODE>.
 * The code is kept in a cookie for 30 days so the credit survives browsing
 * before signup. An invalid code is ignored; the visitor still reaches signup.
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const res = NextResponse.redirect(new URL("/signup", req.url));
  const normalized = normalizeReferralCode(code);
  if (normalized) {
    res.cookies.set(REFERRAL_COOKIE, normalized, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: REFERRAL_COOKIE_MAX_AGE,
      path: "/",
    });
  }
  return res;
}
