import { json, requireAdmin } from "../_utils.js";

export async function onRequestGet(context) {
  const { DB } = context.env;
  if (!DB) {
    return json({ error: "Cloudflare Pages is missing the D1 binding named DB. Add it in the Pages project settings, then redeploy." }, 503);
  }
  let initialized;
  try {
    initialized = Boolean(await DB.prepare("SELECT id FROM admins LIMIT 1").first());
  } catch (error) {
    if (error instanceof Error && /no such table/i.test(error.message)) {
      console.error("Kazzy Autos admin tables are missing from the bound D1 database.", error);
      return json({ error: "The D1 database is connected, but its tables are not initialized. Run schema.sql in the database's Cloudflare console." }, 503);
    }
    throw error;
  }
  const admin = initialized ? await requireAdmin(context) : null;
  return json({ initialized, authenticated: Boolean(admin), username: admin?.username || null });
}
