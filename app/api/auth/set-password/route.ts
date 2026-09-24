import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { requireAuth } from "@/lib/auth";
import User from "@/models/User";

/**
 * Sets a first password on an account that has none — i.e. one created via
 * Google sign-in.
 *
 * Deliberately separate from /change-password rather than a branch inside it.
 * Each route then has exactly one precondition that is trivial to audit:
 *
 *   change-password → account HAS a password, and you must know it
 *   set-password    → account has NO password, and a valid session is the proof
 *
 * No `currentPassword` is asked for because there isn't one; the session
 * cookie is what proves the caller controls this account. The guard on
 * `user.password` below is what stops this becoming a way to overwrite an
 * existing password without knowing it.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { newPassword } = await request.json();
    if (!newPassword) {
      return NextResponse.json(
        { message: "New password is required" },
        { status: 400 }
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(auth.id);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // The security boundary for this route. An account that already has a
    // password must go through /change-password, which verifies the old one.
    if (user.password) {
      return NextResponse.json(
        { message: "This account already has a password. Use change password instead." },
        { status: 400 }
      );
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return NextResponse.json({ message: "Password set" }, { status: 200 });
  } catch (err) {
    console.error("[set-password]", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
