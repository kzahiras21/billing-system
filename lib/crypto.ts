import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function encryptionKey() {
  const encoded = process.env.FIELD_ENCRYPTION_KEY;
  if (!encoded) throw new Error("FIELD_ENCRYPTION_KEY is not configured");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("FIELD_ENCRYPTION_KEY must be exactly 32 random bytes encoded as base64");
  return key;
}

export function encryptSecret(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptSecret(value: string) {
  const [version, ivB64, tagB64, cipherB64] = value.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !cipherB64) {
    throw new Error("Encrypted field format is invalid");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(cipherB64, "base64")), decipher.final()]).toString("utf8");
}
