"use client";

import { useState } from "react";
import type { CreateInvestmentNoteInput } from "@/types/journal";
import { capitalizeFirst } from "@/lib/journal/format";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateInvestmentNoteInput) => Promise<void>;
};

export default function AddNoteDialog({ isOpen, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [symbol, setSymbol] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);

      await onSubmit({
        title: title.trim() || undefined,
        symbol: symbol.trim().toUpperCase() || undefined,
        content: content.trim(),
        tags: tags.length > 0 ? tags : undefined,
      });

      setTitle("");
      setSymbol("");
      setContent("");
      setTagsInput("");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h2 className="text-xs font-bold text-blue-400 tracking-widest uppercase">
            Create Note
          </h2>
          <button onClick={onClose} className="cursor-pointer text-gray-500 hover:text-gray-300 text-sm">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-mono text-gray-400 mb-1">Title</label>
              <input
                type="text"
                placeholder="Note title..."
                value={title}
                onChange={(e) => setTitle(capitalizeFirst(e.target.value))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">Symbol</label>
              <input
                type="text"
                placeholder="BTC,AAPL,NVDA..."
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-200 uppercase font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-gray-400 mb-1">Content</label>
            <textarea
              required
              rows={4}
              placeholder="Market observations, earnings notes, thoughts..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-gray-400 mb-1">Tags (comma separated)</label>
            <input
              type="text"
              placeholder="macro, news, research"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-blue-500 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}