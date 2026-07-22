// ================= APP ENTRY (/app) =================
// Punto de entrada del SPA: importa los módulos y conecta los eventos
// globales. La lógica vive en static/js/modules/.

import { API_KEY } from "./modules/config.js";
import { toggleFavorite } from "./modules/favorites.js";
import { hydrateSession, updateUserInterface, logout } from "./modules/session.js";
import { setActiveView, getCurrentView, applyFilters } from "./modules/views.js";
import { HotelsMap } from "./modules/hotelsMap.js";
import { FavoritesMap } from "./modules/favoritesMap.js";

console.log("app.js cargó ✅");

// ========================================
// Refresca la vista activa después de alternar un favorito
// ========================================
function afterFavoriteToggle() {
  if (getCurrentView() === "favoritos") {
    FavoritesMap.loadFavorites(API_KEY);
  } else if (getCurrentView() === "hoteles") {
    HotelsMap.applyClientFilters?.();
  }
}

// ================= Events =================

document.addEventListener("input", (e) => {
  if (["q", "zone", "rating", "price", "service"].includes(e.target?.id)) applyFilters();
});

document.addEventListener("click", (e) => {

  // ── Autenticación ──────────────────────────────────────────
  if (e.target?.id === "btnLogin") {
    window.location.href = "/login";
    return;
  }

  if (e.target?.id === "btnRegister") {
    window.location.href = "/register";
    return;
  }

  if (e.target?.id === "btnLogout") {
    logout(() => setActiveView("inicio"));
    return;
  }

  // ── CTAs de navegación ────────────────────────────────────
  if (e.target?.id === "btnGoHotels") {
    setActiveView("hoteles");
    return;
  }

  if (e.target?.id === "btnGoFavs") {
    setActiveView("favoritos");
    return;
  }

  // ── Nav switch ────────────────────────────────────────────
  const navBtn = e.target?.closest?.(".nav-item");
  if (navBtn) {
    const view = navBtn.getAttribute("data-view");
    setActiveView(view);
    return;
  }

  // ── Toggle favorito – Places API (string place_id) ────────
  const favPlaceId = e.target?.getAttribute?.("data-fav-place");
  if (favPlaceId) {
    toggleFavorite(favPlaceId);
    afterFavoriteToggle();
    return;
  }

  // ── Toggle favorito – ícono dentro del InfoWindow de HotelsMap ──
  if (e.target?.classList?.contains("fav-icon") || e.target?.closest(".fav-icon")) {
    const icon = e.target.classList.contains("fav-icon")
      ? e.target
      : e.target.closest(".fav-icon");
    const placeId = icon.getAttribute("data-pid");
    if (placeId) {
      const isFav = toggleFavorite(placeId);
      const heartIcon = icon.querySelector("i");
      if (heartIcon) {
        heartIcon.className = isFav
          ? "bi bi-heart-fill text-danger"
          : "bi bi-heart text-secondary";
      }
      afterFavoriteToggle();
    }
    return;
  }
});

// ================= Boot =================

document.addEventListener("DOMContentLoaded", async () => {
  updateUserInterface();   // pinta rápido desde el cache local
  setActiveView("inicio");

  await hydrateSession();  // valida la sesión real contra GET /me
  updateUserInterface();
});
