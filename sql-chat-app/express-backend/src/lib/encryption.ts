import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

function getKey(): Buffer {
    const envKey = process.env.DB_ENCRYPTION_KEY;
    if (!envKey) {
        throw new Error("DB_ENCRYPTION_KEY environment variable is required for database connection string encryption");
    }

    const key = Buffer.from(envKey, "hex");
    if (key.length !== 32) {
        throw new Error("DB_ENCRYPTION_KEY must be a 32-byte hex string (64 hex characters)");
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
    // FIX: validate input before destructuring — a missing or malformed value
    // previously caused Buffer.from(undefined, "hex") to throw an unhandled crash.
    if (!encryptedText || typeof encryptedText !== "string") {
        throw new Error("Decryption failed: encrypted value is empty or invalid.");
    }

    const parts = encryptedText.split(":");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new Error(
            "Decryption failed: stored value has an unexpected format. " +
            "The database connection string may be corrupted — please reconnect your database."
        );
    }

    const [ivHex, encHex] = parts;

    // Validate that both halves are valid hex strings before creating Buffers
    if (!/^[0-9a-fA-F]+$/.test(ivHex) || !/^[0-9a-fA-F]+$/.test(encHex)) {
        throw new Error(
            "Decryption failed: stored value contains non-hex characters. " +
            "Please reconnect your database."
        );
    }

    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encHex, "hex");
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
}
