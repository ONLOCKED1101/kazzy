import { json, publicCar, readJson, requireAdmin, requireSameOrigin, validateCar } from "../../_utils.js";

async function removeUnusedMedia(bucket, oldMedia, nextMedia) {
  const retained = new Set(nextMedia.filter(item => item.key).map(item => item.key));
  const removed = oldMedia.filter(item => item.key && !retained.has(item.key)).map(item => item.key);
  if (removed.length) await bucket.delete(removed);
}

export async function onRequestPut(context) {
  const { request, env, params } = context;
  if (!requireSameOrigin(request)) return json({ error: "Request origin was not accepted." }, 403);
  if (!await requireAdmin(context)) return json({ error: "Sign in to manage listings." }, 401);
  const existing = await env.DB.prepare("SELECT * FROM cars WHERE id = ?").bind(params.id).first();
  if (!existing) return json({ error: "Vehicle listing not found." }, 404);
  const checked = validateCar(await readJson(request));
  if (checked.error) return json({ error: checked.error }, 400);
  const car = checked.car;
  await env.DB.prepare(
    "UPDATE cars SET title = ?, make = ?, model = ?, year = ?, price_ngn = ?, condition = ?, mileage_km = ?, cylinders = ?, transmission = ?, fuel_type = ?, interior_color = ?, exterior_color = ?, vin = ?, vehicle_id = ?, location = ?, description = ?, features_json = ?, media_json = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(
    car.title, car.make, car.model, car.year, car.priceNgn, car.condition, car.mileageKm, car.cylinders,
    car.transmission, car.fuelType, car.interiorColor, car.exteriorColor, car.vin, car.vehicleId, car.location,
    car.description, JSON.stringify(car.features), JSON.stringify(car.media), car.status, params.id
  ).run();
  let oldMedia = [];
  try {
    oldMedia = JSON.parse(existing.media_json || "[]");
  } catch {
    console.error("Could not parse previous vehicle media while updating listing.", params.id);
  }
  await removeUnusedMedia(env.MEDIA, oldMedia, car.media);
  const row = await env.DB.prepare("SELECT * FROM cars WHERE id = ?").bind(params.id).first();
  return json({ car: publicCar(row) });
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  if (!requireSameOrigin(request)) return json({ error: "Request origin was not accepted." }, 403);
  if (!await requireAdmin(context)) return json({ error: "Sign in to manage listings." }, 401);
  const existing = await env.DB.prepare("SELECT media_json FROM cars WHERE id = ?").bind(params.id).first();
  if (!existing) return json({ error: "Vehicle listing not found." }, 404);
  await env.DB.prepare("DELETE FROM cars WHERE id = ?").bind(params.id).run();
  let media = [];
  try {
    media = JSON.parse(existing.media_json || "[]");
  } catch {
    console.error("Could not parse vehicle media while deleting listing.", params.id);
  }
  const keys = media.filter(item => item.key).map(item => item.key);
  if (keys.length) await env.MEDIA.delete(keys);
  return json({ deleted: true });
}
