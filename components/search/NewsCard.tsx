"use client";

import { useState } from "react";
import { Plus, Check, Building2, Coins, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Instrument, InstrumentType } from "@/types/search";

interface InstrumentCardProps {
  /** The instrument to display */
  instrument: Instrument;
  /** Whether the instrument is already in the watchlist */
  isAdded?: boolean;
  /** Called when the user clicks "Add" */
  onAdd?: (instrument: Instrument) => Promise<void> | void;
  /** Compact mode for dropdown lists */
  compact?: boolean;
  className?: string;
}

const typeConfig: Record<InstrumentType, { label: string; icon: React.ReactNode; color: string }> = {
  stock: {
    label: "Stock",
    icon: <Building2 className="h-3 w-3" />,
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  crypto: {
    label: "Crypto",
    icon: <Coins className="h-3 w-3" />,
    color: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  etf: {
    label: "ETF",
    icon: <TrendingUp className="h-3 w-3" />,
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  index: {
    label: "Index",
    icon: <TrendingUp className="h-3 w-3" />,
    color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  },
};

export function InstrumentCard({
  instrument,
  isAdded = false,
  onAdd,
  compact = false,
  className,
}: InstrumentCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(isAdded);

  const config = typeConfig[instrument.type] || typeConfig.stock;

  const handleAdd = async () => {
    if (added || isAdding || !onAdd) return;

    setIsAdding(true);
    try {
      await onAdd(instrument);
      setAdded(true);
    } catch (error) {
      console.error("[InstrumentCard] Add failed:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card className={cn(
      "border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-200",
      compact ? "py-1.5 px-3" : "py-3 px-4",
      className
    )}>
      <CardContent className={cn("p-0 flex items-center justify-between gap-3", compact ? "gap-2" : "")}>
        {/* Left: Logo + Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Logo / Fallback Icon */}
          {instrument.logo ? (
            <img
              src={instrument.logo}
              alt={`${instrument.symbol} logo`}
              className={cn(
                "rounded-full object-cover flex-shrink-0",
                compact ? "h-6 w-6" : "h-8 w-8"
              )}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className={cn(
              "rounded-full flex items-center justify-center flex-shrink-0",
              config.color,
              compact ? "h-6 w-6" : "h-8 w-8"
            )}>
              {config.icon}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">
                {instrument.symbol}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-normal px-1.5 py-0 h-4",
                  config.color
                )}
              >
                {config.label}
              </Badge>
              {instrument.exchange && !compact && (
                <span className="text-xs text-muted-foreground truncate">
                  • {instrument.exchange}
                </span>
              )}
            </div>
            <p className={cn(
              "text-muted-foreground truncate",
              compact ? "text-xs" : "text-sm"
            )}>
              {instrument.name}
            </p>
          </div>
        </div>

        {/* Right: Add Button */}
        {onAdd && (
          <Button
            size={compact ? "sm" : "default"}
            variant={added ? "outline" : "default"}
            className={cn(
              "flex-shrink-0 transition-all",
              added && "text-green-500 border-green-500/50 hover:text-green-600",
              compact ? "h-7 px-2 text-xs" : "h-8 px-3 text-sm"
            )}
            onClick={handleAdd}
            disabled={added || isAdding}
          >
            {isAdding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : added ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1" />
                Added
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}