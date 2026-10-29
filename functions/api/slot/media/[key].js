import { json } from "../_utils.js";

export async function onRequestGet(context) {
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp|mp4|webm)$/.test(context.params.key)) return json({ error: "Media not found." }, 404);
  const object = await context.env.MEDIA.get(context.params.key);
  if (!object) return json({ error: "Media not found." }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", object.httpEtag);
  headers.set("X-Content-Type-Options", "nosniff");
  if (object.customMetadata?.originalName) headers.set("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(object.customMetadata.originalName)}`);
  return new Response(object.body, { headers });
}
