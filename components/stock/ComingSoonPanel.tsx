"use client";

import { Construction } from "lucide-react";

type ComingSoonPanelProps = {
  label: string;
};

const ComingSoonPanel = ({ label }: ComingSoonPanelProps) => {
  return (
    <div className="bg-gray-800 border border-gray-600 rounded-xl p-12 flex flex-col items-center justify-center text-center gap-3">
      <Construction className="size-8 text-gray-600" />
      <p className="text-gray-300 font-medium">{label} isn&apos;t available yet</p>
      <p className="text-sm text-gray-500 max-w-sm">
        This tab is coming soon — we&apos;re still wiring up the data for it.
      </p>
    </div>
  );
};

export default ComingSoonPanel;
