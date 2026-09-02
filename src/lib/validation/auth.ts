import { z } from "zod";

const trimmedText = (label: string, min: number, max: number) =>
  z.string().trim().min(min, `${label} is required.`).max(max, `${label} is too long.`);

export const initialSetupSchema = z.object({
  businessName: trimmedText("Business name", 2, 120),
  businessPhone: trimmedText("Business phone", 5, 32),
  adminName: trimmedText("Admin name", 2, 120),
  adminEmail: z.string().trim().toLowerCase().email("Enter a valid admin email address.").max(254),
  adminPassword: z
    .string()
    .min(12, "Use at least 12 characters for the admin password.")
    .max(128, "Password must be 128 characters or fewer."),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  password: z.string().min(1, "Enter your password.").max(128),
});

export const customerAccessSchema = z.object({
  name: trimmedText("Name", 2, 120),
  phone: trimmedText("Phone number", 5, 32),
});

export const businessSettingsSchema = z.object({
  name: trimmedText("Business name", 2, 120),
  phone: trimmedText("Business phone", 5, 32),
  address: z.string().trim().max(500, "Address is too long.").optional(),
});

