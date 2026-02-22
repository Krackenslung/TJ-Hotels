// Hoteles cerca usando Places Nearby Search + marcador de ubicación
window.HotelsMap = (function () {
  let map = null;
  let infoWindow = null;
  let userMarker = null;
  let userCircle = null;
  let placeMarkers = [];

  let lastCenter = null;
  let lastPlacesRaw = [];     // resultados originales Places
  let radiusMeters = 5000;    // default 5km

  const DEFAULT_CENTER = { lat: 32.5149, lng: -117.0382 }; // Tijuana fallback

  function clearPlaceMarkers() {
    placeMarkers.forEach(m => m.setMap(null));
    placeMarkers = [];
  }

  function setPlaceholder(text) {
    const ph = document.querySelector("#map .map-placeholder");
    if (ph) ph.textContent = text;
  }

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

  function setUserMarker(center) {
    lastCenter = center;

    // Icono estilo "punto azul" simple (sin librerías extra)
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

    // Círculo del radio (opcional pero útil)
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

  function renderListFromPlaces(places) {
    const cards = document.getElementById("cards");
    const count = document.getElementById("count");
    if (count) count.textContent = `${places.length} resultados`;

    if (!cards) return;

    if (!places.length) {
      cards.innerHTML = `<div class="text-muted small p-3">No se encontraron hoteles cercanos.</div>`;
      return;
    }

    cards.innerHTML = places.map((p, idx) => {
      const rating = (p.rating ?? "—");
      const reviews = (p.user_ratings_total ?? 0);
      const addr = (p.vicinity ?? p.formatted_address ?? "Sin dirección");
      const name = p.name ?? "Hotel";
      const placeId = p.place_id;

      const gmapsUrl = placeId
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(placeId)}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " " + addr)}`;

      return `
        <div class="card-hotel" data-place="${placeId || ""}" data-idx="${idx}">
          <div class="thumb">🏨</div>
          <div class="meta">
            <div class="title">${name}</div>
            <div class="sub">⭐ ${rating} • (${Number(reviews).toLocaleString()}) • ${addr}</div>
            <div class="price"><span class="text-muted">Places</span></div>
          </div>
          <div class="d-flex flex-column gap-2 align-items-end">
            <a class="btn btn-primary btn-sm" href="${gmapsUrl}" target="_blank" rel="noopener">Ver en Maps</a>
          </div>
        </div>
      `;
    }).join("");

    cards.querySelectorAll(".card-hotel").forEach((el) => {
      el.addEventListener("click", () => {
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
      fields: ["name", "rating", "user_ratings_total", "website", "photos", "vicinity"]
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

      infoWindow.setContent(`
  <div class="card" style="width: 18rem; max-width: 300px; border-radius:12px; overflow:hidden;">
    
    
    <img src="${photoUrl}" 
         alt="${name}" 
         style="width:100%; height:160px; object-fit:cover; display:block;">

    <div class="card-body p-3">

    <span class="fav-icon" data-pid="${p.place_id}" style="cursor:pointer; user-select:none;">
  <i class="bi bi-heart text-secondary" style="font-size:1.5rem;"></i>
</span>


      <h6 class="card-title mb-1" 
          style="font-weight:700; font-size:1rem;">
        ${name}
      </h6>

      <p class="mb-2" 
         style="font-size:12px; color:#6c757d; line-height:1.3;">
        ${vicinity}
      </p>

      <p class="mb-3" style="font-size:13px;">
        ⭐ ${rating} 
        <small class="text-muted">(${total})</small>
      </p>

      <div class="d-flex gap-2">
        <a 
          ${website 
            ? `href="${website}" target="_blank" rel="noopener noreferrer"` 
            : `href="#" onclick="return false;"`}
          class="btn btn-primary btn-sm flex-fill">
          Website
        </a>

        <a href="${mapsUrl}" 
           target="_blank" 
           rel="noopener noreferrer" 
           class="btn btn-outline-secondary btn-sm flex-fill">
          Maps
        </a>
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

  function searchNearbyHotels(center) {
    return new Promise((resolve, reject) => {
      const service = new google.maps.places.PlacesService(map);

      const request = {
        location: center,
        radius: radiusMeters,
        type: "lodging",
      };

      service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          resolve(results || []);
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          reject(new Error("Places error: " + status));
        }
      });
    });
  }

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

  // ======= filtros client-side sobre Places =======
  function normalize(s) {
    return String(s || "").toLowerCase().trim();
  }

  // OJO: price_level en Places es 0–4 (barato→caro). No son $ reales.
  function matchPriceRange(place, priceRange) {
    if (!priceRange || priceRange === "all") return true;

    const level = place.price_level;
    if (level == null) return true; // si no viene, no lo castigamos

    // mapping aproximado:
    // 0-100 => level 0-1
    // 100-200 => level 2
    // 200+ => level 3-4
    if (priceRange === "0-100") return level <= 1;
    if (priceRange === "100-200") return level === 2;
    if (priceRange === "200-999") return level >= 3;
    return true;
  }

  function matchZone(place, zone) {
    if (!zone || zone === "all") return true;

    // Places no te da "Zona Río" como campo fijo, así que lo aproximamos con texto
    const v = normalize(place.vicinity || place.formatted_address || "");
    const z = normalize(zone);

    // reglas simples:
    if (z.includes("zona río") || z.includes("zona rio")) {
      return v.includes("zona rio") || v.includes("zona río") || v.includes("rio tijuana") || v.includes("paseo de los héroes") || v.includes("agua caliente");
    }
    if (z.includes("centro")) {
      return v.includes("zona centro") || v.includes("centro") || v.includes("revolución") || v.includes("av. revolucion") || v.includes("revolucion");
    }
    if (z.includes("otay")) return v.includes("otay");
    if (z.includes("playas")) return v.includes("playas");
    return v.includes(z);
  }

  function applyClientFiltersFromUI() {
    const q = normalize(document.getElementById("q")?.value);
    const ratingSel = document.getElementById("rating")?.value || "all";
    const priceSel = document.getElementById("price")?.value || "all";
    const zoneSel = document.getElementById("zone")?.value || "all";

    let list = [...lastPlacesRaw];

    // búsqueda
    if (q) {
      list = list.filter(p => {
        const name = normalize(p.name);
        const addr = normalize(p.vicinity || p.formatted_address);
        return name.includes(q) || addr.includes(q);
      });
    }

    // rating
    if (ratingSel !== "all") {
      const minR = Number(ratingSel);
      list = list.filter(p => (p.rating ?? 0) >= minR);
    }

    // zona (aprox)
    if (zoneSel !== "all") {
      list = list.filter(p => matchZone(p, zoneSel));
    }

    // precio (aprox con price_level)
    if (priceSel !== "all") {
      list = list.filter(p => matchPriceRange(p, priceSel));
    }

    renderMarkers(list);
    renderListFromPlaces(list);
  }

  // ======= control flow =======
  async function runSearch({ freshLocation = false } = {}) {
    setPlaceholder("Buscando hoteles cercanos...");

    const center = freshLocation ? await getUserLocation() : (lastCenter || await getUserLocation());

    ensureMap(center);
    setUserMarker(center);

    const places = await searchNearbyHotels(center);
    lastPlacesRaw = places;

    setPlaceholder(places.length ? "" : "Sin resultados");

    // aplica filtros actuales de UI sobre places
    applyClientFiltersFromUI();
  }

  function wireUIControls() {
    const actions = document.getElementById("hotelsActions");
    const btnRefresh = document.getElementById("btnRefreshHotels");
    const btnRecenter = document.getElementById("btnRecenter");
    const radiusSel = document.getElementById("radiusSel");

    if (actions) actions.style.display = ""; // mostrar controles

    if (radiusSel) {
      // set default visible value
      radiusSel.value = String(radiusMeters);

      radiusSel.addEventListener("change", async () => {
        radiusMeters = Number(radiusSel.value) || 5000;
        if (userCircle) userCircle.setRadius(radiusMeters);
        await runSearch({ freshLocation: false });
      });
    }

    if (btnRefresh) {
      btnRefresh.addEventListener("click", async () => {
        // refresh = recalcular ubicación por si el usuario se movió
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

    // Hook a tus filtros existentes:
    // cuando cambian, solo filtramos client-side, no re-consultamos.
    ["q", "price", "rating", "zone"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", applyClientFiltersFromUI);
      el.addEventListener("change", applyClientFiltersFromUI);
    });
  }

  async function initHotelsFlow() {
    setPlaceholder("Cargando mapa...");

    // 1) ubicación actual
    const center = await getUserLocation();

    // 2) mapa + marker usuario
    ensureMap(center);
    setUserMarker(center);

    // 3) ui controls (una vez)
    wireUIControls();

    // 4) buscar hoteles cercanos
    await runSearch({ freshLocation: false });
  }

  return {
    async loadAndRender(apiKey) {
      await window.loadGoogleMapsOnce({ apiKey, libraries: "places" });
      await initHotelsFlow();
    },

    // por si quieres llamarlo desde app.js en el futuro
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
    }
  };
})();