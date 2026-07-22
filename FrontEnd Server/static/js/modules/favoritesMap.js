// ================= FAVORITOS MAP MODULE =================

// ========================================
// Módulo para gestionar el mapa de favoritos (Places API real)
// ========================================

import { $ } from "./dom.js";
import { getFavs } from "./favorites.js";
import { filterPlaces } from "./placeFilters.js";
import { DEFAULT_CENTER } from "./config.js";

let map = null;
let service = null;
let placesData = [];
let markers = [];

// ----------------------------------------
// Carga y muestra los favoritos en el mapa
// ----------------------------------------
async function loadFavorites(apiKey) {
  // Reutiliza el loader compartido (una sola inyección del script de Maps)
  await window.loadGoogleMapsOnce({ apiKey, libraries: "places" });

  const mapDiv = $("favoritesMap") || $("map");
  if (!mapDiv) return;

  if (!map) {
    map = new google.maps.Map(mapDiv, {
      center: DEFAULT_CENTER,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
  }

  service = new google.maps.places.PlacesService(map);

  const favIds = getFavs();
  if (favIds.size === 0) {
    placesData = [];
    renderFavoritesCards([]);
    renderMarkers([]);
    return;
  }

  const promises = Array.from(favIds).map((placeId) => {
    return new Promise((resolve) => {
      service.getDetails(
        {
          placeId: placeId,
          fields: [
            "name", "rating", "user_ratings_total", "formatted_address",
            "geometry", "price_level", "photos", "website", "place_id",
          ],
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            resolve(place);
          } else {
            console.warn(`Error cargando place_id ${placeId}:`, status);
            resolve(null);
          }
        }
      );
    });
  });

  const results = await Promise.all(promises);
  placesData = results.filter((p) => p !== null);

  applyClientFilters();
}

// ----------------------------------------
// Aplica los filtros de la UI sobre los favoritos cargados
// ----------------------------------------
function applyClientFilters() {
  const list = filterPlaces(placesData);
  renderFavoritesCards(list);
  renderMarkers(list);
}

// ----------------------------------------
// Renderiza los marcadores en el mapa de favoritos
// ----------------------------------------
function renderMarkers(places) {
  markers.forEach((m) => m.setMap(null));
  markers = [];

  if (places.length === 0) return;

  const bounds = new google.maps.LatLngBounds();
  const infoWindow = new google.maps.InfoWindow();

  places.forEach((place) => {
    const position = place.geometry.location;

    const marker = new google.maps.Marker({
      position,
      map,
      title: place.name,
    });

    markers.push(marker);
    bounds.extend(position);

    marker.addListener("click", () => {
      const photoUrl =
        place.photos?.[0]?.getUrl({ maxWidth: 400 }) ||
        "https://via.placeholder.com/400x300?text=Hotel";
      const rating = place.rating || "N/A";
      const total = place.user_ratings_total || 0;
      const vicinity = place.vicinity || place.formatted_address || "";
      const website = place.website || null;
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${encodeURIComponent(place.place_id)}`;

      infoWindow.setContent(`
        <div class="card" style="width:18rem;max-width:300px;border-radius:12px;overflow:hidden;">
          <img src="${photoUrl}" alt="${place.name}" style="width:100%;height:160px;object-fit:cover;display:block;">
          <div class="card-body p-3">
            <h6 class="card-title mb-1" style="font-weight:700;font-size:1rem;">${place.name}</h6>
            <p class="mb-2" style="font-size:12px;color:#6c757d;line-height:1.3;">${vicinity}</p>
            <p class="mb-3" style="font-size:13px;">⭐ ${rating} <small class="text-muted">(${total})</small></p>
            <div class="d-flex gap-2">
              ${
                website
                  ? `<a href="${website}" target="_blank" rel="noopener" class="btn btn-primary btn-sm flex-fill">Website</a>`
                  : `<button class="btn btn-secondary btn-sm flex-fill" disabled>Sin sitio</button>`
              }
              <a href="${mapsUrl}" target="_blank" rel="noopener" class="btn btn-outline-secondary btn-sm flex-fill">Maps</a>
            </div>
          </div>
        </div>
      `);
      infoWindow.open(map, marker);
    });
  });

  if (places.length > 1) {
    map.fitBounds(bounds);
  } else {
    map.setCenter(places[0].geometry.location);
    map.setZoom(15);
  }
}

// ----------------------------------------
// Renderiza las tarjetas de favoritos en el panel lateral
// ----------------------------------------
function renderFavoritesCards(places) {
  const cards = $("cards");
  const count = $("count");

  if (!cards || !count) return;

  count.textContent = `${places.length} favoritos`;

  if (places.length === 0) {
    cards.innerHTML = `
      <div class="text-muted small p-3">
        No tienes favoritos guardados aún. Explora hoteles y agrégalos con ❤️
      </div>
    `;
    return;
  }

  const favs = getFavs();

  cards.innerHTML = places
    .map((place) => {
      const photoUrl =
        place.photos?.[0]?.getUrl({ maxWidth: 400 }) ||
        "https://via.placeholder.com/90x90?text=Hotel";
      const rating = place.rating || "N/A";
      const reviews = place.user_ratings_total || 0;
      const address = place.formatted_address || "";
      const isFav = favs.has(place.place_id);
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${encodeURIComponent(place.place_id)}`;

      return `
      <div class="card-hotel" style="border:1px solid #ddd;border-radius:8px;padding:15px;margin-bottom:10px;display:flex;gap:15px;">
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:100px;flex-shrink:0;">
          <div class="thumb" style="width:90px;height:90px;overflow:hidden;border-radius:8px;background:#f0f0f0;">
            <img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;" alt="${place.name}">
          </div>
          ${
            place.website
              ? `<a class="btn btn-outline-primary btn-sm" style="width:90px;font-size:11px;" href="${place.website}" target="_blank" rel="noopener">Website</a>`
              : `<button class="btn btn-outline-secondary btn-sm" style="width:90px;font-size:11px;" disabled>Sin sitio</button>`
          }
          <a class="btn btn-outline-secondary btn-sm" style="width:90px;font-size:11px;" href="${mapsUrl}" target="_blank" rel="noopener">Maps</a>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
            <h5 style="font-size:18px;font-weight:600;margin:0;padding-right:10px;">${place.name}</h5>
            <button class="btn btn-link p-0" style="font-size:20px;color:${isFav ? "#dc3545" : "#6c757d"};"
                    data-fav-place="${place.place_id}" type="button">
              ${isFav ? "❤️" : "🤍"}
            </button>
          </div>
          <div style="font-size:14px;color:#666;margin-bottom:5px;">
            ⭐ ${rating} • (${Number(reviews).toLocaleString()})
          </div>
          <div style="font-size:13px;color:#999;">
            📍 ${address}
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

// ── API pública ───────────────────────────────────────────
export const FavoritesMap = {
  loadFavorites,
  applyClientFilters,
  getPlaceByPlaceId: (placeId) => placesData.find((p) => p.place_id === placeId),
};
