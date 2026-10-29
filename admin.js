const setupPanel = document.getElementById("setup-panel");
const loginPanel = document.getElementById("login-panel");
const adminApp = document.getElementById("admin-app");
const configMessage = document.getElementById("configuration-message");
const carForm = document.getElementById("car-form");
const mediaQueue = document.getElementById("media-queue");
let editingCar = null;
let keptMedia = [];

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...options });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`The server returned an invalid response (${response.status}).`);
  }
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}

function showStatus(id, message) {
  document.getElementById(id).textContent = message;
}

function jsonOptions(method, value) {
  return { method, headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(value) };
}

function showAuthenticated(username) {
  setupPanel.hidden = true;
  loginPanel.hidden = true;
  adminApp.hidden = false;
  document.querySelector(".admin-heading .eyebrow").textContent = `Signed in as ${username}`;
  loadListings();
}

function renderMediaQueue() {
  mediaQueue.replaceChildren();
  keptMedia.forEach((media, index) => {
    const chip = document.createElement("span");
    chip.className = "media-chip";
    chip.append(document.createTextNode(`${media.type === "video" ? "Video" : "Photo"}: ${media.filename || media.alt || "Vehicle media"}`));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.setAttribute("aria-label", `Remove ${media.filename || "media"}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      keptMedia.splice(index, 1);
      renderMediaQueue();
    });
    chip.append(remove);
    mediaQueue.append(chip);
  });
  [...document.getElementById("car-media").files].forEach(file => {
    const chip = document.createElement("span");
    chip.className = "media-chip";
    chip.textContent = `${file.type.startsWith("video/") ? "Video" : "Photo"}: ${file.name} (new)`;
    mediaQueue.append(chip);
  });
}

function resetEditor() {
  editingCar = null;
  keptMedia = [];
  carForm.reset();
  document.getElementById("car-location").value = "Lagos, Ipaja";
  document.getElementById("editor-title").textContent = "Add a vehicle";
  document.getElementById("cancel-edit").hidden = true;
  document.getElementById("car-media").value = "";
  showStatus("editor-status", "");
  renderMediaQueue();
}

function startEditing(car) {
  editingCar = car;
  keptMedia = [...car.media];
  document.getElementById("editor-title").textContent = `Edit ${car.title}`;
  document.getElementById("cancel-edit").hidden = false;
  const values = {
    title: car.title,
    make: car.make,
    model: car.model,
    year: car.year ?? "",
    priceNgn: car.priceNgn ?? "",
    condition: car.condition,
    mileageKm: car.mileageKm ?? "",
    cylinders: car.cylinders ?? "",
    transmission: car.transmission || "",
    fuelType: car.fuelType || "",
    interiorColor: car.interiorColor || "",
    exteriorColor: car.exteriorColor || "",
    vin: car.vin || "",
    vehicleId: car.vehicleId || "",
    location: car.location || "",
    status: car.status,
    description: car.description || "",
    features: car.features.join("\n")
  };
  for (const [name, value] of Object.entries(values)) carForm.elements.namedItem(name).value = value;
  document.getElementById("car-media").value = "";
  showStatus("editor-status", "");
  renderMediaQueue();
  document.getElementById("car-title").focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderListings(cars) {
  const list = document.getElementById("admin-list");
  list.replaceChildren();
  if (!cars.length) {
    const empty = document.createElement("p");
    empty.textContent = "No listings yet. Use the form above to add your first vehicle.";
    list.append(empty);
    return;
  }
  cars.forEach(car => {
    const row = document.createElement("article");
    row.className = "admin-listing";
    const details = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = car.title;
    const status = document.createElement("span");
    status.textContent = `${car.year || "Year not set"} · ${car.status} · ${car.media.length} media item${car.media.length === 1 ? "" : "s"}`;
    details.append(title, status);
    const actions = document.createElement("div");
    actions.className = "admin-listing-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => startEditing(car));
    actions.append(edit);
    if (car.status === "available") {
      const view = document.createElement("a");
      view.href = `car.html?id=${encodeURIComponent(car.id)}`;
      view.textContent = "View";
      view.className = "admin-button";
      actions.append(view);
    }
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
      if (!window.confirm(`Permanently delete "${car.title}" and its uploaded media?`)) return;
      remove.disabled = true;
      try {
        await api(`/api/slot/admin/cars/${encodeURIComponent(car.id)}`, { method: "DELETE", headers: { Accept: "application/json" } });
        if (editingCar?.id === car.id) resetEditor();
        await loadListings();
      } catch (error) {
        console.error("Could not delete vehicle listing.", error);
        showStatus("editor-status", error.message);
        remove.disabled = false;
      }
    });
    actions.append(remove);
    row.append(details, actions);
    list.append(row);
  });
}

async function loadListings() {
  const list = document.getElementById("admin-list");
  list.replaceChildren(Object.assign(document.createElement("p"), { textContent: "Loading listings…" }));
  try {
    const result = await api("/api/slot/admin/cars", { headers: { Accept: "application/json" } });
    if (!Array.isArray(result.cars)) throw new Error("The server returned an invalid listing list.");
    renderListings(result.cars);
  } catch (error) {
    console.error("Could not load admin vehicle listings.", error);
    list.replaceChildren(Object.assign(document.createElement("p"), { textContent: error.message }));
  }
}

document.getElementById("setup-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const status = document.getElementById("setup-status");
  const button = form.querySelector('button[type="submit"]');
  if (data.get("password") !== data.get("confirm")) {
    status.textContent = "Passwords do not match.";
    return;
  }
  button.disabled = true;
  status.textContent = "Creating the initial admin account…";
  try {
    await api("/api/slot/admin/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username: data.get("username"), password: data.get("password"), setupKey: data.get("setupKey") })
    });
    form.reset();
    setupPanel.hidden = true;
    loginPanel.hidden = false;
    document.getElementById("login-username").value = data.get("username");
    showStatus("login-status", "Admin account created. Sign in with your new credentials.");
  } catch (error) {
    console.error("Initial admin setup failed.", error);
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

document.getElementById("login-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  showStatus("login-status", "Signing in…");
  try {
    const result = await api("/api/slot/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username: data.get("username"), password: data.get("password") })
    });
    form.reset();
    showAuthenticated(result.username);
  } catch (error) {
    console.error("Admin sign-in failed.", error);
    showStatus("login-status", error.message);
  } finally {
    button.disabled = false;
  }
});

document.getElementById("logout-button").addEventListener("click", async () => {
  try {
    await api("/api/slot/admin/logout", { method: "POST", headers: { Accept: "application/json" } });
    adminApp.hidden = true;
    loginPanel.hidden = false;
    showStatus("login-status", "You have signed out.");
    resetEditor();
  } catch (error) {
    console.error("Admin sign-out failed.", error);
    showStatus("editor-status", error.message);
  }
});

document.getElementById("car-media").addEventListener("change", renderMediaQueue);
document.getElementById("cancel-edit").addEventListener("click", resetEditor);
carForm.addEventListener("submit", async event => {
  event.preventDefault();
  const button = carForm.querySelector('button[type="submit"]');
  const status = document.getElementById("editor-status");
  const selectedFiles = [...document.getElementById("car-media").files];
  if (keptMedia.length + selectedFiles.length > 20) {
    status.textContent = "A vehicle can have no more than 20 photos and videos.";
    return;
  }
  button.disabled = true;
  status.textContent = "Uploading vehicle media and saving listing…";
  const uploaded = [];
  try {
    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append("file", file);
      const upload = await api("/api/slot/admin/media", { method: "POST", body: formData, headers: { Accept: "application/json" } });
      if (!upload.media?.key) throw new Error(`The upload response for ${file.name} was invalid.`);
      uploaded.push(upload.media);
    }
    const values = new FormData(carForm);
    const media = [...keptMedia, ...uploaded.map(item => ({ ...item, alt: item.filename }))];
    const car = {
      title: values.get("title"),
      make: values.get("make"),
      model: values.get("model"),
      year: values.get("year"),
      priceNgn: values.get("priceNgn"),
      condition: values.get("condition"),
      mileageKm: values.get("mileageKm"),
      cylinders: values.get("cylinders"),
      transmission: values.get("transmission"),
      fuelType: values.get("fuelType"),
      interiorColor: values.get("interiorColor"),
      exteriorColor: values.get("exteriorColor"),
      vin: values.get("vin"),
      vehicleId: values.get("vehicleId"),
      location: values.get("location"),
      status: values.get("status"),
      description: values.get("description"),
      features: values.get("features").split(/\r?\n/).map(feature => feature.trim()).filter(Boolean),
      media
    };
    const path = editingCar
      ? `/api/slot/admin/cars/${encodeURIComponent(editingCar.id)}`
      : "/api/slot/admin/cars";
    await api(path, jsonOptions(editingCar ? "PUT" : "POST", car));
    resetEditor();
    showStatus("editor-status", "Vehicle listing saved.");
    await loadListings();
  } catch (error) {
    console.error("Could not save vehicle listing.", error);
    status.textContent = error.message;
    for (const item of uploaded) {
      try {
        await api(`/api/slot/admin/media/${encodeURIComponent(item.key)}`, { method: "DELETE", headers: { Accept: "application/json" } });
      } catch (cleanupError) {
        console.error("Could not remove an unused media upload.", cleanupError);
      }
    }
  } finally {
    button.disabled = false;
  }
});

async function initializeAdmin() {
  try {
    const result = await api("/api/slot/admin/me", { headers: { Accept: "application/json" } });
    if (result.authenticated) {
      showAuthenticated(result.username);
    } else if (result.initialized) {
      loginPanel.hidden = false;
    } else {
      setupPanel.hidden = false;
    }
  } catch (error) {
    console.error("Could not check admin configuration.", error);
    configMessage.hidden = false;
    document.getElementById("configuration-copy").textContent = error.message;
  }
}

initializeAdmin();
