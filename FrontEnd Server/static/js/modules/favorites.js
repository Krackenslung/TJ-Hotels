// ================= FAVORITOS STORAGE =================
// Favoritos persistidos en localStorage bajo "tj_favs".
// Módulo puro de almacenamiento: el refresco de vistas lo hace el caller.

// ========================================
// Obtiene los favoritos del localStorage
// ========================================
export function getFavs() {
  return new Set(JSON.parse(localStorage.getItem("tj_favs") || "[]"));
}

// ========================================
// Guarda los favoritos en localStorage
// ========================================
export function setFavs(set) {
  localStorage.setItem("tj_favs", JSON.stringify([...set]));
}

// ========================================
// Alterna el estado de favorito de un lugar (Places API – string place_id)
// Devuelve true si quedó como favorito.
// ========================================
export function toggleFavorite(placeId) {
  const favs = getFavs();
  if (favs.has(placeId)) {
    favs.delete(placeId);
  } else {
    favs.add(placeId);
  }
  setFavs(favs);
  return favs.has(placeId);
}
