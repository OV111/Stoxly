import type { Metadata } from "next";
import Footer from "@/components/landing/Footer";
import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Summary from "@/components/landing/Summary";
import DotField from "@/components/DotField";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Stoxly",
  description:
    "See what actually happened to your investments. Stoxly replays your transaction ledger into true time-weighted and money-weighted returns, risk analytics, and portfolio explanations — not just a ticker dashboard.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Stoxly — Portfolio Intelligence Engine",
    description:
      "See what actually happened to your investments. Time-weighted and money-weighted returns, risk analytics, and real explanations — not just a ticker dashboard.",
    url: "/",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Stoxly",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "Stoxly is a portfolio intelligence engine that explains what happened to your investments, why, and how your risk has changed — powered by mathematically correct return and risk analytics.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default async function Home() {
  const user = await getCurrentUser();
  // if (!user) {
  //  redirect("/sign-in");
  // }

  return (
    <main className="relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* One backdrop spanning navbar (h-16) + hero (min-h-screen), so the
          dots run continuously behind the transparent nav. */}
      <div className="absolute top-0 left-0 w-full h-dvh -z-10">
        <DotField
          dotRadius={2}
          dotSpacing={20}
          bulgeStrength={120}
          glowRadius={200}
          gradientFrom="rgba(59, 130, 246, 0.3)"
          gradientTo="rgba(59, 130, 246, 0.18)"
          glowColor="#050505"
        />
      </div>

      <LandingNav user={user} />
      <Hero />
      <Features />
      <Summary />
      <Footer />
    </main>
  );
}
