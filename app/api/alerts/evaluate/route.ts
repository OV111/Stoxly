import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { evaluateAlerts } from "@/lib/alertEvaluator";

/**
 * Alert evaluator worker.
 *
 * GET is the cron entry point (see vercel.json) — Vercel Cron always fires a
 * GET request and can't hold a session cookie, so it's guarded by a shared
 * secret instead. POST is kept for manual triggering from the browser/Postman
 * while logged in.
 *
 * Auth reasoning: this is a system worker, not a user action — it evaluates
 * every user's alerts, so scoping it to a session user makes no sense. So the
 * real guard is a shared secret in the Authorization header. When CRON_SECRET
 * is unset (local dev) we fall back to requiring a logged-in user, so the
 * route is never wide open — failing closed in both configurations rather
 * than only in production.
 *
 * The evaluator itself is safe to call repeatedly: every state transition is a
 * conditional update, so a double-fired cron or a retry after a timeout cannot
 * produce a duplicate notification.
 */
async function handleEvaluate(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
  } else {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
  }

  const summary = await evaluateAlerts();
  return NextResponse.json(summary, { status: 200 });
}

export async function GET(request: Request) {
  try {
    return await handleEvaluate(request);
  } catch (err) {
    console.error("[alerts/evaluate:GET]", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return await handleEvaluate(request);
  } catch (err) {
    console.error("[alerts/evaluate:POST]", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
