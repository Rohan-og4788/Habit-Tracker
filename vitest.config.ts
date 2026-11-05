import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    reporters: ["default"],
    // The integration suite spins up an in-memory MongoDB replica set.
    testTimeout: 60_000,
    hookTimeout: 300_000,
    fileParallelism: false,
  },
});
