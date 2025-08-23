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
function escapeHTML(s) {
    return (s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function loadFriends() {
    return __awaiter(this, void 0, void 0, function* () {
        const listEl = document.getElementById("list");
        const errBox = document.getElementById("err");
        listEl.textContent = "Cargando...";
        errBox.textContent = "";
        try {
            const res = yield fetch("/api/friends", { credentials: "include" });
            if (!res.ok)
                throw res;
            const { friends } = yield res.json();
            if (!friends || friends.length === 0) {
                listEl.textContent = "Todavía no tienes amigos 😢";
                return;
            }
            listEl.innerHTML = friends.map((f) => `
      <div class="flex items-center gap-3 p-2 rounded bg-zinc-800/60 hover:bg-zinc-800 transition">
        <img src="${f.avatar_path || "/default-avatar.png"}" width="36" height="36" class="avatar" alt="Avatar">
        <div>
          <div class="font-semibold">${escapeHTML(f.display_name)}</div>
          <div class="opacity-70 text-xs">${f.online ? "🟢 Online" : "⚪ Offline"}</div>
        </div>
      </div>
    `).join("");
        }
        catch (err) {
            if ((err === null || err === void 0 ? void 0 : err.status) === 401) {
                location.href = "/login.html";
            }
            else {
                listEl.textContent = "";
                errBox.textContent = "❌ Error cargando amigos";
            }
        }
    });
}
document.addEventListener("DOMContentLoaded", loadFriends);
