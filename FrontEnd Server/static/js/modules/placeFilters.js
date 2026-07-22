// ================= FILTROS CLIENT-SIDE =================
// Filtros compartidos entre la vista Hoteles y Favoritos.
// Operan sobre resultados de la Places API (nearbySearch / getDetails).

export function normalize(s) {
  return String(s || "").toLowerCase().trim();
}

export function matchPriceRange(place, priceRange) {
  if (!priceRange || priceRange === "all") return true;
  const level = place.price_level;
  if (level == null) return true;
  if (priceRange === "0-100") return level <= 1;
  if (priceRange === "100-200") return level === 2;
  if (priceRange === "200-999") return level >= 3;
  return true;
}

export function matchZone(place, zone) {
  if (!zone || zone === "all") return true;
  const v = normalize(place.vicinity || place.formatted_address || "");
  const z = normalize(zone);

  if (z.includes("zona río") || z.includes("zona rio")) {
    return (
      v.includes("zona rio") ||
      v.includes("zona río") ||
      v.includes("rio tijuana") ||
      v.includes("paseo de los héroes") ||
      v.includes("agua caliente")
    );
  }
  if (z.includes("centro")) {
    return (
      v.includes("zona centro") ||
      v.includes("centro") ||
      v.includes("revolución") ||
      v.includes("av. revolucion") ||
      v.includes("revolucion")
    );
  }
  if (z.includes("otay")) return v.includes("otay");
  if (z.includes("playas")) return v.includes("playas");
  return v.includes(z);
}

// ----------------------------------------
// Lee los valores actuales de la barra de filtros
// ----------------------------------------
export function readFiltersFromUI() {
  return {
    q: normalize(document.getElementById("q")?.value),
    rating: document.getElementById("rating")?.value || "all",
    price: document.getElementById("price")?.value || "all",
    zone: document.getElementById("zone")?.value || "all",
  };
}

// ----------------------------------------
// Aplica los filtros de la UI a una lista de Places
// ----------------------------------------
export function filterPlaces(places) {
  const { q, rating, price, zone } = readFiltersFromUI();

  let list = [...places];

  if (q) {
    list = list.filter((p) => {
      const name = normalize(p.name);
      const addr = normalize(p.vicinity || p.formatted_address);
      return name.includes(q) || addr.includes(q);
    });
  }

  if (rating !== "all") {
    const minR = Number(rating);
    list = list.filter((p) => (p.rating ?? 0) >= minR);
  }

  if (zone !== "all") {
    list = list.filter((p) => matchZone(p, zone));
  }

  if (price !== "all") {
    list = list.filter((p) => matchPriceRange(p, price));
  }

  return list;
}
