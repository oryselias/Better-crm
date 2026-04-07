import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const projectRoot = process.cwd();
const nextDir = path.join(projectRoot, ".next");

try {
  fs.rmSync(nextDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
} catch {
  // Best effort cleanup for stale dev artifacts.
}

const child =
  process.platform === "win32"
    ? spawn("cmd.exe", ["/d", "/s", "/c", "npx next dev --webpack"], {
        cwd: projectRoot,
        stdio: "inherit",
        shell: false,
        env: {
          ...process.env,
          NODE_OPTIONS: "--max-old-space-size=2048",
        },
      })
    : spawn("npx", ["next", "dev", "--webpack"], {
        cwd: projectRoot,
        stdio: "inherit",
        shell: false,
        env: {
          ...process.env,
          NODE_OPTIONS: "--max-old-space-size=2048",
        },
      });

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
