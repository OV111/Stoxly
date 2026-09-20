import { AnalyticalAIInput } from '../../types/ai';

export function buildGroqSystemPrompt(): string {
  return `
You are a senior quantitative crypto analyst running on Groq's ultra-fast inference.

TASK: Analyze the provided structured crypto data. Identify patterns, contradictions, risks, and opportunities.

CRITICAL RULES (Must Follow):
1. BASE conclusions ONLY on the provided data. Do NOT invent numbers, dates, or events.
2. Distinguish: Facts (data) vs. Calculations (metrics) vs. Interpretation (your opinion).
3. If signals conflict, explicitly flag the contradictions and weigh them.
4. Assign confidence scores (0.00 to 1.00) to every finding.
5. You MUST output ONLY valid JSON. No markdown, no explanations outside JSON.

JSON OUTPUT SCHEMA (Strict):
{
  "analysis": {
    "bullish_factors": [{ "factor": "string", "evidence": "string", "weight": 0.0-1.0, "confidence": 0.0-1.0 }],
    "bearish_factors": [{ "factor": "string", "evidence": "string", "weight": 0.0-1.0, "confidence": 0.0-1.0 }],
    "contradictions": [{ "factor1": "string", "factor2": "string", "resolution": "string", "confidence": 0.0-1.0 }],
    "unusual_metrics": [{ "metric": "string", "value": 0.0, "historical_average": 0.0, "significance": "string" }],
    "hidden_risks": [{ "risk": "string", "description": "string", "probability": 0.0-1.0, "severity": 0.0-1.0 }],
    "independent_conclusion": { "summary": "string (max 50 words)", "overall_bias": "bullish|neutral|bearish", "confidence": 0.0-1.0 },
    "assumptions": [{ "assumption": "string", "challenge": "string", "alternative": "string" }],
    "data_quality_notes": [{ "issue": "string", "impact": "string", "recommendation": "string" }]
  },
  "scores": {
    "fundamental": { "score": 0-100, "confidence": 0-100 },
    "technical": { "score": 0-100, "confidence": 0-100 },
    "tokenomics": { "score": 0-100, "confidence": 0-100 },
    "onchain": { "score": 0-100, "confidence": 0-100 },
    "sentiment": { "score": 0-100, "confidence": 0-100 },
    "risk": { "score": 0-100, "confidence": 0-100 },
    "macro": { "score": 0-100, "confidence": 0-100 },
    "overall": { "score": 0-100, "confidence": 0-100 }
  },
  "metadata": {
    "timestamp": "ISO_STRING",
    "model": "groq-llama3",
    "version": "1.0.0",
    "processing_time_ms": 0,
    "data_freshness": { "market_data": "ISO_STRING", "onchain_data": "ISO_STRING" }
  }
}

Do not output anything else. Only the JSON.
`;
}

export function buildGroqUserPrompt(input: AnalyticalAIInput): string {
  return `
ANALYZE THIS CRYPTO ASSET DATA (${input.asset.symbol}):

--- PRICE & MARKET ---
Price: $${input.market_data.priceUsd.toFixed(2)}
Market Cap: $${(input.market_data.marketCap / 1e9).toFixed(2)}B
24h Volume: $${(input.market_data.volume24h / 1e6).toFixed(0)}M
24h Change: ${input.market_data.priceChange24h > 0 ? '+' : ''}${input.market_data.priceChange24h.toFixed(2)}%
7d Change: ${input.market_data.priceChange7d > 0 ? '+' : ''}${input.market_data.priceChange7d.toFixed(2)}%
30d Volatility: ${input.market_data.volatility30d.toFixed(1)}%
ATH: $${input.market_data.ath.toFixed(2)} (from ${input.market_data.athDate ? new Date(input.market_data.athDate).toLocaleDateString() : 'N/A'})

--- TECHNICALS ---
RSI(14): ${input.technical_indicators.rsi14.toFixed(1)}
MACD: ${input.technical_indicators.macd.value.toFixed(2)} (Signal: ${input.technical_indicators.macd.signal.toFixed(2)})
EMA 20/50/200: $${input.technical_indicators.ema20.toFixed(2)} / $${input.technical_indicators.ema50.toFixed(2)} / $${input.technical_indicators.ema200.toFixed(2)}
Trend: ${input.technical_indicators.trend} (Strength: ${(input.technical_indicators.trendStrength * 100).toFixed(0)}%)
Supports: ${input.technical_indicators.supportLevels.map(s => `$${s.toFixed(0)}`).join(', ')}
Resistances: ${input.technical_indicators.resistanceLevels.map(s => `$${s.toFixed(0)}`).join(', ')}

--- FUNDAMENTALS ---
Use Case: ${input.fundamental_data.useCase}
Consensus: ${input.fundamental_data.consensusMechanism}
Active Devs (30d): ${input.fundamental_data.developerActivity.activeDevs30d} (Trend: ${input.fundamental_data.developerActivity.trend})
Commits (30d): ${input.fundamental_data.developerActivity.commits30d}
Active Addresses: ${input.fundamental_data.ecosystem.activeAddresses30d?.toLocaleString() || 'N/A'}

--- TOKENOMICS ---
Circulating: ${(input.tokenomics.circulatingSupply / 1e6).toFixed(2)}M
Max Supply: ${input.tokenomics.maxSupply ? (input.tokenomics.maxSupply / 1e6).toFixed(2) + 'M' : 'Unlimited'}
Inflation Rate: ${input.tokenomics.inflationRate.toFixed(2)}%
Unlocks Next 6m: ${(input.tokenomics.unlocksNext6m / 1e6).toFixed(2)}M tokens
Staking Yield: ${input.tokenomics.stakingYield ? input.tokenomics.stakingYield.toFixed(2) + '%' : 'N/A'}

--- ON-CHAIN (if available) ---
${input.onchain_data ? `
Active Addresses: ${input.onchain_data.activeAddresses.current.toLocaleString()} (30d: ${input.onchain_data.activeAddresses.change30d > 0 ? '+' : ''}${input.onchain_data.activeAddresses.change30d.toFixed(1)}%)
Exchange Net Flow: ${input.onchain_data.exchangeFlows.netFlow > 0 ? 'Inflow' : 'Outflow'} (${Math.abs(input.onchain_data.exchangeFlows.netFlow).toLocaleString()})
Whale Accumulation: ${input.onchain_data.whaleActivity.whaleAccumulation ? 'Yes' : 'No'}
Network Health: ${(input.onchain_data.networkHealth * 100).toFixed(0)}%
` : 'No on-chain data provided.'}

--- NEWS & SENTIMENT ---
Overall Sentiment: ${(input.news_summary.overallSentiment * 100).toFixed(0)}%
Positive/Negative/Neutral: ${input.news_summary.positiveCount}/${input.news_summary.negativeCount}/${input.news_summary.neutralCount}
Top Topics: ${input.news_summary.topTopics.join(', ')}

--- MACRO CONTEXT ---
BTC Trend: ${input.macro_context.btcTrend}
Total Market Cap: $${(input.macro_context.totalMarketCap / 1e9).toFixed(2)}B
BTC Dominance: ${input.macro_context.btcDominance.toFixed(1)}%
Fear & Greed: ${input.macro_context.fearAndGreedIndex}
Risk Environment: ${input.macro_context.riskEnvironment}
Correlation to BTC: ${input.macro_context.correlationToBtc.toFixed(2)}

Generate the JSON analysis strictly following the schema. Be fast, accurate, and evidence-driven.
`;
}