import { createRouter } from "./router.js";
import { initializeLanguages, currentTranslations, changeLanguage } from "./translate.js";
window.changeLanguage = changeLanguage;
const t = (k) => currentTranslations?.[k] ?? k;
async function api(url, init) {
    if (window.api)
        return window.api(url, init);
    const headers = init?.body ? { 'Content-Type': 'application/json', ...(init?.headers || {}) }
        : { ...(init?.headers || {}) };
    const res = await fetch(url, {
        credentials: "include",
        ...init,
        headers,
    });
    if (res.status === 204)
        return null;
    if (res.status === 401) {
        throw new Error('401');
    }
    if (!res.ok)
        throw new Error(String(res.status));
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : res.text();
}
function isAuthedFromMeResp(me) {
    return me && typeof me === "object" && (me.user || me.id || me.email);
}
window.addEventListener("DOMContentLoaded", async () => {
    await initializeLanguages();
    let user = null;
    try {
        const me = await api("/api/auth/me");
        user = me?.user ?? me ?? null;
    }
    catch {
        user = null;
    }
    const ctx = {
        api,
        t,
        user,
        isAuthed: () => !!ctx.user,
        navigate: (() => { }),
    };
    ctx.user = user;
    const root = document.getElementById("app");
    if (!root)
        throw new Error("#app not found");
    createRouter({
        root,
        ctx,
        routes: [
            { path: "/", loader: () => import("./landing.js") },
            { path: "/login", loader: () => import("./login.js") },
            // { path: "/register", loader: () => import("./register.js") },
            { path: "/home", loader: () => import("./home.js"), requiresAuth: true },
            { path: "/profile", loader: () => import("./profile.js"), requiresAuth: true },
            // { path: "/friends", loader: () => import("./friends.js"), requiresAuth: true },
            // { path: "/matches", loader: () => import("./matches.js"), requiresAuth: true },
            // { path: "/tictactoe", loader: () => import("./tictactoe.js"), requiresAuth: true },
            { path: "/pong", loader: () => import("./pong.js"), requiresAuth: true },
        ],
    });
});
