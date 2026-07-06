import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

function getKey(): Buffer {
    const envKey = process.env.DB_ENCRYPTION_KEY;
    if (!envKey) {
        throw new Error("DB_ENCRYPTION_KEY environment variable is required for database connection string encryption");
    }

    try {
        const key = Buffer.from(envKey, "hex");
        if (key.length !== 32) {
            throw new Error("DB_ENCRYPTION_KEY must be a 32-byte hex string (64 hex characters)");
        }
        return key;
    } catch (e) {
        throw new Error("Invalid DB_ENCRYPTION_KEY format: must be a 32-byte hex string");
    }
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
