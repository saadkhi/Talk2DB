export async function callOpenRouter(systemPrompt: string, userMessage: string): Promise<string> {
    try {
        const baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
        const apiKey = process.env.OPENROUTER_API_KEY;
        const model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://talk2-db-nextjs-app.vercel.app", // Optional for OpenRouter
                "X-Title": "Talk2DB",
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage }
                ],
                max_tokens: 1000,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenRouter API error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        }
        throw new Error("Invalid response format from OpenRouter");
    } catch (error) {
        console.error("OpenRouter request failed:", error);
        throw error;
    }
}
