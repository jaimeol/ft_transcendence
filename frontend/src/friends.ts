// --- Utilidades DOM y red de red ---
const $  = (s: string) => document.querySelector(s) as HTMLElement | null;
const $$ = (s: string) => Array.from(document.querySelectorAll(s)) as HTMLElement[];

function escapeHTML(s: string): string {
  return (s || "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!
  ));
}

async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {}
    const e = new Error(msg) as any;
    (e.status = res.status);
    throw e;
  }
  return res.json();
}

// --- Render helpers ---
type UserLite = { id: number; display_name: string; avatar_path?: string; online?: boolean };

function userRow(u: UserLite, actionsHtml = ""): string {
  const avatar = u.avatar_path || "/files/default-avatar.png";
  return `
    <div class="flex items-center gap-3 p-2 rounded bg-white/5 border border-white/10">
      <img src="${avatar}" width="36" height="36" class="avatar object-cover" alt="Avatar">
      <div class="flex-1">
        <div class="font-semibold">${escapeHTML(u.display_name)}</div>
        <div class="opacity-70 text-xs">${u.online ? "🟢 Online" : "⚪ Offline"}</div>
      </div>
      <div class="text-sm">${actionsHtml}</div>
    </div>
  `;
}

// --- Cargar amigos aceptados ---
async function loadFriends() {
  const listEl = $("#list")!;
  const errBox = $("#err")!;
  listEl.textContent = "Cargando...";
  errBox.textContent = "";

  try {
    const { friends } = await api<{ friends: UserLite[] }>("/api/friends");
    listEl.innerHTML = friends?.length
      ? friends.map(u => userRow(u)).join("")
      : `<div class="text-white/60">Todavía no tienes amigos 😢</div>`;
  } catch (err: any) {
    if (err?.status === 401) location.href = "/login.h";
    listEl.innerHTML = "";
    errBox.textContent = "❌ Error cargando amigos";
  }
}

// --- Cargar solicitudes pendientes (entrantes / enviadas) ---
async function loadPending() {
  const box = $("#pending")!;
  try {
    const { incoming = [], outgoing = [] } =
      await api<{ incoming: UserLite[]; outgoing: UserLite[] }>("/api/friends/pending");

    const incHtml = incoming.map(u =>
      userRow(u, `<button class="px-2 py-1 rounded bg-green-600 hover:bg-green-700" data-accept="${u.id}">
                    Aceptar
                  </button>`)
    ).join("");

    const outHtml = outgoing.map(u =>
      userRow(u, `<span class="opacity-70">Solicitado</span>`)
    ).join("");

    box.innerHTML = (incoming.length || outgoing.length)
      ? (incHtml + (outgoing.length ? `<div class="mt-2 opacity-70">Enviadas</div>${outHtml}` : ""))
      : `<div class="text-white/60">No hay solicitudes pendientes.</div>`;
  } catch {
    box.innerHTML = `<div class="text-white/60">No hay solicitudes pendientes.</div>`;
  }
}

// --- Búsqueda por nombre o email ---
let searchTimer: any = null;

async function doSearch(q: string) {
  const results = $("#results")!;
  if (!q) { results.innerHTML = ""; return; }

  try {
    const { users } = await api<{ users: UserLite[] }>(`/api/users/search?q=${encodeURIComponent(q)}`);
    results.innerHTML = users?.length
      ? users.map(u =>
          userRow(u, `<button class="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500" data-add="${u.id}">
                        Añadir
                      </button>`)
        ).join("")
      : `<div class="text-white/60">Sin resultados.</div>`;
  } catch (e: any) {
    results.innerHTML = `<div class="text-red-400">Error buscando: ${escapeHTML(e?.message || "desconocido")}</div>`;
  }
}

// --- Acciones: enviar/aceptar ---
async function sendFriendRequest(userId: number) {
  await api(`/api/friends/${userId}`, { method: "POST" }); // crea 'pending'
}

async function acceptFriendRequest(userId: number) {
  await api(`/api/friends/${userId}/accept`, { method: "POST" });
}

// --- Init + Listeners (sin onclick inline) ---
function init() {
  // Buscar con debounce
  const search = $("#search") as HTMLInputElement | null;
  if (search) {
    search.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => doSearch(search.value.trim()), 250);
    });
  }

  // Botón "Agregar" por ID (sin inline)
  const friendIdInput = $("#friendId") as HTMLInputElement | null;
  if (friendIdInput) {
    // Crea el botón por código para evitar inline y lo engancha:
    const addBtn = friendIdInput.parentElement?.querySelector("button");
    addBtn?.addEventListener("click", async () => {
      const id = parseInt(friendIdInput.value, 10);
      if (!Number.isFinite(id) || id <= 0) {
        alert("Introduce un ID válido");
        return;
      }
      try {
        addBtn.setAttribute("disabled","true");
        await sendFriendRequest(id);
        alert("✅ Solicitud enviada");
        await loadPending();
      } catch (e: any) {
        alert("❌ " + (e?.message || "Error enviando solicitud"));
      } finally {
        addBtn.removeAttribute("disabled");
      }
    });
  }

  // Delegación de eventos para botones [data-add] y [data-accept]
  document.addEventListener("click", async (ev) => {
    const t = ev.target as HTMLElement;
    if (t?.dataset?.add) {
      const id = Number(t.dataset.add);
      if (!Number.isFinite(id)) return;
      try {
        t.setAttribute("disabled","true");
        await sendFriendRequest(id);
        t.textContent = "Solicitado";
        await loadPending();
      } catch (e: any) {
        alert("❌ " + (e?.message || "Error enviando solicitud"));
      } finally {
        t.removeAttribute("disabled");
      }
    }
    if (t?.dataset?.accept) {
      const id = Number(t.dataset.accept);
      if (!Number.isFinite(id)) return;
      try {
        t.setAttribute("disabled","true");
        await acceptFriendRequest(id);
        await Promise.all([loadPending(), loadFriends()]);
      } catch (e: any) {
        alert("❌ " + (e?.message || "Error aceptando solicitud"));
      } finally {
        t.removeAttribute("disabled");
      }
    }
  });

  // Primera carga
  Promise.all([loadFriends(), loadPending()]).catch(()=>{});
}

document.addEventListener("DOMContentLoaded", init);
