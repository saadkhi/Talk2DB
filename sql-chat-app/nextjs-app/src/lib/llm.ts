/**
 * llm.ts — Universal LLM client for Talk2DB
 *
 * Active provider: OpenRouter (OPENROUTER_API_KEY)
 *   Model  : meta-llama/llama-3.3-70b-instruct:free  (free tier)
 *   Timeout: 30s
 *
 * Other providers can be enabled by setting their API key env var.
 * Override the priority with LLM_PROVIDER env var:
 *   LLM_PROVIDER=openrouter   (current)
 *   LLM_PROVIDER=gemini
 *   LLM_PROVIDER=openai
 *   LLM_PROVIDER=anthropic
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

// ── Provider registry & priority ───────────────────────────────────────────
const ALL_PROVIDERS: Record<string, LLMProvider> = {
    openrouter: openRouterProvider,
    gemini: geminiProvider,
    openai: openaiProvider,
    anthropic: anthropicProvider,
};

// Default order — OpenRouter first (it's the configured provider).
// Override with LLM_PROVIDER env var if needed.
const DEFAULT_ORDER = ["openrouter", "gemini", "openai", "anthropic"];

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
            "No AI provider configured. Set OPENROUTER_API_KEY in your environment variables."
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
