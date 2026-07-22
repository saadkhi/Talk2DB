import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

function getKey(): Buffer {
    const envKey = process.env.DB_ENCRYPTION_KEY;
    if (!envKey) {
        throw new Error(
            "Server configuration error: DB_ENCRYPTION_KEY is not set. " +
            "Please contact the administrator to add this environment variable on Vercel."
        );
    }

    const key = Buffer.from(envKey, "hex");
    if (key.length !== 32) {
        throw new Error(
            "Server configuration error: DB_ENCRYPTION_KEY must be a 64-character hex string. " +
            "Please check the Vercel environment variable."
        );
    }
    return key;
}

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = getKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(encryptedText: string): string {
    const [ivHex, encHex] = encryptedText.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encHex, "hex");
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
}
