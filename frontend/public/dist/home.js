var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function $(sel, parent = document) {
    return parent.querySelector(sel);
}
export function apiFetch(url, init) {
    return __awaiter(this, void 0, void 0, function* () {
        if (window.api) {
            // Si tu api() ya devuelve JSON parseado
            const data = yield window.api(url, init);
            // (Por si acaso alguien hizo que api() devuelva un Response)
            if (data && typeof data === 'object' && 'ok' in data && 'json' in data) {
                const res = data;
                if (!res.ok)
                    throw new Error(String(res.status));
                return (yield res.json());
            }
            return data;
        }
        // Fallback a fetch estándar
        const res = yield fetch(url, Object.assign({ credentials: 'include' }, init));
        if (!res.ok)
            throw new Error(String(res.status));
        return (yield res.json()); // <- importante: invocar json()
    });
}
function escapeHtml(s = '') {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function loadUser() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const j = yield apiFetch('/api/auth/me');
            const u = j.user || {};
            const avatar = u.avatar_path || '/uploads/default-avatar.png';
            (_a = $('#userAvatar')) === null || _a === void 0 ? void 0 : _a.setAttribute('src', avatar);
            $('#userName').textContent = u.display_name || '-';
            $('#userEmail').textContent = u.email || '-';
        }
        catch (_b) {
            location.href = '/login.html';
        }
    });
}
function loadFriendsCount() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { friends } = yield apiFetch('/api/friends');
            const count = Array.isArray(friends) ? friends.length : 0;
            const badge = $('#friendsCount');
            if (badge)
                badge.textContent = `${count} ${count === 1 ? 'amigo' : 'amigos'}`;
        }
        catch (_a) {
        }
    });
}
function wireLogout() {
    var _a;
    (_a = $('#logoutBtn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
        try {
            yield apiFetch('/api/auth/logout', { method: 'POST ' });
        }
        finally {
            location.href = '/';
        }
    }));
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield loadUser();
        yield loadFriendsCount();
        yield loadRecentMatches();
        yield wireLogout();
    });
}
document.addEventListener('DOMContentLoaded', main);
// Helper de fecha “bonita”
const fmtDateTime = (s) => (!s ? '—' : new Date(s).toLocaleString());
// Dado un match y mi id, devuelve {res, label} donde res ∈ {'W','L','D'}
function safeDetails(m) {
    try {
        return m.details ? JSON.parse(m.details) : null;
    }
    catch (_a) {
        return null;
    }
}
function is_draw(m) {
    const d = safeDetails(m);
    return m.winner_id == null || (d === null || d === void 0 ? void 0 : d.is_draw) === true;
}
function resultFor(meId, m) {
    if (is_draw(m))
        return 'D';
    return m.winner_id === meId ? 'W' : 'L';
}
function perspectiveScore(m, myId) {
    var _a;
    const d = safeDetails(m);
    if (!(d === null || d === void 0 ? void 0 : d.score))
        return null;
    if (Number.isFinite(d.score_left) && Number.isFinite(d.score_right)) {
        const leftId = (_a = d === null || d === void 0 ? void 0 : d.players) === null || _a === void 0 ? void 0 : _a.left_id;
        if (leftId === myId)
            return { you: d.score_left, rival: d.score_right };
        if (leftId != null)
            return { you: d.score_right, rival: d.score_left };
    }
    if (Number.isFinite(d.score_user) && Number.isFinite(d.score_ai)) {
        return { you: d.score_user, rival: d.score_ai };
    }
    return null;
}
// Trae display_name de un user (para el rival). Si id<=0 devolvemos etiqueta “IA”.
function getUserName(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!userId || userId <= 0)
            return 'IA';
        try {
            const { user } = yield apiFetch(`/api/users/${userId}`);
            return (user === null || user === void 0 ? void 0 : user.display_name) || `Usuario #${userId}`;
        }
        catch (_a) {
            return `Usuario #${userId}`;
        }
    });
}
// Pinta los últimos N matches en #matches
function loadRecentMatches() {
    return __awaiter(this, arguments, void 0, function* (limit = 5) {
        const box = $('#matches');
        if (!box)
            return;
        // estado de carga
        box.textContent = 'Cargando…';
        try {
            const me = yield apiFetch('/api/auth/me');
            const myId = me.user.id;
            const r = yield apiFetch('/api/users/me/matches');
            const list = (r.matches || []).slice(0, limit);
            if (list.length === 0) {
                box.innerHTML = `<div class="text-white/50">Aún no hay partidas</div>`;
                return;
            }
            // Resolvemos nombres de rival pero solo para los que apliquen (máx. 'limit' llamadas)
            const namesCache = new Map();
            function opponentName(m) {
                return __awaiter(this, void 0, void 0, function* () {
                    const opp = m.player1_id === myId ? m.player2_id : m.player1_id;
                    if (namesCache.has(opp))
                        return namesCache.get(opp);
                    const name = yield getUserName(opp);
                    namesCache.set(opp, name);
                    return name;
                });
            }
            const rows = yield Promise.all(list.map((m) => __awaiter(this, void 0, void 0, function* () {
                const res = resultFor(myId, m);
                const opp = yield opponentName(m);
                const sc = perspectiveScore(m, myId);
                const score = sc ? ` · ${sc.you} - ${sc.rival}` : '';
                const when = fmtDateTime(m.played_at);
                // Badge por resultado
                const badgeClass = res === 'W' ? 'bg-emerald-600/70' :
                    res === 'L' ? 'bg-rose-600/70' :
                        'bg-zinc-600/70';
                const label = res === 'W' ? 'Victoria' :
                    res === 'L' ? 'Derrota' :
                        'Empate';
                return `
		  <li class="flex items-center justify-between py-1.5">
			<div class="min-w-0">
			  <div class="text-white truncate">${opp}<span class="opacity-60">${score}</span></div>
			  <div class="text-xs text-white/50">${when}</div>
			</div>
			<span class="ml-3 inline-flex text-xs px-2 py-0.5 rounded ${badgeClass}">${label}</span>
		  </li>`;
            })));
            box.innerHTML = `<ul class="divide-y divide-white/10">${rows.join('')}</ul>`;
        }
        catch (e) {
            box.innerHTML = `<div class="text-rose-400 text-sm">No se pudieron cargar las partidas.</div>`;
        }
    });
}
