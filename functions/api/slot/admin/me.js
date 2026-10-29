import { json, requireAdmin } from "../_utils.js";

export async function onRequestGet(context) {
  const initialized = Boolean(await context.env.DB.prepare("SELECT id FROM admins LIMIT 1").first());
  const admin = initialized ? await requireAdmin(context) : null;
  return json({ initialized, authenticated: Boolean(admin), username: admin?.username || null });
}
