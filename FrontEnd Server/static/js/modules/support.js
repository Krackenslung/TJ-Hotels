// ================= Soporte (Frontend only) =================

import { $ } from "./dom.js";

let supportBound = false;

function showSupportToast(message) {
  const toastEl = $("supportToast");
  const bodyEl = $("supportToastBody");
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

export function bindSupportEventsIfPossible() {
  if (supportBound) return;

  const form = $("supportForm");
  const btnClear = $("btnSupportClear");
  const btnEmail = $("btnSupportEmail");

  if (!form || !btnClear || !btnEmail) return;

  supportBound = true;

  const $name = $("supportName");
  const $email = $("supportEmail");
  const $topic = $("supportTopic");
  const $msg = $("supportMsg");
  const $hint = $("supportHint");

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
      view: "soporte",
    };

    const key = "tj_support_tickets";
    const prev = JSON.parse(localStorage.getItem(key) || "[]");
    prev.unshift(item);
    localStorage.setItem(key, JSON.stringify(prev));

    showSupportToast("✅ Mensaje enviado. Gracias, te contactaremos pronto.");

    if ($msg) $msg.value = "";
  });
}
