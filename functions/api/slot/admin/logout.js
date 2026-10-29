import { clearSessionCookie, getSessionToken, json, requireSameOrigin, sha256 } from "../_utils.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!requireSameOrigin(request)) return json({ error: "Request origin was not accepted." }, 403);
  const token = getSessionToken(request);
  if (token) {
    await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  }
  return json({ authenticated: false }, 200, { "Set-Cookie": clearSessionCookie(new URL(request.url).protocol === "https:") });
}
