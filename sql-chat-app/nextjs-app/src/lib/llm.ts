/**
 * llm.ts — LLM client for Talk2DB
 *
 * Uses OpenRouter as the LLM provider.
 * OpenRouter gives access to many free models including Llama 3.3 70B.
 * Get a free key at: https://openrouter.ai/keys
 */

export async function callLLM(
    systemPrompt: string,
    userMessage: string
): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
    const model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";

    if (!apiKey) {
        throw new Error(
            "OPENROUTER_API_KEY is not configured. " +
            "Get a free key at https://openrouter.ai/keys and add it to your .env file."
        );
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Talk2DB",
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
            ],
            max_tokens: 1500,
            temperature: 0.1, // low temperature for deterministic SQL
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errText}`);
    }

    const data = await response.json();

    if (data?.choices?.[0]?.message?.content) {
        return String(data.choices[0].message.content).trim();
    }

    throw new Error("Invalid response format from OpenRouter");
}

// Alias kept for any existing imports
export { callLLM as callOpenRouter };
