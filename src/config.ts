import { z } from "zod";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
  TELEGRAM_ALLOWED_USER_IDS: z.string().min(1, "TELEGRAM_ALLOWED_USER_IDS is required"),
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("openrouter/free"),
  DB_PATH: z.string().default("./memory.db"),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error("❌ Invalid environment variables:", parseResult.error.format());
  process.exit(1);
}

export const config = {
  ...parseResult.data,
  // Parse allowed IDs into an array of numbers
  ALLOWED_USER_IDS: parseResult.data.TELEGRAM_ALLOWED_USER_IDS
    .split(",")
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id)),
};
