import { ITransaction } from "@/models/Transactions";
import { Holding } from "../types";

// Share quantities are floats, and fractional shares are normal, so an exactly
// closed position can carry ~1e-17 of float dust. Anything at or below this is
// treated as zero. Sits far below any real fractional-share size (brokers deal
// in 1e-6 at finest) while comfortably above IEEE-754 accumulation error.
const QUANTITY_EPSILON = 1e-9;

export function buildHoldings(transactions: ITransaction[]): Holding[] {
  const sorted = [...transactions].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
  );

  const holdingsBySymbol = new Map<string, Holding>();

  for (const tx of sorted) {
    if (!tx.symbol) continue; // DEPOSIT/WITHDRAWAL don't touch holdings

    const quantity = Number(tx.quantity.toString());
    const pricePerUnit = Number(tx.pricePerUnit.toString());

    let holding = holdingsBySymbol.get(tx.symbol);
    if (!holding) {
      holding = {
        symbol: tx.symbol,
        lots: [],
        totalQuantity: 0,
        totalCostBasis: 0,
        avgCostPerUnit: 0,
        realizedPnl: 0,
      };
      holdingsBySymbol.set(tx.symbol, holding);
    }

    switch (tx.type) {
      case "BUY": {
        holding.lots.push({
          quantity,
          costPerUnit: pricePerUnit,
          occurredAt: tx.occurredAt,
        });
        break;
      }

      case "SELL": {
        let remainingToSell = quantity;
        while (remainingToSell > QUANTITY_EPSILON && holding.lots.length > 0) {
          const lot = holding.lots[0]; // FIFO: oldest lot first
          const sold = Math.min(lot.quantity, remainingToSell);

          holding.realizedPnl += (pricePerUnit - lot.costPerUnit) * sold;

          lot.quantity -= sold;
          remainingToSell -= sold;
          // Epsilon, not `=== 0`: fractional shares are normal (0.1 + 0.2 !== 0.3
          // in IEEE-754), so an exactly-closed lot can leave float dust behind.
          // Comparing exactly would strand a ~1e-17 lot and render a fully-sold
          // position as still open.
          if (lot.quantity <= QUANTITY_EPSILON) holding.lots.shift();
        }
        break;
      }

      case "SPLIT": {
        // `quantity` is overloaded here as the split ratio, e.g. 4 for a 4:1 split
        const ratio = quantity;
        for (const lot of holding.lots) {
          lot.quantity *= ratio;
          lot.costPerUnit /= ratio;
        }
        break;
      }

      case "DIVIDEND":
        // doesn't change holdings — feeds the cash-flow timeline instead
        break;
    }
  }

  for (const holding of holdingsBySymbol.values()) {
    holding.totalQuantity = holding.lots.reduce((sum, l) => sum + l.quantity, 0);
    holding.totalCostBasis = holding.lots.reduce(
      (sum, l) => sum + l.quantity * l.costPerUnit,
      0,
    );
    holding.avgCostPerUnit =
      holding.totalQuantity > QUANTITY_EPSILON
        ? holding.totalCostBasis / holding.totalQuantity
        : 0;
  }

  // Same epsilon on the way out — a fully-closed position must not survive as
  // a dust-sized holding.
  return Array.from(holdingsBySymbol.values()).filter(
    (h) => h.totalQuantity > QUANTITY_EPSILON,
  );
}
