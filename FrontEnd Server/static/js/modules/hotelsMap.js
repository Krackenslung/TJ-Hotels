// ================= HOTELES MAP MODULE =================

// ========================================
// Módulo para gestionar el mapa de hoteles cercanos (Places API)
// ========================================

import { getFavs } from "./favorites.js";
import { filterPlaces } from "./placeFilters.js";
import { DEFAULT_CENTER } from "./config.js";

let map = null;
let infoWindow = null;
let userMarker = null;
let userCircle = null;
let placeMarkers = [];

let lastCenter = null;
let lastPlacesRaw = [];
let radiusMeters = 5000;

// ----------------------------------------
// Limpia todos los marcadores de lugares del mapa
// ----------------------------------------
function clearPlaceMarkers() {
  placeMarkers.forEach((m) => m.setMap(null));
  placeMarkers = [];
}

// ----------------------------------------
// Establece el texto del placeholder del mapa
// ----------------------------------------
function setPlaceholder(text) {
  const ph = document.querySelector("#map .map-placeholder");
  if (ph) ph.textContent = text;
}

// ----------------------------------------
// Asegura que el mapa esté inicializado
// ----------------------------------------
function ensureMap(center) {
  if (!map) {
    map = new google.maps.Map(document.getElementById("map"), {
      zoom: 14,
      center,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    infoWindow = new google.maps.InfoWindow();
  } else {
    map.setCenter(center);
  }
}

// ----------------------------------------
// Coloca el marcador de ubicación del usuario
// ----------------------------------------
function setUserMarker(center) {
  lastCenter = center;

  const icon = {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 7,
    fillColor: "#2f6bff",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  };

  if (!userMarker) {
    userMarker = new google.maps.Marker({
      position: center,
      map,
      title: "Tu ubicación",
      icon,
      zIndex: 9999,
    });
  } else {
    userMarker.setPosition(center);
    userMarker.setMap(map);
  }

  if (!userCircle) {
    userCircle = new google.maps.Circle({
      map,
      center,
      radius: radiusMeters,
      fillColor: "#2f6bff",
      fillOpacity: 0.08,
      strokeColor: "#2f6bff",
      strokeOpacity: 0.25,
      strokeWeight: 2,
    });
  } else {
    userCircle.setCenter(center);
    userCircle.setRadius(radiusMeters);
    userCircle.setMap(map);
  }
}

// ----------------------------------------
// Renderiza la lista de hoteles en el panel lateral
// ----------------------------------------
function renderListFromPlaces(places) {
  const cards = document.getElementById("cards");
  const count = document.getElementById("count");
  if (count) count.textContent = `${places.length} resultados`;

  if (!cards) return;

  if (!places.length) {
    cards.innerHTML = `<div class="text-muted small p-3">No se encontraron hoteles cercanos.</div>`;
    return;
  }

  const service = new google.maps.places.PlacesService(map);
  const favs = getFavs();

  cards.innerHTML = places
    .map((p, idx) => {
      const rating = p.rating ?? "—";
      const reviews = p.user_ratings_total ?? 0;
      const addr = p.vicinity ?? p.formatted_address ?? "Sin dirección";
      const name = p.name ?? "Hotel";
      const placeId = p.place_id;
      const isFav = favs.has(placeId);
      const photoUrl = "https://via.placeholder.com/90x90?text=Hotel";

      const gmapsUrl = placeId
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(placeId)}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " " + addr)}`;

      return `
      <div class="card-hotel" data-place="${placeId || ""}" data-idx="${idx}"
           style="border:1px solid #ddd;border-radius:8px;padding:15px;margin-bottom:10px;display:flex;gap:15px;">
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:100px;flex-shrink:0;">
          <div class="thumb" style="width:90px;height:90px;overflow:hidden;border-radius:8px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;">
            <img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;" alt="${name}" data-place-id="${placeId}">
          </div>
          <a class="btn btn-outline-primary btn-sm website-btn" style="width:90px;font-size:11px;"
             href="#" target="_blank" rel="noopener" data-place-id="${placeId}">Website</a>
          <a class="btn btn-outline-secondary btn-sm" style="width:90px;font-size:11px;"
             href="${gmapsUrl}" target="_blank" rel="noopener">Maps</a>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
            <h5 style="font-size:18px;font-weight:600;margin:0;padding-right:10px;">${name}</h5>
            <button class="btn btn-link p-0" style="font-size:20px;color:${isFav ? "#dc3545" : "#6c757d"};"
                    data-fav-place="${placeId}" type="button">
              ${isFav ? "❤️" : "🤍"}
            </button>
          </div>
          <div style="font-size:14px;color:#666;margin-bottom:5px;">
            ⭐ ${rating} • (${Number(reviews).toLocaleString()})
          </div>
          <div style="font-size:13px;color:#999;">📍 ${addr}</div>
        </div>
      </div>
    `;
    })
    .join("");

  // Carga detalles completos (foto + website) de forma asíncrona
  places.forEach((p) => {
    if (!p.place_id) return;

    service.getDetails(
      { placeId: p.place_id, fields: ["photos", "website"] },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const imgEl = cards.querySelector(`img[data-place-id="${p.place_id}"]`);
          if (imgEl && place.photos?.length) {
            imgEl.src = place.photos[0].getUrl({ maxWidth: 90 });
          }

          const webBtn = cards.querySelector(`.website-btn[data-place-id="${p.place_id}"]`);
          if (webBtn) {
            if (place.website) {
              webBtn.href = place.website;
            } else {
              webBtn.href = "#";
              webBtn.onclick = () => false;
              webBtn.style.opacity = "0.5";
            }
          }
        }
      }
    );
  });

  // Click en tarjeta → pan + zoom al marcador
  cards.querySelectorAll(".card-hotel").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.hasAttribute("data-fav-place") || e.target.closest("[data-fav-place]")) return;
      if (e.target.classList.contains("btn") || e.target.closest(".btn")) return;

      const idx = Number(el.getAttribute("data-idx"));
      const p = places[idx];
      if (!p?.geometry?.location) return;

      const pos = p.geometry.location;
      map.panTo(pos);
      map.setZoom(15);

      infoWindow.setContent(`
        <div style="max-width:240px">
          <div style="font-weight:700">${p.name ?? "Hotel"}</div>
          <div style="font-size:12px;opacity:.75">${p.vicinity ?? ""}</div>
          <div style="margin-top:6px;font-size:12px">⭐ ${p.rating ?? "—"} (${p.user_ratings_total ?? 0})</div>
        </div>
      `);
      infoWindow.setPosition(pos);
      infoWindow.open(map);
    });
  });
}

// ----------------------------------------
// Renderiza los marcadores de hoteles en el mapa
// ----------------------------------------
function renderMarkers(places) {
  clearPlaceMarkers();

  places.forEach((p) => {
    if (!p.geometry?.location) return;

    const m = new google.maps.Marker({
      position: p.geometry.location,
      map,
      title: p.name || "Hotel",
    });

    m.addListener("click", () => {
      const service = new google.maps.places.PlacesService(map);

      service.getDetails(
        {
          placeId: p.place_id,
          fields: ["name", "rating", "user_ratings_total", "website", "photos", "vicinity"],
        },
        (place, status) => {
          const name = place?.name || "Hotel";
          const rating = place?.rating ?? "—";
          const total = place?.user_ratings_total ?? 0;
          const vicinity = place?.vicinity ?? "";
          const website = place?.website || null;

          const photoUrl = place?.photos?.length
            ? place.photos[0].getUrl({ maxWidth: 400 })
            : "https://via.placeholder.com/400x300?text=Hotel";

          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(p.place_id)}`;

          const favs = getFavs();
          const isFav = favs.has(p.place_id);

          infoWindow.setContent(`
            <div class="card" style="width:18rem;max-width:300px;border-radius:12px;overflow:hidden;">
              <img src="${photoUrl}" alt="${name}" style="width:100%;height:160px;object-fit:cover;display:block;">
              <div class="card-body p-3">
                <span class="fav-icon" data-pid="${p.place_id}"
                      style="cursor:pointer;user-select:none;position:absolute;top:10px;right:10px;font-size:1.5rem;">
                  <i class="${isFav ? "bi bi-heart-fill text-danger" : "bi bi-heart text-secondary"}"></i>
                </span>
                <h6 class="card-title mb-1" style="font-weight:700;font-size:1rem;">${name}</h6>
                <p class="mb-2" style="font-size:12px;color:#6c757d;line-height:1.3;">${vicinity}</p>
                <p class="mb-3" style="font-size:13px;">⭐ ${rating} <small class="text-muted">(${total})</small></p>
                <div class="d-flex gap-2">
                  ${
                    website
                      ? `<a href="${website}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm flex-fill">Website</a>`
                      : `<button class="btn btn-secondary btn-sm flex-fill" disabled>Sin sitio</button>`
                  }
                  <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-secondary btn-sm flex-fill">Maps</a>
                </div>
              </div>
            </div>
          `);

          infoWindow.open(map, m);
        }
      );
    });

    placeMarkers.push(m);
  });
}

// ----------------------------------------
// Busca hoteles cercanos a una ubicación
// ----------------------------------------
function searchNearbyHotels(center) {
  return new Promise((resolve, reject) => {
    const service = new google.maps.places.PlacesService(map);

    service.nearbySearch(
      { location: center, radius: radiusMeters, type: "lodging" },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          resolve(results || []);
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          reject(new Error("Places error: " + status));
        }
      }
    );
  });
}

// ----------------------------------------
// Obtiene la ubicación GPS del usuario
// ----------------------------------------
async function getUserLocation() {
  return await new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(DEFAULT_CENTER);

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(DEFAULT_CENTER),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

// ----------------------------------------
// Aplica filtros de la UI a la lista de Places
// ----------------------------------------
function applyClientFiltersFromUI() {
  const list = filterPlaces(lastPlacesRaw);
  renderMarkers(list);
  renderListFromPlaces(list);
}

// ----------------------------------------
// Ejecuta una búsqueda de hoteles cercanos
// ----------------------------------------
async function runSearch({ freshLocation = false } = {}) {
  setPlaceholder("Buscando hoteles cercanos...");

  const center = freshLocation
    ? await getUserLocation()
    : lastCenter || (await getUserLocation());

  ensureMap(center);
  setUserMarker(center);

  const places = await searchNearbyHotels(center);
  lastPlacesRaw = places;

  setPlaceholder(places.length ? "" : "Sin resultados");

  applyClientFiltersFromUI();
}

// ----------------------------------------
// Conecta los controles de la UI
// ----------------------------------------
function wireUIControls() {
  const actions = document.getElementById("hotelsActions");
  const btnRefresh = document.getElementById("btnRefreshHotels");
  const btnRecenter = document.getElementById("btnRecenter");
  const radiusSel = document.getElementById("radiusSel");

  if (actions) actions.style.display = "";

  if (radiusSel) {
    radiusSel.value = String(radiusMeters);
    radiusSel.addEventListener("change", async () => {
      radiusMeters = Number(radiusSel.value) || 5000;
      if (userCircle) userCircle.setRadius(radiusMeters);
      await runSearch({ freshLocation: false });
    });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener("click", async () => {
      await runSearch({ freshLocation: true });
    });
  }

  if (btnRecenter) {
    btnRecenter.addEventListener("click", () => {
      if (!map || !lastCenter) return;
      map.panTo(lastCenter);
      map.setZoom(14);
    });
  }

  ["q", "price", "rating", "zone"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", applyClientFiltersFromUI);
    el.addEventListener("change", applyClientFiltersFromUI);
  });
}

// ----------------------------------------
// Flujo completo de inicialización del mapa de hoteles
// ----------------------------------------
async function initHotelsFlow() {
  setPlaceholder("Cargando mapa...");

  const center = await getUserLocation();
  ensureMap(center);
  setUserMarker(center);

  wireUIControls();

  await runSearch({ freshLocation: false });
}

// ── API pública ───────────────────────────────────────────
export const HotelsMap = {
  async loadAndRender(apiKey) {
    await window.loadGoogleMapsOnce({ apiKey, libraries: "places" });
    await initHotelsFlow();
  },

  applyClientFilters: applyClientFiltersFromUI,

  refresh: () => runSearch({ freshLocation: true }),

  recenter: () => {
    if (!map || !lastCenter) return;
    map.panTo(lastCenter);
    map.setZoom(14);
  },

  setRadius: (m) => {
    radiusMeters = Number(m) || 5000;
    if (userCircle) userCircle.setRadius(radiusMeters);
    return runSearch({ freshLocation: false });
  },
};
