"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import UserMenu from "@/components/ui/UserMenu";
import TryDemoButton from "@/components/ui/TryDemoButton";
import { navbarItems } from "@/lib/constants";
import type { CurrentUser } from "@/lib/getCurrentUser";

import { Search } from "lucide-react";

const LandingNav = ({ user }: { user: CurrentUser | null }) => {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="top-0 left-0 right-0 z-50 w-full h-16 flex items-center justify-between px-4 sm:px-6 bg-transparent">
      <Link
        href="/"
        className="flex cursor-pointer items-center gap-2"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="relative size-5">
          <AnimatePresence mode="wait">
            {hovered ? (
              <motion.span
                key="down"
                initial={{ opacity: 0, y: -5, rotate: -10 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                <TrendingDown className="text-red-500 size-5" />
              </motion.span>
            ) : (
              <motion.span
                key="up"
                initial={{ opacity: 0, y: 5, rotate: 10 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                <TrendingUp className="text-[#3b82f6] size-5" />
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <p className="text-xl font-bold">Stoxly</p>
      </Link>

      <div className="cursor-pointer  flex items-center gap-2 sm:gap-3">
        {user ? (
          <>
            {/* Desktop: links inline. Hidden below md, where they'd overflow. */}
            <ul className="hidden md:flex items-center gap-4 mr-2">
              {navbarItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="cursor-pointer text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
            </Link>
            <UserMenu name={user.name} email={user.email} />
          </>
        ) : (
          <>
            {/* Sign In is redundant on mobile once the menu exists — the
                primary CTA is what matters at that width. */}
            <TryDemoButton size="lg" className="hidden sm:inline-flex" />
            <Link href="/sign-in" className="hidden sm:block">
              <Button variant="ghost" size="lg" className="cursor-pointer">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up" className="hidden sm:block">
              <Button size="lg" className="cursor-pointer">
                Get Started
              </Button>
            </Link>
          </>
        )}

        {/* Hamburger: only below the breakpoint where the full nav fits. */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-menu"
          className={`${user ? "md:hidden" : "sm:hidden"} cursor-pointer p-2 -mr-2 text-gray-300 hover:text-white transition-colors`}
        >
          {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="landing-mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className={`${user ? "md:hidden" : "sm:hidden"} absolute top-16 left-0 w-full border-b border-white/10 bg-black/90 backdrop-blur-md px-4 py-4`}
          >
            {user ? (
              <ul className="flex flex-col gap-1">
                {navbarItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="block cursor-pointer rounded-md px-2 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col gap-2">
                <TryDemoButton
                  size="lg"
                  fullWidth
                  onNavigate={() => setMenuOpen(false)}
                />
                <Link href="/sign-in" onClick={() => setMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-full cursor-pointer"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up" onClick={() => setMenuOpen(false)}>
                  <Button size="lg" className="w-full cursor-pointer">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default LandingNav;
