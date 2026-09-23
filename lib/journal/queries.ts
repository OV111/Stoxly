import { InvestmentDecision } from "@/models/InvestmentDecision";
import { InvestmentNote } from "@/models/InvestmentNote";
import type { JournalEntry } from "@/types/journal";

type GetJournalEntriesParams = {
  userId: string;
  type?: "DECISION" | "NOTE";
  symbol?: string;
  limit?: number;
  before?: Date;
};

export async function getJournalEntries({
  userId,
  type,
  symbol,
  limit = 50,
  before,
}: GetJournalEntriesParams): Promise<JournalEntry[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  const baseFilter = {
    userId,
    ...(symbol ? { symbol: symbol.toUpperCase() } : {}),
    ...(before ? { createdAt: { $lt: before } } : {}),
  };

  let entries: JournalEntry[] = [];

  if (!type || type === "DECISION") {
    const decisions = await InvestmentDecision.find(baseFilter)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean();

    entries.push(
      ...decisions.map((doc) => ({
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        type: "DECISION" as const,
        assetId: doc.assetId?.toString(),
        symbol: doc.symbol,
        title: doc.title,
        action: doc.action,
        thesis: doc.thesis,
        expectation: doc.expectation,
        timeHorizon: doc.timeHorizon,
        confidence: doc.confidence,
        invalidationCondition: doc.invalidationCondition,
        transactionId: doc.transactionId?.toString(),
        tags: doc.tags,
        reflection: doc.reflection,
        reflectionCreatedAt: doc.reflectionCreatedAt?.toISOString(),
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      }))
    );
  }

  if (!type || type === "NOTE") {
    const notes = await InvestmentNote.find(baseFilter)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean();

    entries.push(
      ...notes.map((doc) => ({
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        type: "NOTE" as const,
        assetId: doc.assetId?.toString(),
        symbol: doc.symbol,
        title: doc.title,
        content: doc.content,
        tags: doc.tags,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      }))
    );
  }

  return entries
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, safeLimit);
}

export async function getJournalEntry({
  entryId,
  userId,
}: {
  entryId: string;
  userId: string;
}): Promise<JournalEntry | null> {
  const decision = await InvestmentDecision.findOne({
    _id: entryId,
    userId,
  }).lean();

  if (decision) {
    return {
      _id: decision._id.toString(),
      userId: decision.userId.toString(),
      type: "DECISION" as const,
      assetId: decision.assetId?.toString(),
      symbol: decision.symbol,
      title: decision.title,
      action: decision.action,
      thesis: decision.thesis,
      expectation: decision.expectation,
      timeHorizon: decision.timeHorizon,
      confidence: decision.confidence,
      invalidationCondition: decision.invalidationCondition,
      transactionId: decision.transactionId?.toString(),
      tags: decision.tags,
      reflection: decision.reflection,
      reflectionCreatedAt: decision.reflectionCreatedAt?.toISOString(),
      createdAt: decision.createdAt.toISOString(),
      updatedAt: decision.updatedAt.toISOString(),
    };
  }

  const note = await InvestmentNote.findOne({
    _id: entryId,
    userId,
  }).lean();

  if (note) {
    return {
      _id: note._id.toString(),
      userId: note.userId.toString(),
      type: "NOTE" as const,
      assetId: note.assetId?.toString(),
      symbol: note.symbol,
      title: note.title,
      content: note.content,
      tags: note.tags,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  return null;
}