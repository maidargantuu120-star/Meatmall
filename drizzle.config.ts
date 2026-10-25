import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./shared/schema.ts",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || "61e0515df3f53839938d8c530946e375",
    databaseId: process.env.CLOUDFLARE_DATABASE_ID || "aab20aff-ba88-4444-b9da-39ce2ff6dbdc",
    token: process.env.CLOUDFLARE_API_TOKEN || "",
  },
});
