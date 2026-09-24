import { ReactNode } from "react";

type PanelProps = {
  title: string;
  slot?: string;
  meta?: string;
  /** Trailing control in the header, e.g. a refresh button. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

const Panel = ({ title, slot, meta, action, children, className = "" }: PanelProps) => {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold text-blue-400 tracking-widest">{title}</h2>
          {slot && (
            <span className="text-[10px] font-mono text-gray-500 bg-gray-800/80 border border-gray-700 rounded px-1.5 py-0.5">
              {slot}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {meta && <span className="text-[11px] font-mono text-gray-500">{meta}</span>}
          {action}
        </div>
      </div>
      {children}
    </div>
  );
};

export default Panel;
