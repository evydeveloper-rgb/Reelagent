// Load .env.local / .env without extra dependencies (Node >= 20.12).
import { existsSync } from "node:fs";

for (const f of [".env.local", ".env"]) {
  if (existsSync(f)) process.loadEnvFile(f);
}
