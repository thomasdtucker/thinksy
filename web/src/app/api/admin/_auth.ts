import { loadRootEnv } from "@/lib/server/loadRootEnv";

export function isAllowed(req: Request): boolean {
  loadRootEnv();
  const token = process.env.THINKSY_ADMIN_TOKEN;
  if (!token) return true;
  return req.headers.get("x-admin-token") === token;
}
