import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const createToken = (): string => randomBytes(32).toString("base64url");

export const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export const tokenHashesMatch = (
  expectedHash: string,
  receivedToken: string,
): boolean => {
  const receivedHash = hashToken(receivedToken);
  const expected = Buffer.from(expectedHash, "hex");
  const received = Buffer.from(receivedHash, "hex");

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
};
