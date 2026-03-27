import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  MCP_HTTP_PORT: z.coerce.number().int().positive().default(3000),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REFRESH_TOKEN: z.string().min(1),
});

const parsedEnv = EnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Variabili d'ambiente mancanti:", parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsedEnv.data;