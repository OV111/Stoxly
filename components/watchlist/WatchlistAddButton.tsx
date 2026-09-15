"use client";

import { Plus } from "lucide-react";
import React from "react";
interface WatchlistAddButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function WatchlistAddButton({ ...props }: WatchlistAddButtonProps) {
  return (
    <button
      {...props}
      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-400/10 px-3 py-1.5 text-xs font-medium text-teal-400 ring-1 ring-teal-400/20 transition-all hover:bg-teal-400/20 hover:ring-teal-400/40 active:scale-95"
    >
      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
      Add symbol
    </button>
  );
}