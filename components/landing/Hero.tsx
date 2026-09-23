"use client";

import { useEffect, useRef } from "react";
import {
  useMotionValue,
  useTransform,
  useInView,
  animate,
  motion,
} from "framer-motion";
import TrueFocus from "@/components/TrueFocus";
import LogoLoop from "@/components/LogoLoop";
import GradientText from "@/components/GradientText";
import { companies } from "@/components/landing/companies";

const CountUp = ({
  target,
  suffix = "+",
}: {
  target: number;
  suffix?: string;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const count = useMotionValue(0);
  const formatted = useTransform(count, (v) =>
    target >= 1000000
      ? `${Math.round(v / 1000000)}M${suffix}`
      : `${Math.floor(v)}${suffix}`,
  );

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(count, target, { duration: 2, ease: "easeOut" });
    return () => controls.stop();
  }, [isInView, target]);

  return <motion.span ref={ref}>{formatted}</motion.span>;
};

const Hero = () => {
  return (
    <section className="relative flex flex-col items-center text-center px-6 h-[calc(100dvh-4rem)] overflow-hidden">
      <div className="flex flex-1 pb-20 flex-col items-center justify-center gap-8 sm:gap-10 min-h-0">
        <h1 className="flex flex-col items-center gap-3">
          <GradientText
            colors={["#ffffff", "#3b82f6", "#60a5fa", "#ffffff"]}
            animationSpeed={6}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-[78px] font-bold w-full"
          >
            Track Your Personal
          </GradientText>
          <TrueFocus
            sentence="Stocks Portfolio CryptoAssets Markets"
            borderColor="#3b82f6"
            glowColor="rgba(59, 130, 246, 0.4)"
            animationDuration={0.5}
            pauseBetweenAnimations={1.5}
            textClassName="bg-gradient-to-br from-blue-100 via-blue-400 to-blue-600 bg-clip-text text-transparent"
          />
        </h1>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-4 sm:gap-x-8 text-sm">
          <div className="flex flex-col items-center gap-1">
            <span className="text-gray-100 font-bold text-xl sm:text-2xl">
              <CountUp target={500} />
            </span>
            <span className="text-gray-400">Stocks Tracked</span>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-gray-100 font-bold text-xl sm:text-2xl">
              <CountUp target={150} />
            </span>
            <span className="text-gray-400">Markets Covered</span>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-gray-100 font-bold text-xl sm:text-2xl">
              <CountUp target={1000000} />
            </span>
            <span className="text-gray-400">Data Points Daily</span>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-gray-100 font-bold text-xl sm:text-2xl">
              <CountUp target={200} />
            </span>
            <span className="text-gray-400">Crypto Assets</span>
          </div>
        </div>
      </div>

      <div className="w-full shrink-0 pb-2 sm:pb-2">
        <LogoLoop
          logos={companies}
          speed={80}
          direction="left"
          logoHeight={28}
          gap={48}
          pauseOnHover
          fadeOut
          fadeOutColor="rgba(0,0,0,80)"
        />
      </div>
    </section>
  );
};

export default Hero;
