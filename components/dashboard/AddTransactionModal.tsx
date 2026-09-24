"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TransactionType =
  | "BUY"
  | "SELL"
  | "DIVIDEND"
  | "SPLIT"
  | "DEPOSIT"
  | "WITHDRAWAL";
type Currency = "USD" | "AMD" | "EUR" | "CNY" | "GBP";

const TRANSACTION_TYPES: TransactionType[] = [
  "BUY",
  "SELL",
  "DIVIDEND",
  "SPLIT",
  "DEPOSIT",
  "WITHDRAWAL",
];

const CURRENCIES: Currency[] = ["USD", "AMD", "EUR", "CNY", "GBP"];

// Cash-only transactions (no symbol/quantity/price involved).
const CASH_TYPES: TransactionType[] = ["DEPOSIT", "WITHDRAWAL"];

const todayISODate = () => new Date().toISOString().slice(0, 10);

const buildInitialFormState = (defaultSymbol?: string) => ({
  symbol: defaultSymbol ?? "",
  type: "BUY" as TransactionType,
  quantity: "",
  pricePerUnit: "",
  fees: "",
  currency: "USD" as Currency,
  fxRateToBase: "1",
  occurredAt: todayISODate(),
});

type AddTransactionModalProps = {
  /** Pre-fills the symbol field — used when opened from a specific stock page. */
  defaultSymbol?: string;
  /** Custom trigger element (e.g. a smaller button on the stock page). Defaults
   * to the standard dashboard "+ Add Transaction" button when omitted. */
  trigger?: React.ReactNode;
};

const AddTransactionModal = ({
  defaultSymbol,
  trigger,
}: AddTransactionModalProps = {}) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => buildInitialFormState(defaultSymbol));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isCashType = CASH_TYPES.includes(form.type);

  const resetForm = () => {
    setForm(buildInitialFormState(defaultSymbol));
    setError(null);
    setSuccess(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      // Give the close animation a beat before wiping state.
      setTimeout(resetForm, 150);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      const body = {
        symbol: isCashType ? null : form.symbol.trim() || null,
        type: form.type,
        quantity: form.quantity,
        pricePerUnit: form.pricePerUnit || "0",
        fees: form.fees || "0",
        currency: form.currency,
        fxRateToBase: form.fxRateToBase || "1",
        occurredAt: form.occurredAt,
      };

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to add transaction.");
      }

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            size="sm"
            className="bg-teal-400/10 text-teal-400 border border-teal-400/30 hover:bg-teal-400/20"
          >
            <Plus className="size-3.5" />
            Add Transaction
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-gray-950 border border-gray-800 text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-gray-100">Add Transaction</DialogTitle>
          <DialogDescription className="text-gray-500">
            Log a buy, sell, dividend, split, deposit, or withdrawal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-gray-500 tracking-wide uppercase">
                Type
              </Label>
              <Select
                value={form.type}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, type: value as TransactionType }))
                }
              >
                <SelectTrigger className="w-full bg-gray-900 border-gray-700 text-gray-100 font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  className="bg-gray-900 border-gray-700 text-gray-100 w-[var(--radix-select-trigger-width)]"
                  position="popper"
                >
                  {TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-gray-500 tracking-wide uppercase">
                Currency
              </Label>
              <Select
                value={form.currency}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, currency: value as Currency }))
                }
              >
                <SelectTrigger className="w-full bg-gray-900 border-gray-700 text-gray-100 font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  className="bg-gray-900 border-gray-700 text-gray-100 w-[var(--radix-select-trigger-width)]"
                  position="popper"
                >
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isCashType && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-gray-500 tracking-wide uppercase">
                Symbol
              </Label>
              <Input
                value={form.symbol}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    symbol: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="AAPL"
                required={!isCashType}
                className="bg-gray-900 border-gray-700 text-gray-100 font-mono"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-gray-500 tracking-wide uppercase">
                Quantity
              </Label>
              <Input
                type="number"
                step="any"
                min="0"
                value={form.quantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quantity: e.target.value }))
                }
                placeholder="0.00"
                required
                className="bg-gray-900 border-gray-700 text-gray-100 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-gray-500 tracking-wide uppercase">
                Price / Unit
              </Label>
              <Input
                type="number"
                step="any"
                min="0"
                value={form.pricePerUnit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pricePerUnit: e.target.value }))
                }
                placeholder="0.00"
                disabled={isCashType}
                required={!isCashType}
                className="bg-gray-900 border-gray-700 text-gray-100 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-gray-500 tracking-wide uppercase">
                Fees
              </Label>
              <Input
                type="number"
                step="any"
                min="0"
                value={form.fees}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fees: e.target.value }))
                }
                placeholder="0.00"
                className="bg-gray-900 border-gray-700 text-gray-100 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-semibold text-gray-500 tracking-wide uppercase">
                Occurred At
              </Label>
              <Input
                type="date"
                value={form.occurredAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, occurredAt: e.target.value }))
                }
                required
                className="bg-gray-900 border-gray-700 text-gray-100 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm font-mono text-red-500 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm font-mono text-teal-400 border border-teal-400/30 bg-teal-400/10 rounded-lg px-3 py-2">
              Transaction added.
            </p>
          )}

          <DialogFooter className="bg-transparent border-none p-0 mt-1">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-teal-400/10 text-teal-400 border border-teal-400/30 hover:bg-teal-400/20 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionModal;
