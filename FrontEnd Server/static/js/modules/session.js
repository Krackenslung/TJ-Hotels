// ================= AUTENTICACIÓN / SESIÓN =================
// La fuente de verdad es la cookie httpOnly "auth_token" (backend).
// sessionStorage("tj_user") es solo un cache para pintar la UI rápido;
// se valida contra GET /me en cada carga.

import { API_BASE } from "./config.js";

// ========================================
// Obtiene la sesión (cache) del usuario actual
// ========================================
export function getSession() {
  const userStr = sessionStorage.getItem("tj_user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

// ========================================
// Guarda la sesión (cache) del usuario
// ========================================
export function setSession(user) {
  sessionStorage.setItem("tj_user", JSON.stringify(user));
}

// ========================================
// Limpia la sesión del usuario
// ========================================
export function clearSession() {
  sessionStorage.removeItem("tj_user");
}

// ========================================
// Hidrata la sesión desde el backend (GET /me).
// Si la cookie es válida, refresca el cache; si no, lo limpia.
// ========================================
export async function hydrateSession() {
  try {
    const res = await fetch(`${API_BASE}/me`, { credentials: "include" });
    const data = await res.json();
    if (res.ok && data.status === 0) {
      setSession(data.data);
      return data.data;
    }
    clearSession();
    return null;
  } catch (err) {
    // Backend caído: conserva el cache local como mejor esfuerzo
    console.warn("No se pudo hidratar la sesión:", err);
    return getSession();
  }
}

// ========================================
// Actualiza la interfaz según el estado de autenticación
// ========================================
export function updateUserInterface() {
  const userbox = document.querySelector(".userbox");
  if (!userbox) return;

  const user = getSession();

  if (user) {
    const username = user.name || user.username || "Usuario";
    userbox.innerHTML = `
      <span class="user-name me-2 text-light">👤 ${username}</span>
      <button id="btnLogout" class="btn btn-light btn-sm">Cerrar sesión</button>
    `;
  } else {
    userbox.innerHTML = `
      <button id="btnRegister" class="btn btn-light btn-sm">Register</button>
      <button id="btnLogin" class="btn btn-light btn-sm">Iniciar sesión</button>
    `;
  }
}

// ========================================
// Cierra la sesión del usuario actual
// ========================================
export function logout(onDone) {
  fetch(`${API_BASE}/logout`, {
    method: "POST",
    credentials: "include",
  })
    .then(() => {
      clearSession();
      updateUserInterface();

      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "success",
          title: "Sesión cerrada",
          timer: 1200,
          showConfirmButton: false,
        });
      }

      onDone?.();
    })
    .catch((err) => {
      console.error("Error al cerrar sesión:", err);
      clearSession();
      updateUserInterface();
    });
}
