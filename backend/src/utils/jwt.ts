import crypto from "crypto";

export const generateJWTSecretFromHash = (email: string, passwordHash: string): string => {
  const combined = `${email}:${passwordHash}`;
  return crypto.createHash("sha256").update(combined).digest("hex");
};

