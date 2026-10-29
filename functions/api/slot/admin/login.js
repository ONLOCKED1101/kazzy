import { clearSessionCookie, constantTimeEqual, json, passwordHash, randomHex, readJson, requireSameOrigin, sessionCookie, sha256 } from "../_utils.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!requireSameOrigin(request)) return json({ error: "Request origin was not accepted." }, 403);
  if (!env.DB) return json({ error: "Admin sign-in is not configured." }, 503);
  const body = await readJson(request);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(username) || password.length > 128) {
    return json({ error: "Username or password is incorrect." }, 401, { "Set-Cookie": clearSessionCookie(new URL(request.url).protocol === "https:") });
  }

  const address = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipHash = await sha256(address);
  const attempts = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM admin_login_attempts WHERE ip_hash = ? AND succeeded = 0 AND attempted_at > datetime('now', '-15 minutes')"
  ).bind(ipHash).first();
  if (Number(attempts?.count || 0) >= 10) return json({ error: "Too many sign-in attempts. Try again in 15 minutes." }, 429);

  const admin = await env.DB.prepare("SELECT id, username, password_salt, password_hash FROM admins WHERE username = ? COLLATE NOCASE")
    .bind(username).first();
  const salt = admin?.password_salt || "00000000000000000000000000000000";
  const submittedHash = await passwordHash(password, salt);
  const valid = Boolean(admin && constantTimeEqual(submittedHash, admin.password_hash));
  await env.DB.prepare("INSERT INTO admin_login_attempts (ip_hash, succeeded) VALUES (?, ?)")
    .bind(ipHash, valid ? 1 : 0).run();
  if (!valid) return json({ error: "Username or password is incorrect." }, 401, { "Set-Cookie": clearSessionCookie(new URL(request.url).protocol === "https:") });

  const token = randomHex();
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at <= CURRENT_TIMESTAMP").run();
  await env.DB.prepare("INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)")
    .bind(tokenHash, admin.id, expiresAt).run();
  return json(
    { authenticated: true, username: admin.username },
    200,
    { "Set-Cookie": sessionCookie(token, new URL(request.url).protocol === "https:") }
  );
}
