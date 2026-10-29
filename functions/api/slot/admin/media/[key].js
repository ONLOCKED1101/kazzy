import { json, requireAdmin, requireSameOrigin } from "../../_utils.js";

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  if (!requireSameOrigin(request)) return json({ error: "Request origin was not accepted." }, 403);
  if (!await requireAdmin(context)) return json({ error: "Sign in to remove vehicle media." }, 401);
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp|mp4|webm)$/.test(params.key)) return json({ error: "Invalid media key." }, 400);
  await env.MEDIA.delete(params.key);
  return json({ deleted: true });
}
