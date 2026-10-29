import { json, publicCar } from "./_utils.js";

export async function onRequestGet(context) {
  const search = new URL(context.request.url).searchParams.get("q")?.trim().slice(0, 100) || "";
  const result = await context.env.DB.prepare(
    "SELECT * FROM cars WHERE status = 'available' AND (? = '' OR title LIKE ? OR make LIKE ? OR model LIKE ?) ORDER BY created_at DESC LIMIT 200"
  ).bind(search, `%${search}%`, `%${search}%`, `%${search}%`).all();
  return json({ cars: (result.results || []).map(publicCar) });
}
