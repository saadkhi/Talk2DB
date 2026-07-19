/**
 * llm.ts — Unified LLM client for Talk2DB
 *
 * Provider priority:
 *  1. FreeAPILLM  (apf_…)  — primary, fast, no cost
 *  2. OpenRouter             — fallback if FreeAPILLM fails
 *  3. Gradio (sqlModel.ts)   — called separately as the Gradio SQL fine-tuned model
 *
 * All API routes that need LLM completions should import `callLLM` from here.
 */

const FREEAPI_BASE = "https://api.freeapiapp.com/api/v1/ai/chat"; // correct FreeAPIApp endpoint

async function callFreeAPILLM(
    systemPrompt: string,
    userMessage: string
): Promise<string> {
    const apiKey = process.env.FREEAPI_KEY;
    if (!apiKey) throw new Error("FREEAPI_KEY not configured");

    const response = await fetch(FREEAPI_BASE, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user",   content: userMessage  },
            ],
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`FreeAPILLM error (${response.status}): ${err}`);
    }

    const data = await response.json();

    // FreeAPIApp returns { data: { response: "..." } } or OpenAI-compatible choices
    if (data?.data?.response) return String(data.data.response).trim();
    if (data?.choices?.[0]?.message?.content) return String(data.choices[0].message.content).trim();
    throw new Error("Unexpected FreeAPILLM response format");
}

async function callOpenRouter(
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

/**
 * callLLM — tries FreeAPILLM first, falls back to OpenRouter.
 * Throws only if both fail.
 */
export async function callLLM(
    systemPrompt: string,
    userMessage: string
): Promise<string> {
    // Try FreeAPILLM first
    try {
        return await callFreeAPILLM(systemPrompt, userMessage);
    } catch (e) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("FreeAPILLM failed, trying OpenRouter:", (e as Error).message);
        }
    }

    // Fallback to OpenRouter
    try {
        return await callOpenRouter(systemPrompt, userMessage);
    } catch (e) {
        if (process.env.NODE_ENV !== "production") {
            console.error("OpenRouter fallback also failed:", e);
        }
        throw new Error(
            "AI service unavailable. Both FreeAPILLM and OpenRouter failed. " +
            "Check your API keys in .env (FREEAPI_KEY and OPENROUTER_API_KEY)."
        );
    }
}

// Keep the old name exported so existing imports of callOpenRouter still compile
export { callOpenRouter };
