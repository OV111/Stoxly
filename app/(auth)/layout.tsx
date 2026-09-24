import type { Metadata } from "next";

// Auth pages are client components, so each one sets its own title from a
// small sibling layout. This group layout only carries what they all share.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
