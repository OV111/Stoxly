import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://stoxly.app";
const siteDescription =
  "Stoxly is a portfolio intelligence engine that explains what happened to your investments, why, and how your risk has changed — powered by mathematically correct return and risk analytics.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Stoxly — Portfolio Intelligence",
    template: "%s | Stoxly",
  },
  description: siteDescription,
  openGraph: {
    type: "website",
    siteName: "Stoxly",
    title: "Stoxly — Portfolio Intelligence",
    description: siteDescription,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Stoxly — Portfolio Intelligence",
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${montserrat.variable} font-[family-name:var(--font-montserrat)] antialiased`}
      >
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
