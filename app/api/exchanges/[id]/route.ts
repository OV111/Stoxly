import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import ExchangeConnection from "@/models/ExchangeConnection";
import SyncedHolding from "@/models/SyncedHolding";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await connectDB();

  const connection = await ExchangeConnection.findOneAndDelete({
    _id: id,
    userId: user.id,
  });
  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  await SyncedHolding.deleteMany({ connectionId: connection._id });

  return NextResponse.json({ ok: true });
}
