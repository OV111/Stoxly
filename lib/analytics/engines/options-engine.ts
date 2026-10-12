/**
 * Summary statistics for one options expiration.
 *
 * Pure. Describes positioning and market-implied volatility from the chain
 * itself — open interest, volume, the at-the-money straddle — without
 * interpreting any of it as directional advice.
 */

export type OptionContract = {
  contractSymbol: string;
  strike: number;
  lastPrice: number | null;
  bid: number | null;
  ask: number | null;
  change: number | null;
  percentChange: number | null;
  volume: number | null;
  openInterest: number | null;
  impliedVolatility: number | null;
  inTheMoney: boolean;
};

export type ChainSummary = {
  callVolume: number;
  putVolume: number;
  callOpenInterest: number;
  putOpenInterest: number;
  putCallVolumeRatio: number | null;
  putCallOpenInterestRatio: number | null;
  atmStrike: number | null;
  atmImpliedVolatility: number | null;
  /** ATM straddle mid ÷ underlying — the move the market is pricing by expiry. */
  impliedMove: number | null;
  impliedMoveDollars: number | null;
  /** Strike at which the most open interest would expire worthless. */
  maxPain: number | null;
};

const sum = (xs: (number | null)[]) => xs.reduce<number>((a, b) => a + (b ?? 0), 0);

/** Bid/ask midpoint, falling back to last trade when the quote is one-sided. */
export function midPrice(c: OptionContract): number | null {
  if (c.bid && c.ask && c.ask >= c.bid) return (c.bid + c.ask) / 2;
  return c.lastPrice ?? null;
}

export function summarizeChain(
  calls: OptionContract[],
  puts: OptionContract[],
  underlying: number | null,
): ChainSummary {
  const callVolume = sum(calls.map((c) => c.volume));
  const putVolume = sum(puts.map((c) => c.volume));
  const callOpenInterest = sum(calls.map((c) => c.openInterest));
  const putOpenInterest = sum(puts.map((c) => c.openInterest));

  let atmStrike: number | null = null;
  let atmImpliedVolatility: number | null = null;
  let impliedMoveDollars: number | null = null;

  if (underlying !== null) {
    // ATM = the strike closest to spot that has both a call and a put.
    const putByStrike = new Map(puts.map((p) => [p.strike, p]));
    let best: { call: OptionContract; put: OptionContract } | null = null;
    for (const call of calls) {
      const put = putByStrike.get(call.strike);
      if (!put) continue;
      if (!best || Math.abs(call.strike - underlying) < Math.abs(best.call.strike - underlying)) {
        best = { call, put };
      }
    }
    if (best) {
      atmStrike = best.call.strike;
      const ivs = [best.call.impliedVolatility, best.put.impliedVolatility].filter(
        (v): v is number => v !== null && v > 0,
      );
      atmImpliedVolatility = ivs.length ? ivs.reduce((a, b) => a + b, 0) / ivs.length : null;
      const callMid = midPrice(best.call);
      const putMid = midPrice(best.put);
      if (callMid !== null && putMid !== null) impliedMoveDollars = callMid + putMid;
    }
  }

  // Max pain: total intrinsic value paid to holders if the underlying settled
  // at each strike; the strike minimizing it is where writers pay least.
  const strikes = [...new Set([...calls, ...puts].map((c) => c.strike))].sort((a, b) => a - b);
  let maxPain: number | null = null;
  if (callOpenInterest + putOpenInterest > 0) {
    let minPayout = Infinity;
    for (const settle of strikes) {
      const payout =
        sum(calls.map((c) => Math.max(0, settle - c.strike) * (c.openInterest ?? 0))) +
        sum(puts.map((p) => Math.max(0, p.strike - settle) * (p.openInterest ?? 0)));
      if (payout < minPayout) {
        minPayout = payout;
        maxPain = settle;
      }
    }
  }

  return {
    callVolume,
    putVolume,
    callOpenInterest,
    putOpenInterest,
    putCallVolumeRatio: callVolume > 0 ? putVolume / callVolume : null,
    putCallOpenInterestRatio: callOpenInterest > 0 ? putOpenInterest / callOpenInterest : null,
    atmStrike,
    atmImpliedVolatility,
    impliedMove: impliedMoveDollars !== null && underlying ? impliedMoveDollars / underlying : null,
    impliedMoveDollars,
    maxPain,
  };
}
