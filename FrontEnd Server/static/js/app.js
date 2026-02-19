// ================= TJ HOTELS — app.js (alineado con tu app.html actual) =================
console.log("app.js cargó ✅");
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
    // OJO: en tu app.html sí usas quartz-hotel-spa.png, pero aquí traías spa.png
    // Para evitar “imagen rota” en el modal, lo alineo con tus assets del carrusel:
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
    // si no existe este asset en /static/images, ponlo igual a otro que sí tengas
    image: "/static/images/alberca-indoor.png",
    website: "https://www.hotelrealdelrio.com/",
  },
];

const $ = (id) => document.getElementById(id);

let currentView = "inicio";
let hotelsMapLoaded = false;

function getFavs() {
  return new Set(JSON.parse(localStorage.getItem("tj_favs") || "[]"));
}
function setFavs(set) {
  localStorage.setItem("tj_favs", JSON.stringify([...set]));
}

/* ================= Views ================= */

function hideAllViews() {
  // Tu app.html SOLO tiene view-inicio y view-grid.
  // Aun así, dejo los otros ids, pero con guardas (no rompe si no existen).
  ["view-inicio", "view-grid", "view-zonas", "view-ofertas", "view-soporte"].forEach((id) => {
    const el = $(id);
    if (el) el.classList.remove("active");
  });
}

function setActiveView(view) {
  currentView = view;

  // nav active
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
  document
    .querySelectorAll(`.nav-item[data-view="${view}"]`)
    .forEach((b) => b.classList.add("active"));

  // Mostrar/ocultar filtros y acciones
  const filtersBar = $("filtersBar");
  const actions = $("hotelsActions");

  const showFilters = ["hoteles", "favoritos"].includes(view);
  if (filtersBar) filtersBar.style.display = showFilters ? "" : "none";

  // hotelsActions SOLO en hoteles
  if (actions) actions.style.display = view === "hoteles" ? "" : "none";

  hideAllViews();

  // Inicio
  if (view === "inicio") {
    $("view-inicio")?.classList.add("active");
    return;
  }

  // Grid (Hoteles/Favoritos)
  if (["hoteles", "favoritos"].includes(view)) {
    $("view-grid")?.classList.add("active");

    const listTitle = $("listTitle");
    if (listTitle) listTitle.textContent = view === "favoritos" ? "Favoritos" : "Hoteles";

    // ---- HOTELES (Places) ----
    if (view === "hoteles") {
      const API_KEY = "AIzaSyD6qRAcdy-4LRhsUwXp2ADVs_f9wnqHhCk"; // tu key

      if (!hotelsMapLoaded) {
        hotelsMapLoaded = true;

        HotelsMap.loadAndRender(API_KEY).catch((err) => {
          console.error(err);
          hotelsMapLoaded = false; // permite reintentar
          if (actions) actions.style.display = "none";
          // fallback dummy (si Places falla)
          applyFilters();
        });
      } else {
        // Ya cargado: re-aplica filtros UI sobre Places (si existe)
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
/* ================= Render cards ================= */
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

/* ================= Session ================= */
function ensureSession() {
  const user = JSON.parse(sessionStorage.getItem("tj_user") || "null");
  if (!user) window.location.href = "/";

  const hello = $("hello");
  if (hello) hello.textContent = `Hola, ${user.name || "Usuario"}`;
}

/* ================= Events ================= */
document.addEventListener("input", (e) => {
  if (["q", "zone", "rating", "price", "service"].includes(e.target?.id)) applyFilters();
});

document.addEventListener("click", (e) => {
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
  if (e.target?.id === "btnGoOffers") {
    setActiveView("ofertas");
    return;
  }

  // Nav switch
  const navBtn = e.target?.closest?.(".nav-item");
  if (navBtn) {
    const view = navBtn.getAttribute("data-view");
    setActiveView(view);
    return;
  }

  // Quick zones (si luego agregas botones con data-zonequick)
  const zoneQuick = e.target?.getAttribute?.("data-zonequick");
  if (zoneQuick) {
    const zoneSel = $("zone");
    if (zoneSel) zoneSel.value = zoneQuick;
    setActiveView("hoteles");
    applyFilters();
    return;
  }

  // Open modal (solo si existe el modal en tu HTML)
  const openId = e.target?.getAttribute?.("data-open");
  if (openId) {
    const h = dummyHotels.find((x) => x.id === Number(openId));
    if (!h) return;

    const modalEl = document.getElementById("hotelModal");
    const mTitle = $("mTitle");
    const mBody = $("mBody");

    // Si NO pegaste el modal aún, no tronamos:
    if (!modalEl || !mTitle || !mBody || typeof bootstrap === "undefined") {
      // fallback: abrir sitio oficial directo
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

  // Toggle favorite
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

ensureSession();
setActiveView("inicio");