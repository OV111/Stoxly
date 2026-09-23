import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { getJournalEntry } from "@/lib/journal/queries";
import {
  updateInvestmentDecision,
  updateInvestmentNote,
  deleteInvestmentDecision,
  deleteInvestmentNote,
} from "@/lib/journal/mutations";
import { InvestmentDecision } from "@/models/InvestmentDecision";
import { InvestmentNote } from "@/models/InvestmentNote";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const entry = await getJournalEntry({ entryId: id, userId: user.id });
    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("GET /api/journal/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch journal entry" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const isDecision = await InvestmentDecision.exists({
      _id: id,
      userId: user.id,
    });
    if (isDecision) {
      const updated = await updateInvestmentDecision(user.id, id, body);
      return NextResponse.json({ entry: updated });
    }

    const isNote = await InvestmentNote.exists({ _id: id, userId: user.id });
    if (isNote) {
      const updated = await updateInvestmentNote(user.id, id, body);
      return NextResponse.json({ entry: updated });
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("PATCH /api/journal/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update journal entry" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const decision = await deleteInvestmentDecision(user.id, id);
    if (decision) return NextResponse.json({ success: true });

    const note = await deleteInvestmentNote(user.id, id);
    if (note) return NextResponse.json({ success: true });

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("DELETE /api/journal/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete journal entry" },
      { status: 500 },
    );
  }
}
