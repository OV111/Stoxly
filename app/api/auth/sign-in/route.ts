import bcrypt from "bcrypt";
import { connectDB } from "@/lib/mongoose";
import User from "@/models/User";
import { signToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { normalizeEmail } from "@/lib/email";

// Generous enough that a person fumbling their password never notices,
// tight enough that online brute-forcing isn't practical.
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    await connectDB();
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);

    // Keyed on IP + email so one attacker can't lock a victim out of their
    // own account by burning the limit on it from elsewhere. Uses the
    // normalized address so varying the casing can't buy extra attempts.
    const limit = rateLimit(
      `sign-in:${getClientIp(request)}:${normalizedEmail}`,
      MAX_ATTEMPTS,
      WINDOW_MS,
    );
    if (!limit.ok) {
      return NextResponse.json(
        { message: "Too many sign-in attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
      );
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    if (!user.password) {
      // Point at the route that actually works, and at how to get a password.
      return NextResponse.json(
        {
          message:
            "This account uses Google sign-in. Continue with Google, then add a password in Settings if you'd like to use one.",
        },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    const token = await signToken({ id: user._id.toString(), email: user.email });

    const cookieStore = await cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json(
      { message: "Signed in", user: { id: user._id, name: user.name, email: user.email } },
      { status: 200 }
    );
  } catch (err) {
    console.error("[sign-in]", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
