document.querySelectorAll("[data-current-year]").forEach(element => {
  element.textContent = new Date().getFullYear();
});

const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.getElementById("primary-nav");
if (menuToggle && navigation) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
    navigation.classList.toggle("open", !isOpen);
  });
  navigation.addEventListener("click", event => {
    if (!event.target.closest("a")) return;
    navigation.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
  });
}

const cookieBanner = document.getElementById("cookie-banner");
const cookieKey = "kazzy_cookie_notice";
if (cookieBanner) {
  let dismissed = document.cookie.split(";").some(cookie => cookie.trim().startsWith(`${cookieKey}=`));
  try {
    dismissed = dismissed || localStorage.getItem(cookieKey) === "dismissed";
  } catch (error) {
    console.warn("Unable to read the cookie notice preference from browser storage.", error);
  }
  cookieBanner.hidden = dismissed;
  document.getElementById("cookie-dismiss").addEventListener("click", () => {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${cookieKey}=dismissed; Max-Age=15552000; Path=/; SameSite=Lax${secure}`;
    try {
      localStorage.setItem(cookieKey, "dismissed");
    } catch (error) {
      console.warn("Unable to save the cookie notice preference in browser storage.", error);
    }
    cookieBanner.hidden = true;
  });
}
