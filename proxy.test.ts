import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";

// proxy.ts reads JWT_SECRET at import time, so it must be set before the import.
const SECRET = "test-secret-at-least-32-characters-long!!";
process.env.JWT_SECRET = SECRET;

const { proxy } = await import("./proxy");

function request(token?: string) {
  return new NextRequest("http://localhost/dashboard", {
    headers: token ? { cookie: `token=${token}` } : {},
  });
}

async function validToken() {
  return new SignJWT({ id: "user-1", email: "a@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(SECRET));
}

describe("proxy (route protection)", () => {
  it("redirects to /sign-in when there is no session cookie", async () => {
    const res = await proxy(request());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/sign-in");
  });

  it("lets a request with a valid token through", async () => {
    const res = await proxy(request(await validToken()));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects and clears the cookie when the token is invalid", async () => {
    const res = await proxy(request("not-a-jwt"));
    expect(res.headers.get("location")).toBe("http://localhost/sign-in");
    expect(res.headers.get("set-cookie")).toMatch(/token=;/);
  });
});
