type ModelKey = "gpt-5-nano-2025-08-07" | "gpt-5-mini-2025-08-07";

function estimateSummaryETASeconds(opts: {
  textLengthChars: number;
  model: ModelKey;
  concurrency?: number;      // = OPENAI_CONCURRENCY im Backend
  maxTokensPerChunk?: number; // = 1400 wie im Backend
  charsPerToken?: number;     // grob: 3 für DE/RU/EN mit deinem Clean-Text
  p50Latency?: { nano: number; mini: number }; // Sekunden
  isCyrillic?: boolean;
  overheadSec?: number;
}) {
  const {
    textLengthChars,
    model,
    concurrency = 8,
    maxTokensPerChunk = 1400,
    charsPerToken = 3,
    p50Latency = { nano: 8, mini: 12 },
    isCyrillic = false,
    overheadSec = 3,
  } = opts;

  if (textLengthChars <= 0) return 0;

  // Chunks grob über Zeichen -> Tokens -> Chunks
  const approxTokens = Math.ceil(textLengthChars / charsPerToken);
  const chunks = Math.max(1, Math.ceil(approxTokens / maxTokensPerChunk));

  const waves = Math.ceil(chunks / Math.max(1, concurrency));
  const base = model.includes("mini") ? p50Latency.mini : p50Latency.nano;

  let eta = waves * base + overheadSec;
  if (isCyrillic) eta *= 1.2; // +20% für RU

  // minimale/Max-Klammern, damit UI nicht „0s“ oder absurde Zeiten zeigt
  return Math.min(Math.max(eta, 5), 1800); // 5s .. 30min
}

// Helper zur Erkennung von Kyrillisch
export function looksCyrillic(s: string): boolean {
  return /[\u0400-\u04FF]/.test(s);
}
