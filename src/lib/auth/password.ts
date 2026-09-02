import argon2 from "argon2";

// OWASP-aligned Argon2id settings that remain practical for an MVP deployment.
const options = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string) {
  return argon2.hash(password, options);
}

export function verifyPassword(passwordHash: string, password: string) {
  // The stored hash already encodes the Argon2id parameters used at creation.
  return argon2.verify(passwordHash, password);
}
