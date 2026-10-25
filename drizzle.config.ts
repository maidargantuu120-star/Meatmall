import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./shared/schema.ts",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: "a6e8bbf781104a317b3b7eb47256bcb8", // Found in error log
    databaseId: "9314a1ba-863a-484f-b84f-1ffc4e017cce",
    token: "To be configured",
  },
});
