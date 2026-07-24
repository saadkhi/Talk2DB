/**
 * llm.ts — LLM client for Talk2DB
 *
 * Primary:  APIFreeLLM (apifreellm.com) — free, no credit card
 * Fallback: OpenRouter (openrouter.ai)   — free tier available
 */

// ── APIFreeLLM ─────────────────────────────────────────────────────────────
async function callAPIFreeLLM(
    systemPrompt: string,
    userMessage: string
): Promise<string> {
    const apiKey = process.env.FREEAPI_KEY || "apf_zgii4ijjtnqseq5oa0psxhtw";

    // API accepts a single "message" string — prepend system prompt to message
    const combinedMessage = systemPrompt
        ? `${systemPrompt}\n\n${userMessage}`
        : userMessage;

    const response = await fetch("https://apifreellm.com/api/v1/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ message: combinedMessage }),
        // Free tier has a 20-second rate limit — give it up to 60s to respond
        signal: AbortSignal.timeout(60000),
    });

    if (response.status === 429) {
        throw new Error("APIFreeLLM rate limit reached. Please wait 20 seconds and try again.");
    }
    if (response.status === 401) {
        throw new Error("APIFreeLLM: Invalid API key.");
    }
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`APIFreeLLM error (${response.status}): ${err}`);
    }

    const data = await response.json();

    if (data?.success && data?.response) {
        return String(data.response).trim();
    }

    throw new Error(`APIFreeLLM returned unexpected format: ${JSON.stringify(data)}`);
}

// ── OpenRouter fallback ────────────────────────────────────────────────────
async function callOpenRouterInternal(
    systemPrompt: string,
    userMessage: string
): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

    const baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
    const model   = process.env.OPENROUTER_MODEL   || "meta-llama/llama-3.3-70b-instruct:free";

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
                { role: "user",   content: userMessage  },
            ],
            max_tokens: 1500,
            temperature: 0.1,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenRouter error (${response.status}): ${err}`);
    }

    const data = await response.json();
    if (data?.choices?.[0]?.message?.content) {
        return String(data.choices[0].message.content).trim();
    }
    throw new Error("Invalid OpenRouter response format");
}

// ── Public API ─────────────────────────────────────────────────────────────
/**
 * callLLM — tries APIFreeLLM first, falls back to OpenRouter.
 * Throws only if both fail.
 */
export async function callLLM(
    systemPrompt: string,
    userMessage: string
): Promise<string> {
    // Primary: APIFreeLLM
    try {
        return await callAPIFreeLLM(systemPrompt, userMessage);
    } catch (e) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("APIFreeLLM failed, trying OpenRouter:", (e as Error).message);
        }
    }

    // Fallback: OpenRouter
    try {
        return await callOpenRouterInternal(systemPrompt, userMessage);
    } catch (e) {
        if (process.env.NODE_ENV !== "production") {
            console.error("OpenRouter fallback also failed:", e);
        }
        throw new Error(
            "AI service temporarily unavailable. " +
            "Please try again in a moment."
        );
    }
}

// Alias kept for existing imports
export { callOpenRouterInternal as callOpenRouter };
