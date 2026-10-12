/**
 * Unified AI Provider Module
 * Priority chain: DeepSeek (~95%) → Gemini (backup)
 *
 * Usage:
 *   import { callAI } from '@/lib/aiProviders';
 *   const result = await callAI(prompt, { systemPrompt, maxTokens, temperature });
 *
 * Env:
 *   DEEPSEEK_API_KEY (required for primary)
 *   DEEPSEEK_MODEL (optional, default deepseek-v4-flash)
 *   GEMINI_API_KEY / GEMINI_API_KEY_2 / GEMINI_API_KEY_3 (fallback)
 *
 * Returns: { text: string, model: string, provider: 'deepseek' | 'gemini' }
 * Throws: Error if all providers fail
 */

export interface AIOptions {
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  /** If true, parse response as JSON and return the object */
  json?: boolean;
  /** Per-request abort timeout. Defaults: DeepSeek 45s, Gemini 20s. */
  timeoutMs?: number;
  /** Stop after this many key tries across DeepSeek then Gemini. Default: all keys. */
  maxKeyTries?: number;
}

export interface AIResult {
  text: string;
  model: string;
  provider: 'deepseek' | 'gemini';
  parsed?: any;
}

const DEEPSEEK_BASE = 'https://api.deepseek.com';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash';

function deepseekModel(): string {
  const fromEnv = process.env.DEEPSEEK_MODEL?.trim();
  return fromEnv || DEFAULT_DEEPSEEK_MODEL;
}

function deepseekKeys(): string[] {
  return [
    process.env.DEEPSEEK_API_KEY,
    process.env.DEEPSEEK_API_KEY_2,
  ]
    .map((k) => (typeof k === 'string' ? k.trim() : ''))
    .filter(Boolean);
}

function geminiKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ]
    .map((k) => (typeof k === 'string' ? k.trim() : ''))
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Provider: DeepSeek (primary)
// ---------------------------------------------------------------------------
async function callDeepSeek(
  apiKey: string,
  prompt: string,
  opts: AIOptions
): Promise<AIResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 45000);
  const model = deepseekModel();

  const systemParts: string[] = [];
  if (opts.systemPrompt) systemParts.push(opts.systemPrompt);
  if (opts.json) {
    systemParts.push(
      'Return ONLY valid JSON (no markdown fences). The word json appears here so JSON mode is allowed.'
    );
  }

  const messages: Array<{ role: string; content: string }> = [];
  if (systemParts.length) {
    messages.push({ role: 'system', content: systemParts.join('\n\n') });
  }
  messages.push({ role: 'user', content: prompt });

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 2000,
    // Bulk CareerSasa work: disable thinking for speed/cost
    thinking: { type: 'disabled' },
  };
  if (opts.json) {
    body.response_format = { type: 'json_object' };
  }

  try {
    const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`DeepSeek ${res.status}: ${errBody.slice(0, 200)}`);
    }

    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content;
    if (!text) throw new Error('DeepSeek: empty response');

    return { text, model, provider: 'deepseek' };
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Provider: Gemini (backup)
// ---------------------------------------------------------------------------
async function callGemini(
  apiKey: string,
  prompt: string,
  opts: AIOptions
): Promise<AIResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20000);

  const body: any = {
    contents: [
      {
        parts: [
          {
            text: opts.systemPrompt
              ? `${opts.systemPrompt}\n\n${prompt}`
              : prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      maxOutputTokens: opts.maxTokens ?? 2000,
      ...(opts.json ? { responseMimeType: 'application/json' } : {}),
    },
  };

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Gemini ${res.status}: ${errBody.slice(0, 200)}`);
    }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini: empty response');

    return { text, model: 'gemini-2.5-flash', provider: 'gemini' };
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Unified entry point
// ---------------------------------------------------------------------------

function isRateLimitMessage(msg: string): boolean {
  return /(?:\b429\b|rate.?limit|too many requests|resource.?exhausted|quota)/i.test(
    msg
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Call AI with automatic provider fallback.
 * Priority: DeepSeek → Gemini
 */
export async function callAI(
  prompt: string,
  opts: AIOptions = {}
): Promise<AIResult> {
  const dsKeys = deepseekKeys();
  const gKeys = geminiKeys();

  if (dsKeys.length === 0 && gKeys.length === 0) {
    throw new Error(
      'No AI API keys configured. Add DEEPSEEK_API_KEY and/or GEMINI_API_KEY.'
    );
  }

  const errors: string[] = [];
  const maxTries = Math.max(1, opts.maxKeyTries ?? dsKeys.length + gKeys.length);
  let tries = 0;

  // 1. DeepSeek primary (~95% of traffic)
  for (const key of dsKeys) {
    if (tries >= maxTries) break;
    tries += 1;
    try {
      const result = await callDeepSeek(key, prompt, opts);
      if (opts.json) {
        result.parsed = tryParseJson(result.text);
      }
      return result;
    } catch (err: any) {
      errors.push(err.message);
      if (isRateLimitMessage(String(err?.message || ''))) {
        await sleep(500);
      }
    }
  }

  // 2. Gemini backup
  for (const key of gKeys) {
    if (tries >= maxTries) break;
    tries += 1;
    try {
      const result = await callGemini(key, prompt, opts);
      if (opts.json) {
        result.parsed = tryParseJson(result.text);
      }
      return result;
    } catch (err: any) {
      errors.push(err.message);
      if (isRateLimitMessage(String(err?.message || ''))) {
        await sleep(500);
      }
    }
  }

  console.error('[aiProviders] All providers failed:', errors);
  throw new Error(errors.join('; ') || 'All AI providers failed');
}

/**
 * Check if at least one AI provider is configured.
 */
export function hasAIConfigured(): boolean {
  return deepseekKeys().length > 0 || geminiKeys().length > 0;
}

export function aiProviderSummary(): string {
  const parts: string[] = [];
  if (deepseekKeys().length) parts.push(`deepseek(${deepseekKeys().length})`);
  if (geminiKeys().length) parts.push(`gemini(${geminiKeys().length})`);
  return parts.length ? parts.join(' → ') : 'none';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(stripFences(text));
  } catch {
    return undefined;
  }
}
