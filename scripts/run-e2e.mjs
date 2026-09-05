import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const command = process.argv[2] === "open" ? "e2e:headed" : "e2e:run";
const npmCli = process.env.npm_execpath;
const nextEnvPath = path.join(repoRoot, "frontend", "next-env.d.ts");
const normalNextEnv = `/// <reference types="next" />
/// <reference types="next/image-types/global" />
import "./.next/types/routes.d.ts";
import "./.next/types/root-params.d.ts";

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
`;

let status = 1;

try {
  const result = npmCli
    ? spawnSync(process.execPath, [npmCli, "run", command], { cwd: repoRoot, stdio: "inherit" })
    : spawnSync("npm", ["run", command], { cwd: repoRoot, stdio: "inherit", shell: true });
  status = result.status ?? 1;
} finally {
  writeFileSync(nextEnvPath, normalNextEnv);
}

process.exitCode = status;
