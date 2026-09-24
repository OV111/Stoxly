import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LandingNav from "@/components/landing/LandingNav";
import { getCurrentUser } from "@/lib/getCurrentUser";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function RootGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  // Every page in this route group inherits this layout, so this is the
  // guarantee that an unauthenticated visitor never sees protected content —
  // the middleware matcher is just the faster path to the same outcome.
  if (!user) redirect("/sign-in");

  return (
    <>
      <LandingNav user={user} />
      <div className="pt-20">{children}</div>
    </>
  );
}
