import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/sign-in", request.url));
    response.cookies.delete("token");
    return response;
  }
}

// Must list every top-level segment under `app/(protected)/`. Route groups
// like `(protected)` don't appear in the URL, so they can't be matched here —
// the list has to be kept in sync by hand. `app/(protected)/layout.tsx` also
// redirects unauthenticated users, so a missed entry here costs a slower
// redirect rather than exposing the page.
export const config = {
  matcher: [
    "/ai/:path*",
    "/alerts/:path*",
    "/billing/:path*",
    "/crypto/:path*",
    "/dashboard/:path*",
    "/intelligence/:path*",
    "/journal/:path*",
    "/news/:path*",
    "/profile/:path*",
    "/search/:path*",
    "/settings/:path*",
    "/stock/:path*",
    "/watchlist/:path*",
  ],
};
