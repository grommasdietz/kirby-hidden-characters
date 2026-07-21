import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { restorePlaygroundContent } from "./playground-state.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function globalTeardown() {
  const root = path.resolve(__dirname, "..", "..");

  try {
    execFileSync("php", [path.join(root, "tools", "reset-playground.php")], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env },
    });
  } finally {
    restorePlaygroundContent(root);
  }
}
