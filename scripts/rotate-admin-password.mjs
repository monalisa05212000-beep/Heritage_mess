/**
 * Rotate an admin password.
 *
 * The app has no password-change screen: /api/setup refuses once initial setup is
 * complete, and nothing else writes User.passwordHash. This script is the supported
 * way to rotate, and it reuses the app's own hashPassword() so the Argon2id
 * parameters match exactly what login expects.
 *
 * It also deletes that admin's sessions, so anyone holding the old cookie is signed
 * out — which is the point of rotating after an exposure.
 *
 * Usage (PowerShell):
 *   $env:DATABASE_URL = "<the pooled connection string from Vercel>"
 *   $env:ADMIN_EMAIL  = "<the admin email>"
 *   $env:NEW_PASSWORD = "<at least 12 characters>"
 *   node scripts/rotate-admin-password.mjs
 *
 * Nothing is printed except the outcome. Clear the variables afterwards:
 *   Remove-Item Env:NEW_PASSWORD, Env:DATABASE_URL, Env:ADMIN_EMAIL
 */
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

// Same options as src/lib/auth/password.ts — keep them in step if that file changes.
const ARGON2 = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 };

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.NEW_PASSWORD;

if (!process.env.DATABASE_URL) exit("DATABASE_URL is not set.");
if (!email) exit("ADMIN_EMAIL is not set.");
if (!password) exit("NEW_PASSWORD is not set.");
if (password.length < 12) exit("NEW_PASSWORD must be at least 12 characters (the setup form's own rule).");

function exit(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.findFirst({ where: { email }, select: { id: true, role: true, status: true } });
  if (!user) exit(`No user found with that email address. Nothing was changed.`);
  if (user.role !== "ADMIN") exit(`That account is a ${user.role}, not an ADMIN. Nothing was changed.`);

  const passwordHash = await argon2.hash(password, ARGON2);
  // Verify before writing: a hash login could not read back would lock the owner out.
  if (!(await argon2.verify(passwordHash, password))) exit("The new hash failed its own verification. Nothing was changed.");

  const [, sessions] = await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.adminSession.deleteMany({ where: { userId: user.id } }),
  ]);

  console.log(`✓ Password rotated for ${email}.`);
  console.log(`✓ ${sessions.count} existing admin session(s) invalidated — sign in again with the new password.`);
  if (user.status !== "ACTIVE") console.log(`! Note: this account's status is ${user.status}, so it still cannot sign in.`);
} finally {
  await prisma.$disconnect();
}
