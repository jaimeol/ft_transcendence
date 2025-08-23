var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function escapeHTML(s = "") {
    return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function normalizePath(p) {
    const clean = (p !== null && p !== void 0 ? p : '').replace(/[""']/g, '').trim();
    return clean || '/uploads/default-avatar.png';
}
function me() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const j = yield window.api("/api/auth/me");
            const u = j.user;
            const avatar = normalizePath(u === null || u === void 0 ? void 0 : u.avatar_path);
            document.getElementById('info').innerHTML = `
		<img class="avatar" src="${avatar}" width="72" height="72" alt="Avatar"
       onerror="this.onerror=null; this.src='/default-avatar.png'">
		<div>
			<div class="font-bold">${escapeHTML(u.display_name || '')}</div>
    	<div class="opacity-80 text-sm">${escapeHTML(u.email || '')}</div>
  	</div>`;
            return u;
        }
        catch (_a) {
            location.href = "/login.html";
        }
    });
}
function wireUpdateForm() {
    const form = document.getElementById("upd");
    if (!form)
        return;
    form.addEventListener("submit", (e) => __awaiter(this, void 0, void 0, function* () {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        const errBox = document.getElementById("err-upd");
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
}
function wireAvatarForm() {
    const form = document.getElementById("ava");
    if (!form)
        return;
    form.addEventListener("submit", (e) => __awaiter(this, void 0, void 0, function* () {
        e.preventDefault();
        const fd = new FormData(form);
        const errBox = document.getElementById("err-ava");
        try {
            const res = yield fetch("/api/users/me/avatar", {
                method: "POST",
                body: fd,
                credentials: "include"
            });
            if (res.ok) {
                yield me();
                if (errBox)
                    errBox.textContent = "✅ Avatar actualizado";
            }
            else {
                if (errBox)
                    errBox.textContent = "Error subiendo avatar";
            }
        }
        catch (_a) {
            if (errBox)
                errBox.textContent = "Error subiendo avatar";
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
document.addEventListener("DOMContentLoaded", () => {
    me();
    wireUpdateForm();
    wireAvatarForm();
});
