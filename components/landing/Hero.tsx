"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import TryDemoButton from "@/components/ui/TryDemoButton";
import HeroPreview from "@/components/landing/HeroPreview";
import TickerTape from "@/components/landing/TickerTape";

const Hero = ({ signedIn }: { signedIn: boolean }) => {
  const reduceMotion = useReducedMotion();

  // One gentle entrance, staggered; skipped entirely for reduced motion.
  const fadeUp = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section className="relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden">
      <div className="container flex flex-1 flex-col items-center gap-14 py-12 sm:py-16 lg:flex-row lg:gap-16 lg:py-10">
        {/* Copy */}
        <div className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left">
          <motion.span
            {...fadeUp(0)}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300"
          >
            <span className="size-1.5 rounded-full bg-blue-400" />
            Portfolio intelligence engine
          </motion.span>

          <motion.h1
            {...fadeUp(0.08)}
            className="max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            See what{" "}
            <span className="bg-gradient-to-r from-blue-300 via-blue-400 to-blue-600 bg-clip-text text-transparent">
              actually happened
            </span>{" "}
            to your investments.
          </motion.h1>

          <motion.p
            {...fadeUp(0.16)}
            className="mt-6 max-w-xl text-base leading-relaxed text-gray-500 sm:text-lg"
          >
            Stoxly replays your transaction ledger into true time-weighted and
            money-weighted returns, risk analytics, and plain-English
            explanations — not just another ticker dashboard.
          </motion.p>

          <motion.div
            {...fadeUp(0.24)}
            className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
          >
            {signedIn ? (
              <Button asChild size="lg" className="h-11 px-5 text-sm">
                <Link href="/dashboard">
                  Open dashboard
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="h-11 px-5 text-sm">
                  <Link href="/sign-up">
                    Get started free
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <TryDemoButton className="h-11 px-5 text-sm" />
              </>
            )}
          </motion.div>

          {!signedIn && (
            <motion.p
              {...fadeUp(0.3)}
              className="mt-4 text-xs text-gray-500"
            >
              Free to start · The demo needs no signup
            </motion.p>
          )}
        </div>

        {/* Product preview */}
        <motion.div
          {...(reduceMotion
            ? {}
            : {
                initial: { opacity: 0, y: 24, scale: 0.98 },
                animate: { opacity: 1, y: 0, scale: 1 },
                transition: {
                  duration: 0.8,
                  delay: 0.2,
                  ease: [0.22, 1, 0.36, 1] as const,
                },
              })}
          className="flex w-full flex-1 justify-center lg:justify-end"
        >
          <HeroPreview />
        </motion.div>
      </div>

      <div className="w-full shrink-0 pb-4">
        <p className="mb-4 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-gray-500">
          Live across the market
        </p>
        <TickerTape signedIn={signedIn} />
      </div>
    </section>
  );
};

export default Hero;
