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
        yield wireLogout();
    });
}
document.addEventListener('DOMContentLoaded', main);
