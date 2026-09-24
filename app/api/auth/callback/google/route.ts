import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import User from "@/models/User";
import { signToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { GOOGLE_STATE_COOKIE } from "@/lib/oauth-state";
import { normalizeEmail } from "@/lib/email";

type GoogleTokenResponse = {
  access_token: string;
  id_token: string;
  error?: string;
};

type GoogleUserInfo = {
  sub: string;
  name: string;
  email: string;
  picture: string;
  email_verified?: boolean;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_STATE_COOKIE)?.value;
  // The state cookie is single-use: clear it no matter how this request ends,
  // so a captured value can't be replayed.
  cookieStore.delete(GOOGLE_STATE_COOKIE);

  if (error || !code) {
    return NextResponse.redirect(new URL("/sign-in?error=google_cancelled", request.url));
  }

  // Reject anything that didn't originate from our own /api/auth/google redirect.
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/sign-in?error=google_state", request.url));
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.APP_URL}/api/auth/callback/google`,
        grant_type: "authorization_code",
      }),
    });

    const tokenData: GoogleTokenResponse = await tokenRes.json();
    if (tokenData.error) {
      return NextResponse.redirect(new URL("/sign-in?error=google_failed", request.url));
    }

    // Get user info from Google
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser: GoogleUserInfo = await userRes.json();

    // An unverified Google address proves nothing about who owns that inbox,
    // so it must never be used to claim — or link into — a Stoxly account.
    if (googleUser.email_verified !== true) {
      return NextResponse.redirect(
        new URL("/sign-in?error=google_unverified", request.url)
      );
    }

    await connectDB();

    // Normalized so a differently-cased Google address still links to the
    // existing account rather than silently creating a duplicate.
    const email = normalizeEmail(googleUser.email);

    // Find by googleId first, then by email (linking existing accounts)
    let user = await User.findOne({ googleId: googleUser.sub });

    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        user.googleId = googleUser.sub;
        await user.save();
      } else {
        user = await User.create({
          name: googleUser.name,
          email,
          googleId: googleUser.sub,
        });
      }
    }

    const token = await signToken({ id: user._id.toString(), email: user.email });

    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.redirect(new URL("/", request.url));
  } catch {
    return NextResponse.redirect(new URL("/sign-in?error=google_failed", request.url));
  }
}
