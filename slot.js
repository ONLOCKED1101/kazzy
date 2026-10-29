const listingGrid = document.getElementById("listing-grid");
const searchInput = document.getElementById("slot-search");
const conditionSelect = document.getElementById("slot-condition");
const makeSelect = document.getElementById("slot-make");
const resultCount = document.getElementById("results-count");
const currency = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
let allCars = [];
let searchTimer;

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function conditionLabel(condition) {
  return ({ foreign: "Foreign-used", local: "Nigerian-used", new: "New" })[condition] || "Vehicle";
}

function priceLabel(price) {
  return Number.isFinite(Number(price)) && price !== null ? currency.format(Number(price)) : "Contact for price";
}

function createMediaCarousel(car) {
  const wrapper = makeElement("div", "listing-media");
  const media = Array.isArray(car.media) ? car.media : [];
  let index = 0;
  let mediaElement;
  const update = () => {
    const item = media[index];
    if (!item) {
      mediaElement = makeElement("div", "media-placeholder");
      const message = makeElement("div");
      message.append(makeElement("span", "", "Kazzy Autos"));
      message.append(makeElement("strong", "", car.title));
      message.append(makeElement("span", "", "Vehicle photos coming soon"));
      mediaElement.append(message);
    } else if (item.type === "video") {
      mediaElement = document.createElement("video");
      mediaElement.src = item.url;
      mediaElement.controls = true;
      mediaElement.playsInline = true;
      mediaElement.preload = "metadata";
      mediaElement.setAttribute("aria-label", item.alt || `${car.title} video`);
    } else {
      mediaElement = document.createElement("img");
      mediaElement.src = item.url;
      mediaElement.alt = item.alt || car.title;
      mediaElement.loading = "lazy";
    }
    const old = wrapper.querySelector("img, video, .media-placeholder");
    if (old) old.replaceWith(mediaElement);
    else wrapper.prepend(mediaElement);
    const existingControls = wrapper.querySelector(".media-controls");
    if (existingControls) existingControls.remove();
    if (media.length > 1) {
      const controls = makeElement("div", "media-controls");
      const previous = makeElement("button", "media-control", "←");
      previous.type = "button";
      previous.setAttribute("aria-label", `Previous photo or video for ${car.title}`);
      previous.addEventListener("click", () => { index = (index - 1 + media.length) % media.length; update(); });
      const position = makeElement("span", "media-position", `${index + 1} / ${media.length}`);
      const next = makeElement("button", "media-control", "→");
      next.type = "button";
      next.setAttribute("aria-label", `Next photo or video for ${car.title}`);
      next.addEventListener("click", () => { index = (index + 1) % media.length; update(); });
      controls.append(previous, position, next);
      wrapper.append(controls);
    }
  };
  update();
  const condition = makeElement("span", "listing-condition", conditionLabel(car.condition));
  wrapper.append(condition);
  return wrapper;
}

function createCard(car) {
  const article = makeElement("article", "listing-card");
  article.append(createMediaCarousel(car));
  const details = makeElement("div", "listing-info");
  details.append(makeElement("div", "listing-subtitle", [car.year, conditionLabel(car.condition), car.make].filter(Boolean).join(" · ")));
  details.append(makeElement("h2", "", car.title));
  const price = makeElement("div", "listing-price");
  price.append(document.createTextNode(priceLabel(car.priceNgn)));
  price.append(makeElement("small", "", "Current price and availability confirmed on enquiry"));
  details.append(price);
  const specs = makeElement("div", "listing-specs");
  [car.mileageKm ? `${Number(car.mileageKm).toLocaleString()} km` : null, car.cylinders ? `${car.cylinders}-cylinder` : null, car.transmission, car.fuelType].filter(Boolean).slice(0, 4)
    .forEach(spec => specs.append(makeElement("span", "", spec)));
  if (!specs.childElementCount) specs.append(makeElement("span", "", "Ask us for vehicle specifications"));
  details.append(specs);
  if (car.location) details.append(makeElement("p", "listing-location", `⌖ ${car.location}`));
  const action = makeElement("a", "listing-action", "View vehicle details ↗");
  action.href = `car.html?id=${encodeURIComponent(car.id)}`;
  details.append(action);
  article.append(details);
  return article;
}

function showState(title, message, retry = false) {
  listingGrid.replaceChildren();
  const state = makeElement("div", retry ? "error-state" : "empty-state");
  state.append(makeElement("h2", "", title), makeElement("p", "", message));
  if (retry) {
    const button = makeElement("button", "", "Try again");
    button.type = "button";
    button.addEventListener("click", loadCars);
    state.append(button);
  }
  listingGrid.append(state);
}

function renderCars() {
  const condition = conditionSelect.value;
  const make = makeSelect.value;
  const cars = allCars.filter(car => (!condition || car.condition === condition) && (!make || car.make === make));
  resultCount.textContent = `${cars.length} ${cars.length === 1 ? "vehicle" : "vehicles"}`;
  listingGrid.replaceChildren();
  if (!cars.length) {
    showState("No vehicles match that search", "Try another search or contact Kazzy Autos and we can help find the right car.");
    return;
  }
  cars.forEach(car => listingGrid.append(createCard(car)));
}

async function loadCars() {
  listingGrid.replaceChildren(makeElement("div", "slot-loading", "Loading current vehicle listings…"));
  resultCount.textContent = "";
  const query = searchInput.value.trim();
  try {
    const response = await fetch(`/api/slot/cars${query ? `?q=${encodeURIComponent(query)}` : ""}`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Vehicle listings could not be loaded.");
    if (!Array.isArray(result.cars)) throw new Error("The vehicle listing response was invalid.");
    allCars = result.cars;
    const makes = [...new Set(allCars.map(car => car.make).filter(Boolean))].sort();
    const selectedMake = makeSelect.value;
    makeSelect.replaceChildren(new Option("All makes", ""));
    makes.forEach(make => makeSelect.add(new Option(make, make)));
    if (makes.includes(selectedMake)) makeSelect.value = selectedMake;
    renderCars();
  } catch (error) {
    console.error("Could not load The Slot vehicle listings.", error);
    showState("Listings are temporarily unavailable", "Please try again, or contact Kazzy Autos directly to ask about current vehicles.", true);
  }
}

searchInput.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(loadCars, 250);
});
conditionSelect.addEventListener("change", renderCars);
makeSelect.addEventListener("change", renderCars);
loadCars();
