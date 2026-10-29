const detailRoot = document.getElementById("vehicle-detail");
const params = new URLSearchParams(location.search);
const vehicleId = params.get("id");
const ngn = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function addSpec(parent, label, value) {
  if (value === null || value === undefined || value === "") return;
  const item = node("div", "spec-item");
  item.append(node("span", "", label), node("strong", "", String(value)));
  parent.append(item);
}

function renderVehicle(car) {
  document.title = `${car.title} | The Slot · Kazzy Autos`;
  detailRoot.replaceChildren();
  const breadcrumb = node("div", "breadcrumbs");
  const slotLink = node("a", "", "The Slot");
  slotLink.href = "slot.html";
  breadcrumb.append(slotLink, document.createTextNode(" / "), document.createTextNode(car.title));
  detailRoot.append(breadcrumb);

  const columns = node("div", "detail-grid");
  const gallery = node("section", "");
  gallery.setAttribute("aria-label", `${car.title} photos and videos`);
  const stage = node("div", "gallery-stage");
  const media = Array.isArray(car.media) ? car.media : [];
  let currentIndex = 0;
  const thumbs = node("div", "gallery-thumbs");

  function showMedia(index) {
    currentIndex = (index + media.length) % Math.max(media.length, 1);
    stage.replaceChildren();
    const item = media[currentIndex];
    if (!item) {
      const placeholder = node("div", "media-placeholder");
      const text = node("div");
      text.append(node("span", "", "Kazzy Autos"), node("strong", "", car.title), node("span", "", "Vehicle photos coming soon"));
      placeholder.append(text);
      stage.append(placeholder);
      thumbs.replaceChildren();
      return;
    }
    if (item.type === "video") {
      const video = document.createElement("video");
      video.src = item.url;
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.setAttribute("aria-label", item.alt || `${car.title} video`);
      stage.append(video);
    } else {
      const image = document.createElement("img");
      image.src = item.url;
      image.alt = item.alt || car.title;
      image.fetchPriority = "high";
      stage.append(image);
    }
    if (media.length > 1) {
      const previous = node("button", "gallery-arrow prev", "←");
      previous.type = "button";
      previous.setAttribute("aria-label", "Previous vehicle photo or video");
      previous.addEventListener("click", () => showMedia(currentIndex - 1));
      const next = node("button", "gallery-arrow next", "→");
      next.type = "button";
      next.setAttribute("aria-label", "Next vehicle photo or video");
      next.addEventListener("click", () => showMedia(currentIndex + 1));
      const count = node("span", "gallery-count", `${currentIndex + 1} / ${media.length}`);
      stage.append(previous, next, count);
    }
    thumbs.replaceChildren();
    if (media.length > 1) {
      media.forEach((thumbItem, thumbIndex) => {
        const thumb = node("button", "gallery-thumb");
        thumb.type = "button";
        thumb.setAttribute("aria-label", `Show ${thumbItem.type === "video" ? "video" : "photo"} ${thumbIndex + 1}`);
        thumb.setAttribute("aria-current", String(thumbIndex === currentIndex));
        if (thumbItem.type === "video") {
          thumb.append(node("span", "", "Video"));
        } else {
          const image = document.createElement("img");
          image.src = thumbItem.url;
          image.alt = thumbItem.alt || `${car.title}, image ${thumbIndex + 1}`;
          image.loading = "lazy";
          thumb.append(image);
        }
        thumb.addEventListener("click", () => showMedia(thumbIndex));
        thumbs.append(thumb);
      });
    }
  }
  showMedia(0);
  gallery.append(stage, thumbs);

  const copy = node("section", "detail-copy");
  copy.append(node("div", "detail-kicker", `${car.make} · ${car.year || "Year to be confirmed"} · ${({ foreign: "Foreign-used", local: "Nigerian-used", new: "New" })[car.condition] || "Vehicle"}`));
  copy.append(node("h1", "", car.title));
  const metadata = [car.mileageKm ? `${Number(car.mileageKm).toLocaleString()} km` : null, car.cylinders ? `${car.cylinders}-cylinder` : null, car.transmission, car.location].filter(Boolean).join(" · ");
  copy.append(node("div", "detail-meta", metadata || "Contact Kazzy Autos for vehicle specifications"));
  copy.append(node("div", "detail-price", Number.isFinite(Number(car.priceNgn)) && car.priceNgn !== null ? ngn.format(Number(car.priceNgn)) : "Contact for price"));
  copy.append(node("p", "detail-price-note", "Confirm current price, condition, and availability with Kazzy Autos before arranging an inspection."));
  if (car.description) copy.append(node("p", "detail-summary", car.description));
  const actions = node("div", "detail-cta");
  const message = `Hello Kazzy Autos, I am interested in the ${car.title}${car.vehicleId ? ` (Vehicle ID: ${car.vehicleId})` : ""}. Please confirm current availability and price.`;
  const whatsapp = node("a", "button", "Ask about this vehicle ↗");
  whatsapp.href = `https://wa.me/2348131084067?text=${encodeURIComponent(message)}`;
  whatsapp.target = "_blank";
  whatsapp.rel = "noopener noreferrer";
  const inspection = node("a", "button button-secondary", "Book an inspection");
  inspection.href = "index.html#inspection";
  actions.append(whatsapp, inspection);
  copy.append(actions);
  columns.append(gallery, copy);
  detailRoot.append(columns);

  const specs = node("section", "spec-section");
  specs.append(node("h2", "", "Car specifications"));
  const specGrid = node("div", "spec-grid");
  addSpec(specGrid, "Condition", ({ foreign: "Foreign-used", local: "Nigerian-used", new: "New" })[car.condition]);
  addSpec(specGrid, "Year", car.year);
  addSpec(specGrid, "Mileage", car.mileageKm ? `${Number(car.mileageKm).toLocaleString()} km` : null);
  addSpec(specGrid, "Engine", car.cylinders ? `${car.cylinders}-cylinder` : null);
  addSpec(specGrid, "Transmission", car.transmission);
  addSpec(specGrid, "Fuel type", car.fuelType);
  addSpec(specGrid, "Interior color", car.interiorColor);
  addSpec(specGrid, "Exterior color", car.exteriorColor);
  addSpec(specGrid, "VIN", car.vin);
  addSpec(specGrid, "Vehicle ID", car.vehicleId);
  addSpec(specGrid, "Location", car.location);
  specs.append(specGrid);
  detailRoot.append(specs);

  if (Array.isArray(car.features) && car.features.length) {
    const features = node("section", "spec-section");
    features.append(node("h2", "", "Features"));
    const featureList = node("div", "feature-list");
    car.features.forEach(feature => featureList.append(node("span", "feature-chip", feature)));
    features.append(featureList);
    detailRoot.append(features);
  }

  if (car.priceNgn !== null && Number.isFinite(Number(car.priceNgn))) {
    const loan = node("section", "loan-card");
    loan.append(node("h2", "", "Loan calculator"));
    loan.append(node("p", "", "Choose an upfront payment and term for a principal-only illustration."));
    const controls = node("div", "loan-controls");
    const downLabel = node("label", "", "Upfront payment (40–70% of car value)");
    const down = document.createElement("input");
    down.type = "number";
    down.min = String(Math.ceil(Number(car.priceNgn) * .4));
    down.max = String(Math.floor(Number(car.priceNgn) * .7));
    down.step = "50000";
    down.value = String(Math.ceil(Number(car.priceNgn) * .4 / 50000) * 50000);
    downLabel.append(down);
    const termLabel = node("label", "", "Loan term");
    const term = document.createElement("select");
    [6, 12, 24, 36, 48, 60].forEach(months => term.add(new Option(`${months} months`, String(months))));
    term.value = "60";
    termLabel.append(term);
    controls.append(downLabel, termLabel);
    const result = node("div", "loan-result");
    result.append(node("span", "", "Estimated monthly principal repayment"));
    const estimate = node("strong", "", "");
    result.append(estimate);
    const disclaimer = node("p", "loan-disclaimer", "Principal-only illustration: excludes interest, insurance, fees, and lender terms. Interest rate and any actual financing offer are available from the finance provider on request; this is not a loan quote.");
    const updateEstimate = () => {
      const value = Number(car.priceNgn);
      const min = value * .4;
      const max = value * .7;
      const upfront = Math.min(max, Math.max(min, Number(down.value) || min));
      down.value = String(Math.round(upfront));
      estimate.textContent = ngn.format(Math.ceil((value - upfront) / Number(term.value)));
    };
    down.addEventListener("input", updateEstimate);
    term.addEventListener("change", updateEstimate);
    updateEstimate();
    loan.append(controls, result, disclaimer);
    detailRoot.append(loan);
  }
}

function showError(message) {
  detailRoot.replaceChildren();
  const state = node("section", "error-state");
  state.append(node("h2", "", "Vehicle details unavailable"), node("p", "", message));
  const link = node("a", "button", "Browse all vehicles");
  link.href = "slot.html";
  link.style.marginTop = "18px";
  state.append(link);
  detailRoot.append(state);
}

async function loadVehicle() {
  if (!vehicleId) {
    showError("Choose a vehicle from The Slot to see its listing.");
    return;
  }
  try {
    const response = await fetch(`/api/slot/cars/${encodeURIComponent(vehicleId)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Vehicle details could not be loaded.");
    if (!result.car) throw new Error("The vehicle listing response was invalid.");
    renderVehicle(result.car);
  } catch (error) {
    console.error("Could not load vehicle detail.", error);
    showError("Please try again, or contact Kazzy Autos to confirm the vehicle's current details and availability.");
  }
}

loadVehicle();
