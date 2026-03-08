import fs from "fs";
import path from "path";
import dotenv from "dotenv";

let loaded = false;

export function loadRootEnv(): void {
  if (loaded) return;
  loaded = true;

  const envPath = path.join(process.cwd(), "..", ".env");
  if (!fs.existsSync(envPath)) return;
  dotenv.config({ path: envPath, override: false });
}
