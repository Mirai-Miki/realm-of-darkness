import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { resolve } from "path";

// Load environment variables from root .env
config({ path: resolve(process.cwd(), "../../.env") });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
