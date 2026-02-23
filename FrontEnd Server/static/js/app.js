console.log("app.js cargó ✅");
const API_KEY = "AIzaSyD6qRAcdy-4LRhsUwXp2ADVs_f9wnqHhCk";

// Dummy list only used for Favoritos view (Places se usa en Hoteles)
const dummyHotels = [
  {
    id: 1,
    name: "Hotel Lucerna Tijuana",
    zone: "Zona Río",
    price: 120,
    rating: 4.7,
    reviews: 1289,
    services: ["wifi", "parking", "gym"],
    address: "Paseo de los Héroes 10902",
    emoji: "🏨",
    image: "/static/images/hotel-lucerna.png",
    website: "https://www.hotellucerna.com/tijuana/",
  },
  {
    id: 2,
    name: "Quartz Hotel & Spa",
    zone: "Zona Río",
    price: 150,
    rating: 4.6,
    reviews: 1299,
    services: ["wifi", "pool", "parking"],
    address: "Blvd. Agua Caliente 10515",
    emoji: "🛁",
    image: "/static/images/quartz-hotel-spa.png",
    website: "https://www.quartzhotel.mx/",
  },
  {
    id: 3,
    name: "Grand Hotel Tijuana",
    zone: "Zona Río",
    price: 110,
    rating: 4.5,
    reviews: 1180,
    services: ["wifi", "pool", "gym", "parking"],
    address: "Blvd. Agua Caliente 4558",
    emoji: "⭐",
    image: "/static/images/grand-one-plaza.png",
    website: "https://www.grandhoteltj.com/",
  },
  {
    id: 4,
    name: "Hotel Ticuán",
    zone: "Centro",
    price: 80,
    rating: 4.2,
    reviews: 1289,
    services: ["wifi", "parking"],
    address: "Av. Revolución 10410",
    emoji: "🏙️",
    image: "/static/images/sleep-in.png",
    website: "https://www.hotelticuan.com/",
  },
  {
    id: 5,
    name: "Hotel Real del Río",
    zone: "Zona Río",
    price: 95,
    rating: 4.1,
    reviews: 640,
    services: ["wifi", "gym"],
    address: "Blvd. Sánchez Taboada",
    emoji: "🌊",
    image: "/static/images/alberca-indoor.png",
    website: "https://www.hotelrealdelrio.com/",
  },
];

const $ = (id) => document.getElementById(id);

let currentView = "inicio";
let hotelsMapLoaded = false;
let featuredLoaded = false;
let reviewsLoaded = false;

function getFavs() {
  return new Set(JSON.parse(localStorage.getItem("tj_favs") || "[]"));
}
function setFavs(set) {
  localStorage.setItem("tj_favs", JSON.stringify([...set]));
}

// ================= Featured (Inicio) =================
async function initFeaturedIfPossible() {
  if (featuredLoaded) return;

  // ✅ Tu HTML NO tiene featuredNote, así que no lo pedimos
  const hasDOM =
    document.getElementById("featuredGroup") &&
    document.getElementById("featuredGroupClone") &&
    document.getElementById("featuredTrack");
  if (!hasDOM) return;

  if (!window.FeaturedPlaces || typeof window.FeaturedPlaces.loadAndRender !== "function") {
    console.warn(
      "FeaturedPlaces no está disponible o no tiene loadAndRender(). " +
        "¿Cargaste featured-places.js antes de app.js?"
    );
    return;
  }

  featuredLoaded = true;
  try {
    await window.FeaturedPlaces.loadAndRender(API_KEY);
    console.log("FeaturedPlaces cargó ✅");

    // Después de cargar featured, intentamos reviews reales
    await initReviewsIfPossible();
  } catch (err) {
    console.error("FeaturedPlaces falló:", err);
    featuredLoaded = false;
  }
}

async function initReviewsIfPossible() {
  if (reviewsLoaded) return;

  const hasDOM =
    document.getElementById("reviewsGroup") &&
    document.getElementById("reviewsGroupClone") &&
    document.getElementById("reviewsTrack") &&
    document.getElementById("reviewsNote");
  if (!hasDOM) return;

  if (
    !window.FeaturedPlaces ||
    typeof window.FeaturedPlaces.loadAndRenderReviewsFromFeatured !== "function"
  ) {
    console.warn("No existe FeaturedPlaces.loadAndRenderReviewsFromFeatured(). Revisa featured-places.js");
    return;
  }

  reviewsLoaded = true;
  try {
    await window.FeaturedPlaces.loadAndRenderReviewsFromFeatured(API_KEY, {
      maxHotels: 6,
      maxCards: 10,
    });
    console.log("Reviews reales cargadas ✅");
  } catch (err) {
    console.error("Reviews reales fallaron:", err);
    reviewsLoaded = false;
  }
}

/* ================= Views ================= */
function hideAllViews() {
  ["view-inicio", "view-grid", "view-zonas", "view-ofertas", "view-soporte"].forEach((id) => {
    const el = $(id);
    if (el) el.classList.remove("active");
  });
}

function setActiveView(view) {
  currentView = view;

  document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(`.nav-item[data-view="${view}"]`).forEach((b) => b.classList.add("active"));

  const filtersBar = $("filtersBar");
  const actions = $("hotelsActions");

  const showFilters = ["hoteles", "favoritos"].includes(view);
  if (filtersBar) filtersBar.style.display = showFilters ? "" : "none";

  if (actions) actions.style.display = view === "hoteles" ? "" : "none";

  hideAllViews();

  // Inicio
  if (view === "inicio") {
    $("view-inicio")?.classList.add("active");
    initFeaturedIfPossible();
    return;
  }

  // Grid (Hoteles/Favoritos)
  if (["hoteles", "favoritos"].includes(view)) {
    $("view-grid")?.classList.add("active");

    const listTitle = $("listTitle");
    if (listTitle) listTitle.textContent = view === "favoritos" ? "Favoritos" : "Hoteles";

    // ---- HOTELES (Places) ----
    if (view === "hoteles") {
      if (!hotelsMapLoaded) {
        hotelsMapLoaded = true;

        HotelsMap.loadAndRender(API_KEY).catch((err) => {
          console.error(err);
          hotelsMapLoaded = false;
          if (actions) actions.style.display = "none";
          applyFilters();
        });
      } else {
        HotelsMap.applyClientFilters?.();
      }
      return;
    }

    // ---- FAVORITOS (dummy) ----
    applyFilters();
    return;
  }

  // Otros (si existen en tu HTML)
  if (view === "zonas") $("view-zonas")?.classList.add("active");
  if (view === "ofertas") $("view-ofertas")?.classList.add("active");
  if (view === "soporte") $("view-soporte")?.classList.add("active");
}

/* ================= Render cards (solo Favoritos) ================= */
function render(list) {
  const favs = getFavs();

  const count = $("count");
  if (count) count.textContent = `${list.length} resultados`;

  const cards = $("cards");
  if (!cards) return;

  if (list.length === 0) {
    cards.innerHTML = `
      <div class="text-muted small p-3">
        No hay resultados para estos filtros.
      </div>
    `;
    return;
  }

  cards.innerHTML = list
    .map(
      (h) => `
    <div class="card-hotel">
      <div class="thumb">${h.emoji}</div>
      <div class="meta">
        <div class="title">${h.name}</div>
        <div class="sub">⭐ ${h.rating} • (${h.reviews.toLocaleString()}) • ${h.address}, ${h.zone}</div>
        <div class="price">$${h.price}/noche</div>
      </div>
      <div class="d-flex flex-column gap-2 align-items-end">
        <button class="btn btn-primary btn-sm" data-open="${h.id}">Ver hotel</button>
        <button class="btn btn-light btn-sm" data-fav="${h.id}">
          ${favs.has(h.id) ? "★ Favorito" : "☆ Favorito"}
        </button>
      </div>
    </div>
  `
    )
    .join("");
}

function getFilteredListBase() {
  if (currentView === "favoritos") {
    const favs = getFavs();
    return dummyHotels.filter((h) => favs.has(h.id));
  }
  return [...dummyHotels];
}

function applyFilters() {
  // Solo aplica si estamos en vistas grid
  if (!["hoteles", "favoritos"].includes(currentView)) return;

  // ✅ Si estás en "hoteles", filtra Places (client-side) y NO dummy
  if (currentView === "hoteles") {
    HotelsMap.applyClientFilters?.();
    return;
  }

  // ✅ "favoritos" sí usa dummyHotels
  const q = (($("q")?.value) || "").toLowerCase();
  const zone = $("zone")?.value || "all";
  const rating = $("rating")?.value || "all";
  const price = $("price")?.value || "all";
  const service = $("service") ? $("service").value : "all";

  let list = getFilteredListBase().filter((h) => {
    const matchQ = !q || h.name.toLowerCase().includes(q) || h.address.toLowerCase().includes(q);
    const matchZone = zone === "all" || h.zone === zone;
    const matchRating = rating === "all" || h.rating >= parseFloat(rating);
    const matchService = service === "all" || h.services.includes(service);

    let matchPrice = true;
    if (price !== "all") {
      const [a, b] = price.split("-").map(Number);
      matchPrice = h.price >= a && h.price <= b;
    }

    return matchQ && matchZone && matchRating && matchPrice && matchService;
  });

  render(list);
}

/* ================= Events ================= */
document.addEventListener("input", (e) => {
  if (["q", "zone", "rating", "price", "service"].includes(e.target?.id)) applyFilters();
});

document.addEventListener("click", (e) => {

  // Login -> ir a página de login
  if (e.target?.id === "btnLogin") {
    window.location.href = "/login";
    return;
  }

  // Logout
  if (e.target?.id === "btnLogout") {
    sessionStorage.clear();
    window.location.href = "/";
    return;
  }

  // Home CTA buttons
  if (e.target?.id === "btnGoHotels") {
    setActiveView("hoteles");
    return;
  }



  // ✅ Botón (nuevo) para ir a Favoritos desde Hoteles
  if (e.target?.id === "btnGoFavs") {
    setActiveView("favoritos");
    applyFilters();
    return;
  }

  // Nav switch
  const navBtn = e.target?.closest?.(".nav-item");
  if (navBtn) {
    const view = navBtn.getAttribute("data-view");
    setActiveView(view);
    return;
  }

  // Quick zones
  const zoneQuick = e.target?.getAttribute?.("data-zonequick");
  if (zoneQuick) {
    const zoneSel = $("zone");
    if (zoneSel) zoneSel.value = zoneQuick;
    setActiveView("hoteles");
    applyFilters();
    return;
  }

  // Open modal (solo favoritos dummy)
  const openId = e.target?.getAttribute?.("data-open");
  if (openId) {
    const h = dummyHotels.find((x) => x.id === Number(openId));
    if (!h) return;

    const modalEl = document.getElementById("hotelModal");
    const mTitle = $("mTitle");
    const mBody = $("mBody");

    if (!modalEl || !mTitle || !mBody || typeof bootstrap === "undefined") {
      window.open(h.website, "_blank", "noopener");
      return;
    }

    const modal = new bootstrap.Modal(modalEl);

    mTitle.textContent = h.name;
    mBody.innerHTML = `
      <div class="row g-3">
        <div class="col-md-5">
          <div class="rounded-3 overflow-hidden border">
            <img src="${h.image}" alt="${h.name}" style="width:100%; height:220px; object-fit:cover;">
          </div>
        </div>
        <div class="col-md-7">
          <div class="mb-2">⭐ <b>${h.rating}</b> (${h.reviews.toLocaleString()} reseñas)</div>
          <div class="mb-2"><b>Zona:</b> ${h.zone}</div>
          <div class="mb-2"><b>Dirección:</b> ${h.address}</div>
          <div class="mb-3"><b>Precio:</b> $${h.price}/noche</div>
          <div class="small text-muted mb-3">Servicios: ${h.services.join(", ")}</div>

          <a class="btn btn-outline-primary btn-sm" href="${h.website}" target="_blank" rel="noopener">
            Abrir sitio oficial (reservas)
          </a>
        </div>
      </div>
    `;
    modal.show();
    return;
  }

  // Toggle favorite (solo favoritos dummy)
  const favId = e.target?.getAttribute?.("data-fav");
  if (favId) {
    const id = Number(favId);
    const favs = getFavs();
    favs.has(id) ? favs.delete(id) : favs.add(id);
    setFavs(favs);
    applyFilters();
    return;
  }
});

/* ================= Boot ================= */
setActiveView("inicio");

document.addEventListener("DOMContentLoaded", () => {
  if (currentView === "inicio") initFeaturedIfPossible();
  bindSupportEventsIfPossible(); // también intentamos bindear soporte al cargar
});


/* ================= Soporte (Frontend only) ================= */
let supportBound = false;

function showSupportToast(message) {
  const toastEl = document.getElementById("supportToast");
  const bodyEl = document.getElementById("supportToastBody");
  if (bodyEl) bodyEl.textContent = message;

  if (!toastEl || typeof bootstrap === "undefined") {
    alert(message);
    return;
  }

  const t = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2200 });
  t.show();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function bindSupportEventsIfPossible() {
  if (supportBound) return;

  const form = document.getElementById("supportForm");
  const btnClear = document.getElementById("btnSupportClear");
  const btnEmail = document.getElementById("btnSupportEmail");

  if (!form || !btnClear || !btnEmail) return;

  supportBound = true;

  const $name = document.getElementById("supportName");
  const $email = document.getElementById("supportEmail");
  const $topic = document.getElementById("supportTopic");
  const $msg = document.getElementById("supportMsg");
  const $hint = document.getElementById("supportHint");

  const SUPPORT_EMAIL = "soporte@tjhotels.com";

  function setHint(txt) {
    if ($hint) $hint.textContent = txt || "";
  }

  btnEmail.addEventListener("click", () => {
    const subject = encodeURIComponent("Soporte TJ Hotels");
    const body = encodeURIComponent("Hola, necesito ayuda con...");
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  });

  btnClear.addEventListener("click", () => {
    if ($name) $name.value = "";
    if ($email) $email.value = "";
    if ($topic) $topic.value = "General";
    if ($msg) $msg.value = "";
    setHint("");
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = ($name?.value || "").trim();
    const email = ($email?.value || "").trim();
    const topic = ($topic?.value || "General").trim();
    const msg = ($msg?.value || "").trim();

    if (name.length < 2) {
      setHint("Escribe tu nombre (mínimo 2 caracteres).");
      return;
    }

    if (!isValidEmail(email)) {
      setHint("Escribe un email válido.");
      return;
    }

    if (msg.length < 10) {
      setHint("Describe tu mensaje (mínimo 10 caracteres).");
      return;
    }

    setHint("");

    const item = {
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()),
      createdAt: new Date().toISOString(),
      name,
      email,
      topic,
      msg,
      view: currentView,
    };

    const key = "tj_support_tickets";
    const prev = JSON.parse(localStorage.getItem(key) || "[]");
    prev.unshift(item);
    localStorage.setItem(key, JSON.stringify(prev));

    showSupportToast("✅ Mensaje enviado. Gracias, te contactaremos pronto.");

    if ($msg) $msg.value = "";
  });
}

/* Re-bind cuando cambias de vista */
const _oldSetActiveView = setActiveView;
setActiveView = function (view) {
  _oldSetActiveView(view);
  if (view === "soporte") bindSupportEventsIfPossible();
};