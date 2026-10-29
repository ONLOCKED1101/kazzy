import { json, passwordHash, randomHex, readJson, requireSameOrigin } from "../_utils.js";

async function constantTimeMatch(left, right) {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(left)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(right))
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!requireSameOrigin(request)) return json({ error: "Request origin was not accepted." }, 403);
  if (!env.DB || !env.ADMIN_SETUP_KEY) return json({ error: "Admin setup is not configured. Contact the site administrator." }, 503);
  const body = await readJson(request);
  if (!body || typeof body !== "object") return json({ error: "Provide setup details." }, 400);
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const setupKey = typeof body.setupKey === "string" ? body.setupKey : "";
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) return json({ error: "Username must be 3–32 letters, numbers, or underscores." }, 400);
  if (password.length < 12 || password.length > 128) return json({ error: "Password must be 12–128 characters." }, 400);
  if (!await constantTimeMatch(setupKey, env.ADMIN_SETUP_KEY)) return json({ error: "The one-time setup key is invalid." }, 403);

  const existing = await env.DB.prepare("SELECT id FROM admins LIMIT 1").first();
  if (existing) return json({ error: "Initial admin setup has already been completed. Sign in instead." }, 409);

  const salt = randomHex(16);
  const hash = await passwordHash(password, salt);
  try {
    await env.DB.prepare("INSERT INTO admins (id, username, password_salt, password_hash) VALUES (1, ?, ?, ?)")
      .bind(username, salt, hash).run();
  } catch (error) {
    console.error("Could not create the initial Kazzy Autos admin.", error);
    return json({ error: "Admin setup could not be completed. Confirm setup is still available and try again." }, 409);
  }
  return json({ message: "Initial admin account created. Sign in to manage listings." }, 201);
}
