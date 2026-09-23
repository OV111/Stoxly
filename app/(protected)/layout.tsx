import type { Metadata } from "next";
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

  return (
    <>
      <LandingNav user={user} />
      <div className="pt-20">{children}</div>
    </>
  );
}
