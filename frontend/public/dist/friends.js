"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// --- Utilidades DOM y red de red ---
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
function escapeHTML(s) {
    return (s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function api(url, init) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield fetch(url, Object.assign({ credentials: "include" }, init));
        if (!res.ok) {
            let msg = res.statusText;
            try {
                const j = yield res.json();
                if (j === null || j === void 0 ? void 0 : j.error)
                    msg = j.error;
            }
            catch (_a) { }
            const e = new Error(msg);
            (e.status = res.status);
            throw e;
        }
        return res.json();
    });
}
function userRow(u, actionsHtml = "") {
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
function loadFriends() {
    return __awaiter(this, void 0, void 0, function* () {
        const listEl = $("#list");
        const errBox = $("#err");
        listEl.textContent = "Cargando...";
        errBox.textContent = "";
        try {
            const { friends } = yield api("/api/friends");
            listEl.innerHTML = (friends === null || friends === void 0 ? void 0 : friends.length)
                ? friends.map(u => userRow(u)).join("")
                : `<div class="text-white/60">Todavía no tienes amigos 😢</div>`;
        }
        catch (err) {
            if ((err === null || err === void 0 ? void 0 : err.status) === 401)
                location.href = "/login.html";
            listEl.innerHTML = "";
            errBox.textContent = "❌ Error cargando amigos";
        }
    });
}
// --- Cargar solicitudes pendientes (entrantes / enviadas) ---
function loadPending() {
    return __awaiter(this, void 0, void 0, function* () {
        const box = $("#pending");
        try {
            const { incoming = [], outgoing = [] } = yield api("/api/friends/pending");
            const incHtml = incoming.map(u => userRow(u, `<button class="px-2 py-1 rounded bg-green-600 hover:bg-green-700" data-accept="${u.id}">
                    Aceptar
                  </button>`)).join("");
            const outHtml = outgoing.map(u => userRow(u, `<span class="opacity-70">Solicitado</span>`)).join("");
            box.innerHTML = (incoming.length || outgoing.length)
                ? (incHtml + (outgoing.length ? `<div class="mt-2 opacity-70">Enviadas</div>${outHtml}` : ""))
                : `<div class="text-white/60">No hay solicitudes pendientes.</div>`;
        }
        catch (_a) {
            box.innerHTML = `<div class="text-white/60">No hay solicitudes pendientes.</div>`;
        }
    });
}
// --- Búsqueda por nombre o email ---
let searchTimer = null;
function doSearch(q) {
    return __awaiter(this, void 0, void 0, function* () {
        const results = $("#results");
        if (!q) {
            results.innerHTML = "";
            return;
        }
        try {
            const { users } = yield api(`/api/users/search?q=${encodeURIComponent(q)}`);
            results.innerHTML = (users === null || users === void 0 ? void 0 : users.length)
                ? users.map(u => userRow(u, `<button class="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500" data-add="${u.id}">
                        Añadir
                      </button>`)).join("")
                : `<div class="text-white/60">Sin resultados.</div>`;
        }
        catch (e) {
            results.innerHTML = `<div class="text-red-400">Error buscando: ${escapeHTML((e === null || e === void 0 ? void 0 : e.message) || "desconocido")}</div>`;
        }
    });
}
// --- Acciones: enviar/aceptar ---
function sendFriendRequest(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield api(`/api/friends/${userId}`, { method: "POST" }); // crea 'pending'
    });
}
function acceptFriendRequest(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield api(`/api/friends/${userId}/accept`, { method: "POST" });
    });
}
// --- Init + Listeners (sin onclick inline) ---
function init() {
    var _a;
    // Buscar con debounce
    const search = $("#search");
    if (search) {
        search.addEventListener("input", () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => doSearch(search.value.trim()), 250);
        });
    }
    // Botón "Agregar" por ID (sin inline)
    const friendIdInput = $("#friendId");
    if (friendIdInput) {
        // Crea el botón por código para evitar inline y lo engancha:
        const addBtn = (_a = friendIdInput.parentElement) === null || _a === void 0 ? void 0 : _a.querySelector("button");
        addBtn === null || addBtn === void 0 ? void 0 : addBtn.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
            const id = parseInt(friendIdInput.value, 10);
            if (!Number.isFinite(id) || id <= 0) {
                alert("Introduce un ID válido");
                return;
            }
            try {
                addBtn.setAttribute("disabled", "true");
                yield sendFriendRequest(id);
                alert("✅ Solicitud enviada");
                yield loadPending();
            }
            catch (e) {
                alert("❌ " + ((e === null || e === void 0 ? void 0 : e.message) || "Error enviando solicitud"));
            }
            finally {
                addBtn.removeAttribute("disabled");
            }
        }));
    }
    // Delegación de eventos para botones [data-add] y [data-accept]
    document.addEventListener("click", (ev) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const t = ev.target;
        if ((_a = t === null || t === void 0 ? void 0 : t.dataset) === null || _a === void 0 ? void 0 : _a.add) {
            const id = Number(t.dataset.add);
            if (!Number.isFinite(id))
                return;
            try {
                t.setAttribute("disabled", "true");
                yield sendFriendRequest(id);
                t.textContent = "Solicitado";
                yield loadPending();
            }
            catch (e) {
                alert("❌ " + ((e === null || e === void 0 ? void 0 : e.message) || "Error enviando solicitud"));
            }
            finally {
                t.removeAttribute("disabled");
            }
        }
        if ((_b = t === null || t === void 0 ? void 0 : t.dataset) === null || _b === void 0 ? void 0 : _b.accept) {
            const id = Number(t.dataset.accept);
            if (!Number.isFinite(id))
                return;
            try {
                t.setAttribute("disabled", "true");
                yield acceptFriendRequest(id);
                yield Promise.all([loadPending(), loadFriends()]);
            }
            catch (e) {
                alert("❌ " + ((e === null || e === void 0 ? void 0 : e.message) || "Error aceptando solicitud"));
            }
            finally {
                t.removeAttribute("disabled");
            }
        }
    }));
    // Primera carga
    Promise.all([loadFriends(), loadPending()]).catch(() => { });
}
document.addEventListener("DOMContentLoaded", init);
