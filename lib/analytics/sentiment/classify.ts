import { ArticleSentiment, NewsArticle, SentimentLabel } from "./types";

let GroqClient: any;

const MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
];

const VALID_LABELS: SentimentLabel[] = ["positive", "neutral", "negative"];

function systemPrompt() {
  return `You are a financial news sentiment classifier. You will receive a numbered list of headlines, each tagged with its asset symbol. For each one, judge only whether the news is positive, neutral, or negative for that specific asset's near-term outlook — do not speculate beyond what the headline states.

Respond with ONLY a JSON object of this exact shape, no prose, no markdown fences:
{"results": [{"index": 0, "label": "positive" | "neutral" | "negative", "score": number between -1 and 1}]}

"score" must agree with "label" in sign (positive > 0.15, negative < -0.15, neutral in between). Return exactly one result per input headline, in the same order.`;
}

function userPrompt(articles: NewsArticle[]) {
  return articles
    .map((a, i) => `${i}. [${a.symbol}] ${a.headline}`)
    .join("\n");
}

/**
 * Classifies a batch of headlines in one Groq call. Network boundary only —
 * aggregation happens separately in sentiment-engine.ts.
 */
export async function classifyArticles(
  articles: NewsArticle[],
): Promise<ArticleSentiment[]> {
  if (articles.length === 0) return [];

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[sentiment] GROQ_API_KEY missing – skipping classification");
    return articles.map((article) => ({ article, label: "neutral", score: 0 }));
  }

  if (!GroqClient) {
    const { default: Groq } = await import("groq-sdk");
    GroqClient = new Groq({ apiKey });
  }

  let lastError: unknown;

  for (const model of MODELS) {
    try {
      const response = await GroqClient.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: userPrompt(articles) },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      });

      const raw = response.choices[0]?.message?.content;
      if (!raw) throw new Error("Empty response from Groq");

      const content = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      const parsed = JSON.parse(content) as {
        results: { index: number; label: string; score: number }[];
      };

      return articles.map((article, i) => {
        const result = parsed.results.find((r) => r.index === i);
        const label: SentimentLabel =
          result && VALID_LABELS.includes(result.label as SentimentLabel)
            ? (result.label as SentimentLabel)
            : "neutral";
        const score =
          typeof result?.score === "number"
            ? Math.max(-1, Math.min(1, result.score))
            : 0;
        return { article, label, score };
      });
    } catch (err) {
      lastError = err;
      console.warn(`[sentiment] Groq model ${model} failed:`, err);
    }
  }

  console.error("[sentiment] all Groq models failed:", lastError);
  return articles.map((article) => ({ article, label: "neutral", score: 0 }));
}
