import { json, requireAdmin, requireSameOrigin } from "../_utils.js";

const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);
const VIDEO_TYPES = new Map([
  ["video/mp4", "mp4"],
  ["video/webm", "webm"]
]);
const MAX_IMAGE_SIZE = 12 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!requireSameOrigin(request)) return json({ error: "Request origin was not accepted." }, 403);
  if (!await requireAdmin(context)) return json({ error: "Sign in to upload vehicle media." }, 401);
  if (!env.MEDIA) return json({ error: "Vehicle image storage is not configured." }, 503);
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Upload a vehicle photo or video." }, 400);
  }
  const file = form.get("file");
  if (!file || typeof file === "string" || typeof file.stream !== "function") return json({ error: "Choose an image or video file." }, 400);
  const isImage = IMAGE_TYPES.has(file.type);
  const isVideo = VIDEO_TYPES.has(file.type);
  if (!isImage && !isVideo) return json({ error: "Use a JPEG, PNG, WebP, MP4, or WebM file." }, 415);
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  if (file.size < 1 || file.size > maxSize) {
    return json({ error: `File size must be no more than ${Math.floor(maxSize / 1024 / 1024)} MB.` }, 413);
  }

  const extension = (isImage ? IMAGE_TYPES : VIDEO_TYPES).get(file.type);
  const key = `${crypto.randomUUID()}.${extension}`;
  await env.MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { originalName: file.name.slice(0, 180) }
  });
  return json({ media: { key, type: isImage ? "image" : "video", filename: file.name.slice(0, 180), alt: file.name.slice(0, 160) } }, 201);
}
