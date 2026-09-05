import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Runs a command with the repo-root .env loaded. The Prisma CLI only looks for
 * a .env next to the schema, but this project keeps a single .env at the root.
 */
const here = path.dirname(fileURLToPath(import.meta.url));

for (const file of [path.resolve(here, "../../.env"), path.resolve(here, "../.env")]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Optional: the command below reports anything that is actually missing.
  }
}

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: node scripts/with-env.mjs <command> [args...]");
  process.exit(1);
}

// Joined into one string because shell:true does not escape separate arguments.
const child = spawn([command, ...args].join(" "), { stdio: "inherit", shell: true });

child.on("exit", (code) => process.exit(code ?? 0));
