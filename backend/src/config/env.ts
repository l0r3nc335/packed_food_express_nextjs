import path from "node:path";
import { z } from "zod";

/**
 * Loads .env from the backend folder and the repo root. Values already present
 * in the real environment win, so CI and shell overrides are never clobbered.
 */
function loadEnvFiles(): void {
  const preexisting = { ...process.env };
  const candidates = [
    path.resolve(__dirname, "../../../.env"),
    path.resolve(__dirname, "../../.env"),
  ];

  for (const file of candidates) {
    try {
      process.loadEnvFile(file);
    } catch {
      // A missing .env is fine: the schema below reports what is actually required.
    }
  }

  Object.assign(process.env, preexisting);
}

const urlString = z
  .string()
  .trim()
  .refine((value) => URL.canParse(value), { message: "must be a valid URL" });

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === undefined || value === "" ? undefined : value));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required"),
  FRONTEND_URL: urlString.default("http://localhost:3000"),
  OFF_BASE_URL: urlString.default("https://world.openfoodfacts.org"),
  OFF_USER_AGENT: z
    .string()
    .trim()
    .min(1)
    .default("FoodProductSearch/1.0 (assignment; contact@example.com)"),
  OFF_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  STRIPE_PRICE_ID: optionalString,
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function loadEnv(): Env {
  if (cached) return cached;

  loadEnvFiles();
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  cached = parsed.data;
  return cached;
}

/** Test helper: forces the next loadEnv() call to re-read process.env. */
export function resetEnvCache(): void {
  cached = undefined;
}
