import type { ReactNode } from "react";

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-medium text-slate-400">{children}</h2>;
}