import Footer from "@/components/landing/Footer";
import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Summary from "@/components/landing/Summary";
import DotField from "@/components/DotField";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getCurrentUser();
  // if (!user) {
  //  redirect("/sign-in");
  // }

  return (
    <main className="relative overflow-hidden">
      {/* One backdrop spanning navbar (h-16) + hero (min-h-screen), so the
          dots run continuously behind the transparent nav. */}
      <div className="absolute top-0 left-0 w-full h-dvh -z-10">
        <DotField
          dotRadius={2}
          dotSpacing={20}
          bulgeStrength={120}
          glowRadius={200}
          gradientFrom="rgba(59, 130, 246, 0.4)"
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
