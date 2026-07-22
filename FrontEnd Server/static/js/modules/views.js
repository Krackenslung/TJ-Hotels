// ================= Views =================
// Cambio de vistas del SPA (/app) + carga perezosa de cada vista.

import { $ } from "./dom.js";
import { API_KEY } from "./config.js";
import { HotelsMap } from "./hotelsMap.js";
import { FavoritesMap } from "./favoritesMap.js";
import { bindSupportEventsIfPossible } from "./support.js";

let currentView = "inicio";
let hotelsMapLoaded = false;
let featuredLoaded = false;
let reviewsLoaded = false;

export function getCurrentView() {
  return currentView;
}

// ================= Featured (Inicio) =================

// ========================================
// Inicializa los hoteles destacados si el DOM está listo
// ========================================
async function initFeaturedIfPossible() {
  if (featuredLoaded) return;

  const hasDOM =
    $("featuredGroup") && $("featuredGroupClone") && $("featuredTrack");
  if (!hasDOM) return;

  if (!window.FeaturedPlaces?.loadAndRender) {
    console.warn("FeaturedPlaces no disponible");
    return;
  }

  featuredLoaded = true;
  try {
    await window.FeaturedPlaces.loadAndRender(API_KEY);
    console.log("FeaturedPlaces cargó ✅");
    await initReviewsIfPossible();
  } catch (err) {
    console.error("FeaturedPlaces falló:", err);
    featuredLoaded = false;
  }
}

// ========================================
// Inicializa las reseñas si el DOM está listo
// ========================================
async function initReviewsIfPossible() {
  if (reviewsLoaded) return;

  const hasDOM =
    $("reviewsGroup") &&
    $("reviewsGroupClone") &&
    $("reviewsTrack") &&
    $("reviewsNote");
  if (!hasDOM) return;

  if (!window.FeaturedPlaces?.loadAndRenderReviewsFromFeatured) {
    console.warn("Reviews no disponibles");
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
    console.error("Reviews fallaron:", err);
    reviewsLoaded = false;
  }
}

// ========================================
// Oculta todas las vistas de la aplicación
// ========================================
function hideAllViews() {
  ["view-inicio", "view-grid", "view-soporte"].forEach((id) => {
    const el = $(id);
    if (el) el.classList.remove("active");
  });
}

// ========================================
// Aplica filtros de la UI a la vista activa (Places API)
// ========================================
export function applyFilters() {
  if (currentView === "hoteles") {
    HotelsMap.applyClientFilters?.();
    return;
  }
  if (currentView === "favoritos") {
    FavoritesMap.applyClientFilters?.();
  }
}

// ========================================
// Establece y muestra la vista activa
// ========================================
export function setActiveView(view) {
  currentView = view;

  document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(`.nav-item[data-view="${view}"]`).forEach((b) => b.classList.add("active"));

  const filtersBar = $("filtersBar");
  const actions = $("hotelsActions");

  const showFilters = ["hoteles", "favoritos"].includes(view);
  if (filtersBar) filtersBar.style.display = showFilters ? "" : "none";
  if (actions) actions.style.display = view === "hoteles" ? "" : "none";

  hideAllViews();

  if (view === "inicio") {
    $("view-inicio")?.classList.add("active");
    initFeaturedIfPossible();
    return;
  }

  if (["hoteles", "favoritos"].includes(view)) {
    $("view-grid")?.classList.add("active");

    const listTitle = $("listTitle");
    if (listTitle) listTitle.textContent = view === "favoritos" ? "Favoritos" : "Hoteles";

    if (view === "hoteles") {
      if (!hotelsMapLoaded) {
        hotelsMapLoaded = true;
        HotelsMap.loadAndRender(API_KEY).catch((err) => {
          console.error(err);
          hotelsMapLoaded = false;
          if (actions) actions.style.display = "none";
        });
      } else {
        HotelsMap.applyClientFilters?.();
      }
      return;
    }

    if (view === "favoritos") {
      FavoritesMap.loadFavorites(API_KEY).catch((err) => {
        console.error("Error cargando favoritos:", err);
      });
      return;
    }
  }

  if (view === "soporte") {
    $("view-soporte")?.classList.add("active");
    bindSupportEventsIfPossible();
  }
}
