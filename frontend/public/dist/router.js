export function createRouter(opts) {
    const { routes, root, ctx } = opts;
    let currentPath = "";
    const toPathName = (input) => new URL(input, location.origin).pathname;
    function match(pathname) {
        return routes.find(r => r.path === pathname) || routes.find(r => r.path === "/404");
    }
    async function ensureAuth() {
        if (ctx.isAuthed && ctx.isAuthed())
            return true;
        try {
            const r = await ctx.api("/api/auth/me");
            if (r?.user) {
                // mutar el ctx para sesiones ya cargadas
                ctx.user = r.user;
                return true;
            }
        }
        catch { } // 401 -> no autenticado
        return false;
    }
    async function render(input) {
        const pathname = toPathName(input);
        if (pathname === currentPath)
            return;
        currentPath = pathname;
        const route = match(pathname);
        if (!route)
            return navigate("/404", { replace: true });
        // Guard de auth
        if (route.requiresAuth) {
            const ok = await ensureAuth();
            if (!ok && pathname !== "/login") {
                return navigate("/login", { replace: true });
            }
        }
        const page = await route.loader();
        root.replaceChildren();
        if (route.title)
            document.title = route.title;
        await page.mount(root, ctx);
        // Scroll top tras cada navegación
        window.scrollTo({ top: 0, behavior: "instant" });
    }
    // 2. MODIFICADO: La firma de la función acepta 'state'
    function navigate(path, opts) {
        // Normaliza: permitir pasar path relativos tipo "./login"
        const url = new URL(path, location.origin);
        const full = url.pathname + url.search + url.hash;
        if (full === location.pathname + location.search + location.hash && !opts?.replace)
            return;
        // 3. MODIFICADO: Pasa el 'state' (o un objeto vacío) a la API de History
        if (opts?.replace)
            history.replaceState(opts.state || {}, "", full);
        // 4. MODIFICADO: Pasa el 'state' (o un objeto vacío) a la API de History
        else
            history.pushState(opts?.state || {}, "", full);
        render(url.pathname);
    }
    function onPopState() {
        render(location.pathname);
    }
    // Interceptor global de <a> internos (delegación)
    function installGlobalLinkInterceptor() {
        document.addEventListener("click", (e) => {
            const target = e.target;
            const a = target?.closest?.('a[href]');
            if (!a)
                return;
            // Respeta nuevas pestañas, descargas y modificadores
            if (e.defaultPrevented || a.target === "_blank" || a.hasAttribute("download"))
                return;
            const me = e;
            if (me.metaKey || me.ctrlKey || me.shiftKey || me.altKey)
                return;
            // Sólo enlaces internos (inicio con / o ./ y mismo origin)
            const href = a.getAttribute("href") || "";
            if (!href.startsWith("/") && !href.startsWith("./"))
                return;
            const url = new URL(a.href);
            if (url.origin !== location.origin)
                return;
            e.preventDefault();
            navigate(url.pathname + url.search + url.hash);
        });
    }
    // expón navigate en el ctx
    ctx.navigate = navigate;
    // Instala listeners una vez
    installGlobalLinkInterceptor();
    window.addEventListener("popstate", onPopState);
    // Primera pintura
    render(location.pathname + location.search + location.hash);
    return { navigate };
}
