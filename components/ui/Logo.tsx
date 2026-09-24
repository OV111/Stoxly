"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

type LogoProps = {
  iconSize?: string;
  /** Fade the wordmark to red alongside the icon on hover (used in the footer). */
  animateText?: boolean;
};

export const Logo = ({ iconSize = "size-5", animateText = false }: LogoProps) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href="/"
      className="flex items-center gap-2 w-fit"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative size-6">
        <AnimatePresence mode="wait">
          {hovered ? (
            <motion.span
              key="down"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <TrendingDown className={`text-red-500 ${iconSize}`} />
            </motion.span>
          ) : (
            <motion.span
              key="up"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <TrendingUp className={`text-[#3b82f6] ${iconSize}`} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {animateText ? (
        <motion.span
          animate={{ color: hovered ? "#ef4444" : "#ffffff" }}
          transition={{ duration: 0.2 }}
          className="text-xl font-bold"
        >
          Stoxly
        </motion.span>
      ) : (
        <p className="text-xl font-bold">Stoxly</p>
      )}
    </Link>
  );
};
