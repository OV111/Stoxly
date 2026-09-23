import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { getJournalEntries } from "@/lib/journal/queries";
import {
  createInvestmentDecision,
  createInvestmentNote,
} from "@/lib/journal/mutations";
import type {
  CreateInvestmentDecisionInput,
  CreateInvestmentNoteInput,
} from "@/types/journal";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as "DECISION" | "NOTE" | null;
    const symbol = searchParams.get("symbol");
    const limit = searchParams.get("limit")
      ? Number(searchParams.get("limit"))
      : 50;

    const entries = await getJournalEntries({
      userId: user.id,
      type: type ?? undefined,
      symbol: symbol ?? undefined,
      limit,
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("GET /api/journal error:", error);
    return NextResponse.json(
      { error: "Failed to fetch journal" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.type) {
      return NextResponse.json(
        { error: "Entry type is required" },
        { status: 400 },
      );
    }

    if (body.type === "DECISION") {
      const input = body as CreateInvestmentDecisionInput;

      if (!input.action) {
        return NextResponse.json(
          { error: "action is required" },
          { status: 400 },
        );
      }

      const decision = await createInvestmentDecision(user.id, input);
      return NextResponse.json({ entry: decision }, { status: 201 });
    }

    if (body.type === "NOTE") {
      const input = body as CreateInvestmentNoteInput;

      if (!input.content?.trim()) {
        return NextResponse.json(
          { error: "content is required" },
          { status: 400 },
        );
      }

      const note = await createInvestmentNote(user.id, input);
      return NextResponse.json({ entry: note }, { status: 201 });
    }

    return NextResponse.json(
      { error: "Invalid journal entry type" },
      { status: 400 },
    );
  } catch (error) {
    console.error("POST /api/journal error:", error);
    return NextResponse.json(
      { error: "Failed to create journal entry" },
      { status: 500 },
    );
  }
}
