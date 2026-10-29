import { json, publicCar } from "../_utils.js";

export async function onRequestGet(context) {
  const row = await context.env.DB.prepare("SELECT * FROM cars WHERE id = ? AND status = 'available'")
    .bind(context.params.id).first();
  if (!row) return json({ error: "This vehicle is not currently listed." }, 404);
  return json({ car: publicCar(row) });
}
