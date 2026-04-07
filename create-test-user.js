/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const repoRoot = __dirname;
const setupScript = path.join(repoRoot, "scripts", "e2e", "setup.mjs");

const result = spawnSync(process.execPath, [setupScript], {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  throw result.error;
}

if (result.status !== null) {
  process.exit(result.status);
} else if (result.signal) {
  console.error(`Setup script killed by signal: ${result.signal}`);
  process.exit(1);
} else {
  process.exit(0);
}
