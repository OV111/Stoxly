"use client";

import { motion } from "framer-motion";

import { Header } from "@/components/intelligence/Header";
import { WeeklyDebriefSection } from "@/components/intelligence/WeeklyDebriefSection";
import { PerformanceAttributionSection } from "@/components/intelligence/PerformanceAttributionSection";
import { ActiveInsightsSection } from "@/components/intelligence/ActiveInsightsSection";
import { BehavioralPatternsSection } from "@/components/intelligence/BehavioralPatternsSection";
import { AskYourPortfolioSection } from "@/components/intelligence/AskYourPortfolioSection";
import { WhatIfSection } from "@/components/intelligence/WhatIfSection";
import { PortfolioReportSection } from "@/components/intelligence/PortfolioReportSection";
import { TransactionEntrySection } from "@/components/intelligence/TransactionEntrySection";

export default function PortfolioIntelligencePage() {
  return (
    <div className="min-h-screen bg-[#0a0f0d] text-slate-200">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8"
      >
        <Header />

        <div className="mt-14 flex flex-col gap-16">
          <WeeklyDebriefSection />
          <PerformanceAttributionSection />
          <ActiveInsightsSection />
          <BehavioralPatternsSection />
          <AskYourPortfolioSection />
          <WhatIfSection />
          <PortfolioReportSection />
          <TransactionEntrySection />
        </div>
      </motion.div>
    </div>
  );
}