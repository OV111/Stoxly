import bcrypt from "bcrypt";
import { connectDB } from "@/lib/mongoose";
import User from "@/models/User";
import { signToken } from "@/lib/auth";
import { normalizeEmail } from "@/lib/email";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    await connectDB();
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      // Naming the method turns a dead end into an instruction. This leaks no
      // more than the plain "already in use" reply above it already does.
      const message =
        existing.googleId && !existing.password
          ? "You already have an account with this email through Google. Use \"Continue with Google\" to sign in."
          : "Email already in use";
      return NextResponse.json({ message }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ name, email: normalizedEmail, password: hashedPassword });
    await user.save();

    // Creating the account is proof enough of identity — issue the same
    // session sign-in would, so the new user lands logged in instead of
    // being bounced to the sign-in form to retype what they just chose.
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
      {
        message: "Account created",
        user: { id: user._id, name: user.name, email: user.email },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[sign-up]", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
