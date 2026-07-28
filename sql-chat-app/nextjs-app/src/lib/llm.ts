/**
 * llm.ts — Universal LLM client for Talk2DB
 *
 * How it works:
 *   - Set ANY combination of API keys in your environment variables.
 *   - The client auto-detects which providers are configured and tries
 *     them in priority order until one succeeds.
 *   - If a provider's key is missing it is skipped entirely (not an error).
 *   - If a provider's key is set but the call fails the next provider is tried.
 *   - All failures are logged with the real error message.
 *
 * Supported providers (set the corresponding env var to enable):
 *
 *   GEMINI_API_KEY       — Google Gemini (free tier at aistudio.google.com/apikey)
 *                          Optional: GEMINI_MODEL (default: gemini-1.5-flash)
 *
 *   OPENAI_API_KEY       — OpenAI (GPT-4o, GPT-4o-mini, etc.)
 *                          Optional: OPENAI_MODEL   (default: gpt-4o-mini)
 *                          Optional: OPENAI_BASE_URL (default: https://openai.com/v1)
 *                                    → set this to use any OpenAI-compatible API
 *                                      (Together AI, Groq, Fireworks, Mistral, etc.)
 *
 *   OPENROUTER_API_KEY   — OpenRouter (access to 100+ models, free tier available)
 *                          Optional: OPENROUTER_MODEL (default: meta-llama/llama-3.3-70b-instruct:free)
 *                          Optional: OPENROUTER_BASE_URL
 *
 *   ANTHROPIC_API_KEY    — Anthropic Claude
 *                          Optional: ANTHROPIC_MODEL (default: claude-3-haiku-20240307)
 *
 * Priority order (first configured key wins, skipping unconfigured ones):
 *   Gemini → OpenAI-compatible → OpenRouter → Anthropic
 *
 * Override priority with LLM_PROVIDER env var:
 *   LLM_PROVIDER=openai         → try OpenAI first
 *   LLM_PROVIDER=openrouter     → try OpenRouter first
 *   LLM_PROVIDER=gemini         → try Gemini first (default)
 *   LLM_PROVIDER=anthropic      → try Anthropic first
 */

interface LLMProvider {
    name: string;
    isConfigured: () => boolean;
    call: (systemPrompt: string, userMessage: string) => Promise<string>;
}

/**
 * Returns true only if the value is a non-empty string that doesn't look like
 * a placeholder (e.g. "your-key-here", "put-your-key-here", "sk-or-v1-put-...").
 * This prevents placeholder values in .env from causing 401s.
 */
function isRealKey(value: string | undefined): boolean {
    if (!value || value.trim() === "") return false;
    const lower = value.toLowerCase();
    // Common placeholder patterns
    if (lower.includes("your") || lower.includes("put-your") || lower.includes("here")) return false;
    if (lower === "false" || lower === "null" || lower === "undefined") return false;
    return true;
}

// ── Google Gemini ──────────────────────────────────────────────────────────
const geminiProvider: LLMProvider = {
    name: "Gemini",
    isConfigured: () => isRealKey(process.env.GEMINI_API_KEY),
    call: async (systemPrompt, userMessage) => {
        const apiKey = process.env.GEMINI_API_KEY!;
        const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: "user", parts: [{ text: userMessage }] }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 1500 },
            }),
            signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Gemini API error (${response.status}): ${err}`);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return String(text).trim();

        const blockReason = data?.promptFeedback?.blockReason;
        if (blockReason) throw new Error(`Gemini blocked the request: ${blockReason}`);

        throw new Error("Unexpected Gemini response format");
    },
};

// ── OpenAI-compatible (OpenAI, Together, Groq, Fireworks, Mistral, etc.) ──
const openaiProvider: LLMProvider = {
    name: "OpenAI",
    isConfigured: () => isRealKey(process.env.OPENAI_API_KEY),
    call: async (systemPrompt, userMessage) => {
        const apiKey = process.env.OPENAI_API_KEY!;
        const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
        const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage },
                ],
                max_tokens: 1500,
                temperature: 0.1,
            }),
            signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenAI API error (${response.status}): ${err}`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) return String(content).trim();
        throw new Error("Invalid OpenAI response format");
    },
};

// ── OpenRouter ─────────────────────────────────────────────────────────────
const openRouterProvider: LLMProvider = {
    name: "OpenRouter",
    isConfigured: () => isRealKey(process.env.OPENROUTER_API_KEY),
    call: async (systemPrompt, userMessage) => {
        const apiKey = process.env.OPENROUTER_API_KEY!;
        const baseUrl = (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");
        const model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "X-Title": "Talk2DB",
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage },
                ],
                max_tokens: 1500,
                temperature: 0.1,
            }),
            signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenRouter error (${response.status}): ${err}`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) return String(content).trim();
        throw new Error("Invalid OpenRouter response format");
    },
};

// ── Anthropic Claude ───────────────────────────────────────────────────────
const anthropicProvider: LLMProvider = {
    name: "Anthropic",
    isConfigured: () => isRealKey(process.env.ANTHROPIC_API_KEY),
    call: async (systemPrompt, userMessage) => {
        const apiKey = process.env.ANTHROPIC_API_KEY!;
        const model = process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307";

        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model,
                max_tokens: 1500,
                system: systemPrompt,
                messages: [{ role: "user", content: userMessage }],
            }),
            signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Anthropic API error (${response.status}): ${err}`);
        }

        const data = await response.json();
        const content = data?.content?.[0]?.text;
        if (content) return String(content).trim();
        throw new Error("Invalid Anthropic response format");
    },
};

// ── APIFreeLLM ─────────────────────────────────────────────────────────────
// Free, unlimited API — https://apifreellm.com
// NOTE: Free tier has a ~20s response delay. Works fine locally.
// On Vercel (10s serverless limit) it will timeout — use Gemini/OpenRouter there.
//
// IMPORTANT: uses Node's native https module instead of fetch because
// apifreellm.com stalls indefinitely with undici (Next.js's fetch client).
const apiFreeLLMProvider: LLMProvider = {
    name: "APIFreeLLM",
    isConfigured: () => isRealKey(process.env.FREEAPI_KEY),
    call: (systemPrompt, userMessage) => {
        return new Promise((resolve, reject) => {
            // Dynamically import https so this module stays edge-compatible
            // (the import is never reached in edge runtimes; only in Node.js)
            import("https").then(({ default: https }) => {
                const combinedMessage = `${systemPrompt}\n\n${userMessage}`;
                const body = JSON.stringify({ message: combinedMessage });
                const apiKey = process.env.FREEAPI_KEY!;

                const options = {
                    hostname: "apifreellm.com",
                    path: "/api/v1/chat",
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Length": Buffer.byteLength(body),
                    },
                };

                // 35s hard timeout — free tier advertises ~20s delay
                const timer = setTimeout(() => {
                    req.destroy(new Error("APIFreeLLM request timed out after 35s"));
                }, 35000);

                const req = https.request(options, (res) => {
                    let data = "";
                    res.on("data", (chunk) => { data += chunk; });
                    res.on("end", () => {
                        clearTimeout(timer);
                        try {
                            if (res.statusCode === 429) {
                                return reject(new Error("APIFreeLLM rate limited — wait 20 seconds and retry"));
                            }
                            if (res.statusCode !== 200) {
                                return reject(new Error(`APIFreeLLM error (${res.statusCode}): ${data}`));
                            }
                            const parsed = JSON.parse(data);
                            if (parsed?.success && parsed?.response) {
                                return resolve(String(parsed.response).trim());
                            }
                            reject(new Error("Invalid APIFreeLLM response format"));
                        } catch (e) {
                            reject(new Error(`APIFreeLLM parse error: ${(e as Error).message}`));
                        }
                    });
                });

                req.on("error", (e) => {
                    clearTimeout(timer);
                    reject(new Error(`APIFreeLLM request failed: ${e.message}`));
                });

                req.on("timeout", () => {
                    clearTimeout(timer);
                    req.destroy(new Error("APIFreeLLM socket timeout"));
                });

                req.write(body);
                req.end();
            }).catch(reject);
        });
    },
};

// ── Provider registry & priority ───────────────────────────────────────────
const ALL_PROVIDERS: Record<string, LLMProvider> = {
    gemini: geminiProvider,
    openai: openaiProvider,
    openrouter: openRouterProvider,
    anthropic: anthropicProvider,
    apifreellm: apiFreeLLMProvider,
};

// Default order — override with LLM_PROVIDER env var to put your preferred
// provider first (e.g. LLM_PROVIDER=apifreellm)
// APIFreeLLM is last by default: it works but has a ~25s delay on the free tier.
const DEFAULT_ORDER = ["gemini", "openai", "openrouter", "anthropic", "apifreellm"];

function getProviderOrder(): LLMProvider[] {
    const preferred = process.env.LLM_PROVIDER?.toLowerCase().trim();

    let order = [...DEFAULT_ORDER];
    if (preferred && ALL_PROVIDERS[preferred]) {
        // Move preferred provider to the front
        order = [preferred, ...order.filter((p) => p !== preferred)];
    }

    return order
        .map((name) => ALL_PROVIDERS[name])
        .filter((p) => p.isConfigured()); // only include providers with keys set
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function callLLM(
    systemPrompt: string,
    userMessage: string
): Promise<string> {
    const providers = getProviderOrder();

    if (providers.length === 0) {
        throw new Error(
            "No AI provider configured. Set at least one of: " +
            "GEMINI_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, or FREEAPI_KEY " +
            "in your environment variables."
        );
    }

    const errors: string[] = [];

    for (const provider of providers) {
        try {
            const result = await provider.call(systemPrompt, userMessage);
            return result;
        } catch (e) {
            const msg = `[${provider.name}] ${(e as Error).message}`;
            errors.push(msg);
            console.error("[LLM]", msg);
            // Continue to next provider
        }
    }

    // All configured providers failed
    throw new Error(
        `AI service unavailable. All providers failed:\n${errors.join("\n")}`
    );
}

// Keep this export for the few places that call OpenRouter directly
export async function callOpenRouter(systemPrompt: string, userMessage: string): Promise<string> {
    return openRouterProvider.call(systemPrompt, userMessage);
}
