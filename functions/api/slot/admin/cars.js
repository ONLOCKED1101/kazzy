import { json, publicCar, readJson, requireAdmin, requireSameOrigin, validateCar } from "../_utils.js";

export async function onRequestGet(context) {
  if (!await requireAdmin(context)) return json({ error: "Sign in to manage listings." }, 401);
  const result = await context.env.DB.prepare("SELECT * FROM cars ORDER BY updated_at DESC LIMIT 500").all();
  return json({ cars: (result.results || []).map(publicCar) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!requireSameOrigin(request)) return json({ error: "Request origin was not accepted." }, 403);
  if (!await requireAdmin(context)) return json({ error: "Sign in to manage listings." }, 401);
  const checked = validateCar(await readJson(request));
  if (checked.error) return json({ error: checked.error }, 400);
  const car = checked.car;
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO cars (id, title, make, model, year, price_ngn, condition, mileage_km, cylinders, transmission, fuel_type, interior_color, exterior_color, vin, vehicle_id, location, description, features_json, media_json, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    id, car.title, car.make, car.model, car.year, car.priceNgn, car.condition, car.mileageKm, car.cylinders,
    car.transmission, car.fuelType, car.interiorColor, car.exteriorColor, car.vin, car.vehicleId, car.location,
    car.description, JSON.stringify(car.features), JSON.stringify(car.media), car.status
  ).run();
  const row = await env.DB.prepare("SELECT * FROM cars WHERE id = ?").bind(id).first();
  return json({ car: publicCar(row) }, 201);
}
