declare global {
  interface Window {
    api: (url: string, init?: RequestInit) => Promise<any>;
  }
}

// ========= Utilidades =========
const $ = <T extends HTMLElement = HTMLElement>(s: string, p: Document | HTMLElement = document) =>
  p.querySelector(s) as T | null;
const $$ = <T extends HTMLElement = HTMLElement>(s: string, p: Document | HTMLElement = document) =>
  Array.from(p.querySelectorAll(s)) as T[];

function escapeHTML(s: string = ""): string {
  return s.replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c as "&" | "<" | ">" | '"' | "'"]!)
  );
}
const fmtDate = (s?: string | null) => (!s ? "—" : new Date(s).toLocaleString());

function normalizePath(p?: string | null) {
  const clean = (p ?? "").replace(/["']/g, "").trim();
  // Mantengo tu default; cambia si usas otra ruta.
  return clean || "/uploads/default-avatar.png";
}

// ========= Tipos =========
interface Me {
  id: number | null;
  display_name?: string;
  email?: string;
  avatar_path?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  first_name?: string;
  last_name?: string;
  birthdate?: string;
  elo?: number;
  level?: number;
}
interface Match { winner_id?: number | null; is_draw?: boolean; played_at?: string; }

// ========= Estado =========
const state: { me: Me; matches: Match[] } = {
  me: { id: null },
  matches: []
};

// ========= Charts (CDN) =========
declare const Chart: any;
let pieChart: any, lastChart: any;

function renderCharts({ wins, draws, losses, lastResults }: { wins: number; draws: number; losses: number; lastResults: number[] }) {
  const ctxPie = document.getElementById("chart-pie") as HTMLCanvasElement | null;
  const ctxLast = document.getElementById("chart-last") as HTMLCanvasElement | null;
  if (!ctxPie || !ctxLast || typeof Chart === "undefined") return;

  pieChart?.destroy();
  lastChart?.destroy();

  pieChart = new Chart(ctxPie, {
    type: "doughnut",
    data: { labels: ["Victorias", "Empates", "Derrotas"], datasets: [{ data: [wins, draws, losses], borderWidth: 0 }] },
    options: { plugins: { legend: { labels: { color: "#D4D4D8" } } }, cutout: "60%" }
  });

  const labels = lastResults.map((_, i) => `#${i + 1}`);
  lastChart = new Chart(ctxLast, {
    type: "bar",
    data: { labels, datasets: [{ label: "Resultado (1=Win, 0=Draw, -1=Loss)", data: lastResults, borderWidth: 1 }] },
    options: {
      plugins: { legend: { labels: { color: "#D4D4D8" } } },
      scales: {
        x: { ticks: { color: "#D4D4D8" } },
        y: { ticks: { color: "#D4D4D8" }, suggestedMin: -1, suggestedMax: 1 }
      }
    }
  });
}

// ========= Pintado UI (soporta tus ids y los nuevos) =========
function paintUser(u: Me) {
  // TU BLOQUE ANTIGUO (si existe #info)
  const info = $("#info");
  if (info) {
    const avatar = normalizePath(u?.avatar_path);
    info.innerHTML = `
      <img class="avatar" src="${avatar}" width="72" height="72" alt="Avatar"
        onerror="this.onerror=null; this.src='/default-avatar.png'">
      <div>
        <div class="font-bold">${escapeHTML(u.display_name || "")}</div>
        <div class="opacity-80 text-sm">${escapeHTML(u.email || "")}</div>
      </div>`;
  }

  // NUEVOS IDS (si existen)
  const avUrl = normalizePath(u?.avatar_path);
  const avatarImg = $("#avatar") as HTMLImageElement | null;
  const prevImg = $("#preview-avatar") as HTMLImageElement | null;
  if (avatarImg) {
    avatarImg.src = avUrl;
    avatarImg.onerror = () => ((avatarImg.onerror as any) = null, (avatarImg.src = "/default-avatar.png"));
  }
  if (prevImg) prevImg.src = avUrl;

  $("#player-name") && ($("#player-name")!.textContent = escapeHTML(u.display_name ?? "Jugador"));
  $("#player-email") && ($("#player-email")!.textContent = escapeHTML(u.email ?? "email@dominio.com"));
  $("#member-since") && ($("#member-since")!.textContent = fmtDate(u.created_at));
  $("#level") && ($("#level")!.textContent = String(u.level ?? 1));
  $("#elo") && ($("#elo")!.textContent = String(u.elo ?? 1000));

  $("#ov-display") && ($("#ov-display")!.textContent = u.display_name || "—");
  $("#ov-email") && ($("#ov-email")!.textContent = u.email || "—");
  $("#ov-first") && ($("#ov-first")!.textContent = u.first_name || "—");
  $("#ov-last") && ($("#ov-last")!.textContent = u.last_name || "—");
  $("#ov-birth") && ($("#ov-birth")!.textContent = u.birthdate || "—");
  $("#ov-created") && ($("#ov-created")!.textContent = fmtDate(u.created_at));
  $("#ov-updated") && ($("#ov-updated")!.textContent = fmtDate(u.updated_at));
}

// ========= Data =========
async function me(): Promise<Me | null> {
  try {
    const j = await window.api("/api/auth/me");
    const u: Me = j.user;
    state.me = u;
    paintUser(u);
    return u;
  } catch {
    location.href = "/login.html";
    return null;
  }
}

async function loadMatchesAndStats() {
  try {
    const r = await window.api("/api/users/me/matches");
    state.matches = r?.matches ?? [];
  } catch {
    // demo fallback
    state.matches = [
      { winner_id: 1 }, {}, { winner_id: -1 }, { winner_id: 1 },
      { winner_id: 1 }, {}, { winner_id: -1 }, { winner_id: 1 }
    ];
  }

  const myId = state.me.id;
  let wins = 0, draws = 0, losses = 0;
  const lastResults: number[] = [];

  for (const m of state.matches.slice(-12)) {
    const w = (m.winner_id === undefined || m.winner_id === null)
      ? null
      : Number(m.winner_id);

      if (w === myId) {
        wins++; lastResults.push(1);
      } else if (w === null || m.is_draw === true) {
        draws++; lastResults.push(0);
      } else {
        losses++; lastResults.push(-1);
      }
  }

  const total = wins + draws + losses;
  const winrate = total ? Math.round((wins / total) * 100) : 0;
  let streak = 0; for (let i = lastResults.length - 1; i >= 0; i--) { if (lastResults[i] === 1) streak++; else break; }

  $("#stat-wins") && ($("#stat-wins")!.textContent = String(wins));
  $("#stat-draws") && ($("#stat-draws")!.textContent = String(draws));
  $("#stat-losses") && ($("#stat-losses")!.textContent = String(losses));
  $("#stat-total") && ($("#stat-total")!.textContent = String(total));
  $("#stat-winrate") && ($("#stat-winrate")!.textContent = `${winrate}%`);
  $("#stat-streak") && ($("#stat-streak")!.textContent = String(streak));
  $("#stat-time") && ($("#stat-time")!.textContent = total ? `${total * 5} min` : "—");

  renderCharts({ wins, draws, losses, lastResults });
}

// ========= Formularios/acciones =========
function wireUpdateForm() {
  // TU FORM antiguo id="upd"
  const oldForm = $("#upd") as HTMLFormElement | null;
  oldForm?.addEventListener("submit", async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(oldForm).entries());
    const errBox = $("#err-upd");
    try {
      await window.api("/api/auth/me", { method: "PUT", body: JSON.stringify(data) });
      await me();
      if (errBox) errBox.textContent = "✅ Datos actualizados";
    } catch (err: any) {
      if (errBox) errBox.textContent = err?.message || "Error actualizando perfil";
    }
  });

  // NUEVO form id="form-edit"
  const newForm = $("#form-edit") as HTMLFormElement | null;
  newForm?.addEventListener("submit", async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(newForm).entries());
    const msg = $("#msg-edit");
    try {
      await window.api("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      });
      if (msg) msg.textContent = "✅ Perfil actualizado";
      await me();
    } catch (err: any) {
      if (msg) msg.textContent = `❌ ${err?.message || "Error actualizando perfil"}`;
    }
  });
}

function wireAvatarForm() {
  // Antiguo id="ava"
  const oldForm = $("#ava") as HTMLFormElement | null;
  oldForm?.addEventListener("submit", async e => {
    e.preventDefault();
    const fd = new FormData(oldForm);
    const errBox = $("#err-ava");
    try {
      const res = await fetch("/api/users/me/avatar", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw 0;
      await me();
      if (errBox) errBox.textContent = "✅ Avatar actualizado";
    } catch {
      if (errBox) errBox.textContent = "Error subiendo avatar";
    }
  });

  // Nuevo id="form-avatar"
  const newForm = $("#form-avatar") as HTMLFormElement | null;
  newForm?.addEventListener("submit", async e => {
    e.preventDefault();
    const fd = new FormData(newForm);
    const msg = $("#msg-avatar");
    try {
      const res = await fetch("/api/users/me/avatar", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw 0;
      if (msg) msg.textContent = "✅ Avatar actualizado";
      await me();
    } catch {
      if (msg) msg.textContent = "❌ Error subiendo avatar";
    }
  });

  // Previsualización en ambos casos
  document.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement | null;
    if (t?.id === "avatar-file" && t.files?.[0]) {
      const prev = $("#preview-avatar") as HTMLImageElement | null;
      if (prev) prev.src = URL.createObjectURL(t.files[0]);
    }
  });
}

function wireEmailForm() {
  const form = $("#form-email") as HTMLFormElement | null;
  form?.addEventListener("submit", async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const msg = $("#msg-email");
    try {
      await window.api("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      });
      if (msg) msg.textContent = "✅ Email actualizado";
      await me();
    } catch (err: any) {
      if (msg) msg.textContent = `❌ ${err?.message || "Error actualizando email"}`;
    }
  });
}

export async function logout(e?: Event) {
  e?.preventDefault();
  try {
    await window.api("/api/auth/logout", { method: "POST" });
  } finally {
    location.href = "/";
  }
}

// ========= Acordeón (uno abierto) =========
function wireAccordion() {
  $$<HTMLDetailsElement>(".glass[open], details.glass").forEach(d => {
    d.addEventListener("toggle", () => {
      if (d.open) $$<HTMLDetailsElement>(".glass[open], details.glass").forEach(o => { if (o !== d && o.open) o.open = false; });
    });
  });
}

// ========= Boot =========
document.addEventListener("DOMContentLoaded", async () => {
  wireAccordion();
  wireUpdateForm();
  wireAvatarForm();
  wireEmailForm();
  // Botón logout (nuevo HTML)
  $("#btn-logout")?.addEventListener("click", () => logout());

  const u = await me();
  if (u) await loadMatchesAndStats();
});

export {};
