import { Client } from "@gradio/client";

let gradioClient: any = null;

export async function getSQLClient() {
    if (gradioClient) return gradioClient;
    const HF_TOKEN = process.env.HF_TOKEN;
    const GRADIO_SPACE = process.env.GRADIO_SPACE || "saadkhi/SQL_chatbot_API";
    if (HF_TOKEN) {
        gradioClient = await Client.connect(GRADIO_SPACE, { token: HF_TOKEN as `hf_${string}` });
    } else {
        gradioClient = await Client.connect(GRADIO_SPACE);
    }
    return gradioClient;
}

export async function generateSQL(prompt: string): Promise<string> {
    try {
        const client = await getSQLClient();
        const result = await client.predict("/generate_sql", { user_input: prompt });

        // Gradio prediction outputs might be in an array or a single property.
        // result.data should be the standard way. Let's make sure it handles result array or object safely.
        if (result && Array.isArray(result.data)) {
            return String(result.data[0]).trim();
        }
        if (result && result.data) {
            return String(result.data).trim();
        }
        return String(result).trim();
    } catch (error) {
        console.error("Gradio SQL model failed:", error);
        throw error;
    }
}
