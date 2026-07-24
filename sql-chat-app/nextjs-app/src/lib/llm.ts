/**
 * llm.ts — LLM client for Talk2DB
 *
 * Provider priority:
 *  1. Google Gemini API  — free, fast, 15 RPM, no credit card needed
 *  2. APIFreeLLM         — free but 20s delay (unusable on Vercel 10s limit)
 *  3. OpenRouter         — fallback if Gemini key not set
 *
 * Get a free Gemini key at: https://aistudio.google.com/apikey
 */

// ── Google Gemini ──────────────────────────────────────────────────────────
async function callGemini(
    systemPrompt: string,
    userMessage: string
): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            system_instruction: {
                parts: [{ text: systemPrompt }],
            },
            contents: [
                { role: "user", parts: [{ text: userMessage }] },
            ],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1500,
            },
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

    throw new Error("Unexpected Gemini response format");
}

// ── OpenRouter fallback ────────────────────────────────────────────────────
async function callOpenRouterInternal(
    systemPrompt: string,
    userMessage: string
): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

    const baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
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
    if (data?.choices?.[0]?.message?.content) {
        return String(data.choices[0].message.content).trim();
    }
    throw new Error("Invalid OpenRouter response format");
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function callLLM(
    systemPrompt: string,
    userMessage: string
): Promise<string> {
    // 1. Try Gemini (fast, free, works on Vercel)
    try {
        return await callGemini(systemPrompt, userMessage);
    } catch (e) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("Gemini failed:", (e as Error).message);
        }
    }

    // 2. Try OpenRouter
    try {
        return await callOpenRouterInternal(systemPrompt, userMessage);
    } catch (e) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("OpenRouter failed:", (e as Error).message);
        }
    }

    throw new Error(
        "AI service unavailable. Please set GEMINI_API_KEY in your Vercel environment variables. " +
        "Get a free key at: https://aistudio.google.com/apikey"
    );
}

export { callOpenRouterInternal as callOpenRouter };
