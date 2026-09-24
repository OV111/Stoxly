import crypto from "crypto";
import { NextResponse } from "next/server";
import { GOOGLE_STATE_COOKIE } from "@/lib/oauth-state";

export async function GET() {
  // Single-use random value tied to this browser via an httpOnly cookie.
  // The callback refuses any response whose `state` doesn't match, which is
  // what prevents an attacker from completing their own Google login inside
  // the victim's browser and binding it to the victim's session (login CSRF).
  const state = crypto.randomBytes(32).toString("hex");

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.APP_URL}/api/auth/callback/google`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );

  response.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // `lax` still sends the cookie on the top-level GET navigation Google
    // makes back to the callback, which is all this needs to survive.
    sameSite: "lax",
    maxAge: 60 * 10, // only needs to outlive the round trip
    path: "/",
  });

  return response;
}
