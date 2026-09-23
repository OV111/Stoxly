import mongoose from "mongoose";
import { InvestmentDecision } from "@/models/InvestmentDecision";
import { InvestmentNote } from "@/models/InvestmentNote";
import type {
  CreateInvestmentDecisionInput,
  CreateInvestmentNoteInput,
  UpdateInvestmentDecisionInput,
  UpdateInvestmentNoteInput,
} from "@/types/journal";

function toObjectId(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid ID");
  }
  return new mongoose.Types.ObjectId(id);
}

export async function createInvestmentDecision(
  userId: string,
  input: CreateInvestmentDecisionInput,
) {
  return InvestmentDecision.create({
    userId: toObjectId(userId),
    type: "DECISION",
    assetId: input.assetId ? toObjectId(input.assetId) : undefined,
    symbol: input.symbol?.toUpperCase(),
    title: input.title?.trim(),
    action: input.action,
    thesis: input.thesis?.trim(),
    expectation: input.expectation?.trim(),
    timeHorizon: input.timeHorizon,
    confidence: input.confidence,
    invalidationCondition: input.invalidationCondition?.trim(),
    transactionId: input.transactionId
      ? toObjectId(input.transactionId)
      : undefined,
    tags: input.tags ?? [],
  });
}

export async function createInvestmentNote(
  userId: string,
  input: CreateInvestmentNoteInput,
) {
  return InvestmentNote.create({
    userId: toObjectId(userId),
    type: "NOTE",
    assetId: input.assetId ? toObjectId(input.assetId) : undefined,
    symbol: input.symbol?.toUpperCase(),
    title: input.title?.trim(),
    content: input.content.trim(),
    tags: input.tags ?? [],
  });
}

export async function updateInvestmentDecision(
  userId: string,
  decisionId: string,
  input: UpdateInvestmentDecisionInput,
) {
  const update = {
    ...(input.title !== undefined && { title: input.title.trim() }),
    ...(input.action !== undefined && { action: input.action }),
    ...(input.thesis !== undefined && { thesis: input.thesis.trim() }),
    ...(input.expectation !== undefined && {
      expectation: input.expectation.trim(),
    }),
    ...(input.timeHorizon !== undefined && { timeHorizon: input.timeHorizon }),
    ...(input.confidence !== undefined && { confidence: input.confidence }),
    ...(input.invalidationCondition !== undefined && {
      invalidationCondition: input.invalidationCondition.trim(),
    }),
    ...(input.tags !== undefined && { tags: input.tags }),
    ...(input.reflection !== undefined && {
      reflection: input.reflection.trim(),
      reflectionCreatedAt: new Date(),
    }),
  };

  return InvestmentDecision.findOneAndUpdate(
    { _id: toObjectId(decisionId), userId: toObjectId(userId) },
    { $set: update },
    { new: true, runValidators: true },
  );
}

export async function updateInvestmentNote(
  userId: string,
  noteId: string,
  input: UpdateInvestmentNoteInput,
) {
  const update = {
    ...(input.title !== undefined && { title: input.title.trim() }),
    ...(input.content !== undefined && { content: input.content.trim() }),
    ...(input.tags !== undefined && { tags: input.tags }),
  };

  return InvestmentNote.findOneAndUpdate(
    { _id: toObjectId(noteId), userId: toObjectId(userId) },
    { $set: update },
    { new: true, runValidators: true },
  );
}

export async function deleteInvestmentDecision(
  userId: string,
  decisionId: string,
) {
  return InvestmentDecision.findOneAndDelete({
    _id: toObjectId(decisionId),
    userId: toObjectId(userId),
  });
}

export async function deleteInvestmentNote(userId: string, noteId: string) {
  return InvestmentNote.findOneAndDelete({
    _id: toObjectId(noteId),
    userId: toObjectId(userId),
  });
}
