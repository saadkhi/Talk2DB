import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

function getKey(): Buffer {
    const envKey = process.env.DB_ENCRYPTION_KEY;
    if (envKey) {
        try {
            return Buffer.from(envKey, "hex");
        } catch (e) {
            console.warn("Invalid DB_ENCRYPTION_KEY hex format, falling back to hashed secret.");
        }
    }
    // Fallback to hashing NEXTAUTH_SECRET to guarantee exactly 32 bytes and prevent app crashes
    const secret = process.env.NEXTAUTH_SECRET || "talk2db-session-auth-default-encryption-secret-string";
    return crypto.createHash("sha256").update(secret).digest();
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
