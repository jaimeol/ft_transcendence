var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// ========= Utilidades =========
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));
function escapeHTML(s = "") {
    return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const fmtDate = (s) => (!s ? "—" : new Date(s).toLocaleString());
function normalizePath(p) {
    const clean = (p !== null && p !== void 0 ? p : "").replace(/["']/g, "").trim();
    // Mantengo tu default; cambia si usas otra ruta.
    return clean || "/uploads/default-avatar.png";
}
// ========= Estado =========
const state = {
    me: { id: null },
    matches: []
};
let pieChart, lastChart;
function renderCharts({ wins, draws, losses, lastResults }) {
    const ctxPie = document.getElementById("chart-pie");
    const ctxLast = document.getElementById("chart-last");
    if (!ctxPie || !ctxLast || typeof Chart === "undefined")
        return;
    pieChart === null || pieChart === void 0 ? void 0 : pieChart.destroy();
    lastChart === null || lastChart === void 0 ? void 0 : lastChart.destroy();
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
function paintUser(u) {
    var _a, _b, _c, _d;
    // TU BLOQUE ANTIGUO (si existe #info)
    const info = $("#info");
    if (info) {
        const avatar = normalizePath(u === null || u === void 0 ? void 0 : u.avatar_path);
        info.innerHTML = `
      <img class="avatar" src="${avatar}" width="72" height="72" alt="Avatar"
        onerror="this.onerror=null; this.src='/default-avatar.png'">
      <div>
        <div class="font-bold">${escapeHTML(u.display_name || "")}</div>
        <div class="opacity-80 text-sm">${escapeHTML(u.email || "")}</div>
      </div>`;
    }
    // NUEVOS IDS (si existen)
    const avUrl = normalizePath(u === null || u === void 0 ? void 0 : u.avatar_path);
    const avatarImg = $("#avatar");
    const prevImg = $("#preview-avatar");
    if (avatarImg) {
        avatarImg.src = avUrl;
        avatarImg.onerror = () => (avatarImg.onerror = null, (avatarImg.src = "/default-avatar.png"));
    }
    if (prevImg)
        prevImg.src = avUrl;
    $("#player-name") && ($("#player-name").textContent = escapeHTML((_a = u.display_name) !== null && _a !== void 0 ? _a : "Jugador"));
    $("#player-email") && ($("#player-email").textContent = escapeHTML((_b = u.email) !== null && _b !== void 0 ? _b : "email@dominio.com"));
    $("#member-since") && ($("#member-since").textContent = fmtDate(u.created_at));
    $("#level") && ($("#level").textContent = String((_c = u.level) !== null && _c !== void 0 ? _c : 1));
    $("#elo") && ($("#elo").textContent = String((_d = u.elo) !== null && _d !== void 0 ? _d : 1000));
    $("#ov-display") && ($("#ov-display").textContent = u.display_name || "—");
    $("#ov-email") && ($("#ov-email").textContent = u.email || "—");
    $("#ov-first") && ($("#ov-first").textContent = u.first_name || "—");
    $("#ov-last") && ($("#ov-last").textContent = u.last_name || "—");
    $("#ov-birth") && ($("#ov-birth").textContent = u.birthdate || "—");
    $("#ov-created") && ($("#ov-created").textContent = fmtDate(u.created_at));
    $("#ov-updated") && ($("#ov-updated").textContent = fmtDate(u.updated_at));
}
// ========= Data =========
function me() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const j = yield window.api("/api/auth/me");
            const u = j.user;
            state.me = u;
            paintUser(u);
            return u;
        }
        catch (_a) {
            location.href = "/login.html";
            return null;
        }
    });
}
function loadMatchesAndStats() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const r = yield window.api("/api/users/me/matches");
            state.matches = (_a = r === null || r === void 0 ? void 0 : r.matches) !== null && _a !== void 0 ? _a : [];
        }
        catch (_b) {
            // demo fallback
            state.matches = [
                { winner_id: 1 }, {}, { winner_id: -1 }, { winner_id: 1 },
                { winner_id: 1 }, {}, { winner_id: -1 }, { winner_id: 1 }
            ];
        }
        const myId = state.me.id;
        let wins = 0, draws = 0, losses = 0;
        const lastResults = [];
        for (const m of state.matches.slice(-12)) {
            if (m.winner_id === myId) {
                wins++;
                lastResults.push(1);
            }
            else if (m.is_draw || !m.winner_id || m.winner_id === 0 || m.winner_id === -1) {
                draws++;
                lastResults.push(0);
            }
            else {
                losses++;
                lastResults.push(-1);
            }
        }
        const total = wins + draws + losses;
        const winrate = total ? Math.round((wins / total) * 100) : 0;
        let streak = 0;
        for (let i = lastResults.length - 1; i >= 0; i--) {
            if (lastResults[i] === 1)
                streak++;
            else
                break;
        }
        $("#stat-wins") && ($("#stat-wins").textContent = String(wins));
        $("#stat-draws") && ($("#stat-draws").textContent = String(draws));
        $("#stat-losses") && ($("#stat-losses").textContent = String(losses));
        $("#stat-total") && ($("#stat-total").textContent = String(total));
        $("#stat-winrate") && ($("#stat-winrate").textContent = `${winrate}%`);
        $("#stat-streak") && ($("#stat-streak").textContent = String(streak));
        $("#stat-time") && ($("#stat-time").textContent = total ? `${total * 5} min` : "—");
        renderCharts({ wins, draws, losses, lastResults });
    });
}
// ========= Formularios/acciones =========
function wireUpdateForm() {
    // TU FORM antiguo id="upd"
    const oldForm = $("#upd");
    oldForm === null || oldForm === void 0 ? void 0 : oldForm.addEventListener("submit", (e) => __awaiter(this, void 0, void 0, function* () {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(oldForm).entries());
        const errBox = $("#err-upd");
        try {
            yield window.api("/api/auth/me", { method: "PUT", body: JSON.stringify(data) });
            yield me();
            if (errBox)
                errBox.textContent = "✅ Datos actualizados";
        }
        catch (err) {
            if (errBox)
                errBox.textContent = (err === null || err === void 0 ? void 0 : err.message) || "Error actualizando perfil";
        }
    }));
    // NUEVO form id="form-edit"
    const newForm = $("#form-edit");
    newForm === null || newForm === void 0 ? void 0 : newForm.addEventListener("submit", (e) => __awaiter(this, void 0, void 0, function* () {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(newForm).entries());
        const msg = $("#msg-edit");
        try {
            yield window.api("/api/auth/me", {
                method: "PUT",
                body: JSON.stringify(data),
                headers: { "Content-Type": "application/json" }
            });
            if (msg)
                msg.textContent = "✅ Perfil actualizado";
            yield me();
        }
        catch (err) {
            if (msg)
                msg.textContent = `❌ ${(err === null || err === void 0 ? void 0 : err.message) || "Error actualizando perfil"}`;
        }
    }));
}
function wireAvatarForm() {
    // Antiguo id="ava"
    const oldForm = $("#ava");
    oldForm === null || oldForm === void 0 ? void 0 : oldForm.addEventListener("submit", (e) => __awaiter(this, void 0, void 0, function* () {
        e.preventDefault();
        const fd = new FormData(oldForm);
        const errBox = $("#err-ava");
        try {
            const res = yield fetch("/api/users/me/avatar", { method: "POST", body: fd, credentials: "include" });
            if (!res.ok)
                throw 0;
            yield me();
            if (errBox)
                errBox.textContent = "✅ Avatar actualizado";
        }
        catch (_a) {
            if (errBox)
                errBox.textContent = "Error subiendo avatar";
        }
    }));
    // Nuevo id="form-avatar"
    const newForm = $("#form-avatar");
    newForm === null || newForm === void 0 ? void 0 : newForm.addEventListener("submit", (e) => __awaiter(this, void 0, void 0, function* () {
        e.preventDefault();
        const fd = new FormData(newForm);
        const msg = $("#msg-avatar");
        try {
            const res = yield fetch("/api/users/me/avatar", { method: "POST", body: fd, credentials: "include" });
            if (!res.ok)
                throw 0;
            if (msg)
                msg.textContent = "✅ Avatar actualizado";
            yield me();
        }
        catch (_a) {
            if (msg)
                msg.textContent = "❌ Error subiendo avatar";
        }
    }));
    // Previsualización en ambos casos
    document.addEventListener("change", (e) => {
        var _a;
        const t = e.target;
        if ((t === null || t === void 0 ? void 0 : t.id) === "avatar-file" && ((_a = t.files) === null || _a === void 0 ? void 0 : _a[0])) {
            const prev = $("#preview-avatar");
            if (prev)
                prev.src = URL.createObjectURL(t.files[0]);
        }
    });
}
function wireEmailForm() {
    const form = $("#form-email");
    form === null || form === void 0 ? void 0 : form.addEventListener("submit", (e) => __awaiter(this, void 0, void 0, function* () {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        const msg = $("#msg-email");
        try {
            yield window.api("/api/auth/me", {
                method: "PUT",
                body: JSON.stringify(data),
                headers: { "Content-Type": "application/json" }
            });
            if (msg)
                msg.textContent = "✅ Email actualizado";
            yield me();
        }
        catch (err) {
            if (msg)
                msg.textContent = `❌ ${(err === null || err === void 0 ? void 0 : err.message) || "Error actualizando email"}`;
        }
    }));
}
export function logout(e) {
    return __awaiter(this, void 0, void 0, function* () {
        e === null || e === void 0 ? void 0 : e.preventDefault();
        try {
            yield window.api("/api/auth/logout", { method: "POST" });
        }
        finally {
            location.href = "/";
        }
    });
}
// ========= Acordeón (uno abierto) =========
function wireAccordion() {
    $$(".glass[open], details.glass").forEach(d => {
        d.addEventListener("toggle", () => {
            if (d.open)
                $$(".glass[open], details.glass").forEach(o => { if (o !== d && o.open)
                    o.open = false; });
        });
    });
}
// ========= Boot =========
document.addEventListener("DOMContentLoaded", () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    wireAccordion();
    wireUpdateForm();
    wireAvatarForm();
    wireEmailForm();
    // Botón logout (nuevo HTML)
    (_a = $("#btn-logout")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", () => logout());
    const u = yield me();
    if (u)
        yield loadMatchesAndStats();
}));
