const SESSION_COOKIE = "kazzy_session";
const SESSION_LIFETIME_SECONDS = 8 * 60 * 60;
const PASSWORD_ITERATIONS = 100000;

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers
    }
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function requireSameOrigin(request) {
  const origin = request.headers.get("Origin");
  return origin === new URL(request.url).origin;
}

export function getSessionToken(request) {
  const cookies = request.headers.get("Cookie") || "";
  const cookie = cookies.split(";").map(value => value.trim()).find(value => value.startsWith(`${SESSION_COOKIE}=`));
  return cookie?.slice(SESSION_COOKIE.length + 1) || null;
}

export async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export function constantTimeEqual(left, right) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    difference |= (a[index] || 0) ^ (b[index] || 0);
  }
  return difference === 0;
}

export async function passwordHash(password, salt) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(salt), iterations: PASSWORD_ITERATIONS },
    material,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

export function randomHex(byteLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return bytesToHex(bytes);
}

export function sessionCookie(token, secure = true) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_LIFETIME_SECONDS}${secure ? "; Secure" : ""}`;
}

export function clearSessionCookie(secure = true) {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? "; Secure" : ""}`;
}

export async function requireAdmin(context) {
  const token = getSessionToken(context.request);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await context.env.DB.prepare(
    "SELECT admins.id, admins.username FROM admin_sessions JOIN admins ON admins.id = admin_sessions.admin_id WHERE admin_sessions.token_hash = ? AND julianday(admin_sessions.expires_at) > julianday('now')"
  ).bind(tokenHash).first();
  return row || null;
}

export function publicCar(row) {
  if (!row) return null;
  let media = [];
  let features = [];
  try {
    media = JSON.parse(row.media_json || "[]");
  } catch {
    console.error("Could not parse saved vehicle media.", row.id);
  }
  try {
    features = JSON.parse(row.features_json || "[]");
  } catch {
    console.error("Could not parse saved vehicle features.", row.id);
  }
  return {
    id: row.id,
    title: row.title,
    make: row.make,
    model: row.model,
    year: row.year,
    priceNgn: row.price_ngn,
    condition: row.condition,
    mileageKm: row.mileage_km,
    cylinders: row.cylinders,
    transmission: row.transmission,
    fuelType: row.fuel_type,
    interiorColor: row.interior_color,
    exteriorColor: row.exterior_color,
    vin: row.vin,
    vehicleId: row.vehicle_id,
    location: row.location,
    description: row.description,
    features,
    media: media.map(item => ({
      key: item.key || null,
      type: item.type,
      filename: item.filename || "",
      alt: item.alt || row.title,
      url: item.key ? `/api/slot/media/${encodeURIComponent(item.key)}` : item.url
    })),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function validateCar(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "Provide vehicle details." };
  const text = (value, label, maxLength, required = false) => {
    if (value === null || value === undefined) return required ? `${label} is required.` : null;
    if (typeof value !== "string") return `${label} must be text.`;
    const trimmed = value.trim();
    if (required && !trimmed) return `${label} is required.`;
    if (trimmed.length > maxLength) return `${label} must be ${maxLength} characters or fewer.`;
    return null;
  };
  const fields = [
    ["title", "Vehicle title", 120, true],
    ["make", "Make", 60, true],
    ["model", "Model", 60, true],
    ["condition", "Condition", 20, true],
    ["transmission", "Transmission", 40, false],
    ["fuelType", "Fuel type", 40, false],
    ["interiorColor", "Interior color", 50, false],
    ["exteriorColor", "Exterior color", 50, false],
    ["vin", "VIN", 40, false],
    ["vehicleId", "Vehicle ID", 40, false],
    ["location", "Location", 120, false],
    ["description", "Description", 5000, false]
  ];
  for (const [field, label, limit, required] of fields) {
    const error = text(input[field], label, limit, required);
    if (error) return { error };
  }
  if (!["foreign", "local", "new"].includes(input.condition)) return { error: "Choose foreign-used, Nigerian-used, or new condition." };
  const integerFields = [
    ["year", "Year", 1950, new Date().getFullYear() + 2],
    ["priceNgn", "Price", 0, 100000000000],
    ["mileageKm", "Mileage", 0, 10000000],
    ["cylinders", "Cylinder count", 1, 24]
  ];
  for (const [field, label, min, max] of integerFields) {
    const value = input[field];
    if (value === null || value === undefined || value === "") continue;
    if (!Number.isInteger(Number(value)) || Number(value) < min || Number(value) > max) {
      return { error: `${label} must be a whole number between ${min} and ${max}.` };
    }
  }
  if (!Array.isArray(input.features) || input.features.length > 80 || input.features.some(feature => typeof feature !== "string" || feature.trim().length > 100)) {
    return { error: "Features must be a list of up to 80 items, each no longer than 100 characters." };
  }
  if (!Array.isArray(input.media) || input.media.length > 20) return { error: "Add no more than 20 vehicle photos or videos." };
  for (const item of input.media) {
    if (!item || !["image", "video"].includes(item.type)) return { error: "Each vehicle media item needs a valid image or video type." };
    if (item.key && !/^[a-f0-9-]{36}\.(jpg|png|webp|mp4|webm)$/.test(item.key)) return { error: "A vehicle media item has an invalid upload key." };
    if (!item.key && (typeof item.url !== "string" || !/^[a-zA-Z0-9%._-]+$/.test(item.url) || item.url.includes(".."))) {
      return { error: "A vehicle photo path is invalid." };
    }
    if (item.alt !== undefined && (typeof item.alt !== "string" || item.alt.length > 160)) return { error: "Media descriptions must be 160 characters or fewer." };
  }
  const status = input.status || "available";
  if (!["available", "sold", "draft"].includes(status)) return { error: "Choose available, sold, or draft listing status." };
  return {
    car: {
      title: input.title.trim(),
      make: input.make.trim(),
      model: input.model.trim(),
      year: input.year ? Number(input.year) : null,
      priceNgn: input.priceNgn === "" || input.priceNgn == null ? null : Number(input.priceNgn),
      condition: input.condition,
      mileageKm: input.mileageKm === "" || input.mileageKm == null ? null : Number(input.mileageKm),
      cylinders: input.cylinders === "" || input.cylinders == null ? null : Number(input.cylinders),
      transmission: input.transmission?.trim() || null,
      fuelType: input.fuelType?.trim() || null,
      interiorColor: input.interiorColor?.trim() || null,
      exteriorColor: input.exteriorColor?.trim() || null,
      vin: input.vin?.trim() || null,
      vehicleId: input.vehicleId?.trim() || null,
      location: input.location?.trim() || null,
      description: input.description?.trim() || null,
      features: input.features.map(feature => feature.trim()).filter(Boolean),
      media: input.media,
      status
    }
  };
}

function bytesToHex(bytes) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value) {
  if (!/^(?:[a-f0-9]{2})+$/i.test(value)) throw new Error("Invalid password salt.");
  return Uint8Array.from(value.match(/.{2}/g), byte => Number.parseInt(byte, 16));
}
