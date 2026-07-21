import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  restorePlaygroundContent,
  snapshotPlaygroundContent,
} from "./playground-state.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function globalSetup() {
  const root = path.resolve(__dirname, "..", "..");

  snapshotPlaygroundContent(root);

  try {
    execFileSync("php", [path.join(root, "tools", "seed-playground.php")], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env },
    });
  } catch (error) {
    restorePlaygroundContent(root);
    throw error;
  }
}
