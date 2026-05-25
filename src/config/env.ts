import * as z from "zod";


const envSchema = z.object({
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  PORT: z.coerce.number().default(3000),
  DB_URL: z.url(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  // DB_HOST: z.string().default("localhost"),
  // DB_PORT: z.coerce.number().default(5433),
  // DB_USER: z.string(),
  // DB_PASSWORD: z.string(),
  // DB_NAME: z.string(),
});

const { success, data, error } = envSchema.safeParse(process.env);

if (!success) {
  console.error(
    "❌ Invalid environment variables:",
    z.flattenError(error).fieldErrors,
  );
  process.exit(1);
}

export const env = data;
