// --- Helpers de red ---
async function fetchClientId() {
    const r = await fetch("/api/config", { credentials: "include" });
    if (!r.ok)
        throw new Error("No se pudo obtener /api/config");
    const json = await r.json();
    return json.googleClientId || "";
}
function loadGIS() {
    // Si ya está, listo
    // @ts-ignore
    if (window.google?.accounts?.id)
        return Promise.resolve();
    return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true;
        s.defer = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Google Identity Services no cargó"));
        document.head.appendChild(s);
    });
}
let initialized = false;
let isLoading = false;
let googleButtonRendered = false;
// 👉 EXPORTA esta función
export async function initGoogleUI(root, navigate) {
    // Refs **dentro** de root (existen tras mount)
    const btn = root.querySelector("#google-btn");
    const label = root.querySelector("#google-label");
    const gIcon = root.querySelector("#google-g-icon");
    const spinner = root.querySelector("#google-spinner");
    const originalLabelText = label?.textContent || "Continuar con Google";
    function setLoading(loading) {
        if (!btn || !label || !gIcon || !spinner)
            return;
        btn.disabled = loading;
        btn.setAttribute("aria-busy", String(loading));
        if (loading) {
            label.textContent = "Conectando…";
            gIcon.classList.add("hidden");
            spinner.classList.remove("hidden");
        }
        else {
            label.textContent = originalLabelText;
            gIcon.classList.remove("hidden");
            spinner.classList.add("hidden");
        }
    }
    // Efecto visual
    btn?.addEventListener("mousemove", (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        e.currentTarget.style.setProperty("--x", `${x}px`);
        e.currentTarget.style.setProperty("--y", `${y}px`);
    });
    async function initGoogleOnce() {
        if (initialized)
            return;
        const clientId = await fetchClientId();
        if (!clientId) {
            console.warn("GOOGLE_CLIENT_ID vacío desde /api/config");
            return;
        }
        await loadGIS();
        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: window.handleGoogle,
            auto_select: false,
            itp_support: true,
            use_fedcm_for_prompt: true,
        });
        initialized = true;
    }
    // Callback principal: envía id_token al backend
    window.handleGoogle = async ({ credential }) => {
        try {
            const r = await fetch("/api/auth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ id_token: credential }),
            });
            if (!r.ok) {
                const msg = await r.text();
                setLoading(false);
                isLoading = false;
                alert("Error al iniciar sesión con Google: " + msg);
                return;
            }
            navigate("/home", { replace: true });
        }
        catch {
            setLoading(false);
            isLoading = false;
            alert("Fallo de red con Google Sign-In");
        }
    };
    // Render del botón oficial (fallback)
    function renderGoogleButton() {
        if (!btn || googleButtonRendered)
            return;
        try {
            const googleBtnContainer = document.createElement("div");
            googleBtnContainer.style.position = "absolute";
            googleBtnContainer.style.top = "0";
            googleBtnContainer.style.left = "0";
            googleBtnContainer.style.width = "100%";
            googleBtnContainer.style.height = "100%";
            googleBtnContainer.style.opacity = "0";
            googleBtnContainer.style.pointerEvents = "auto";
            btn.style.position = "relative";
            btn.appendChild(googleBtnContainer);
            window.google.accounts.id.renderButton(googleBtnContainer, {
                theme: "outline",
                size: "large",
                width: btn.offsetWidth,
                text: "continue_with",
                shape: "rectangular",
            });
            googleButtonRendered = true;
            setTimeout(() => {
                const googleBtn = googleBtnContainer.querySelector('div[role="button"]');
                googleBtn?.click();
            }, 100);
        }
        catch (e) {
            console.error("Error renderizando botón de Google:", e);
            setLoading(false);
            isLoading = false;
        }
    }
    // Click en tu botón “custom”
    btn?.addEventListener("click", async () => {
        if (isLoading)
            return;
        setLoading(true);
        isLoading = true;
        const timeout = setTimeout(() => {
            setLoading(false);
            isLoading = false;
            console.warn("Timeout en Google Sign-In");
        }, 10000);
        try {
            await initGoogleOnce();
            if (googleButtonRendered) {
                // One Tap / prompt
                window.google.accounts.id.prompt((notification) => {
                    clearTimeout(timeout);
                    isLoading = false;
                    if (notification.isNotDisplayed?.() ||
                        notification.isSkippedMoment?.() ||
                        notification.isDismissedMoment?.()) {
                        setLoading(false);
                        renderGoogleButton();
                    }
                });
            }
            else {
                renderGoogleButton();
            }
        }
        catch (e) {
            clearTimeout(timeout);
            setLoading(false);
            isLoading = false;
            console.error("Error al inicializar Google Sign-In:", e);
            alert("No se pudo iniciar Google Sign-In. Reintenta.");
        }
    });
    // (Opcional) si quieres mostrar el **botón oficial** en #google-host:
    const host = root.querySelector("#google-host");
    if (host) {
        try {
            await initGoogleOnce();
            window.google.accounts.id.renderButton(host, {
                type: "standard",
                theme: "filled_blue",
                size: "large",
                width: 320,
                locale: (localStorage.getItem("lang") || "es").toLowerCase(),
            });
            // Si renderizas el oficial, puedes ocultar el custom:
            btn && (btn.style.display = "none");
        }
        catch (e) {
            console.warn("No se pudo renderizar el botón oficial de Google:", e);
        }
    }
}
// 👉 NUEVA FUNCIÓN: renderiza el botón para el segundo jugador
export async function renderGoogleSecondButton(host, onSuccess, onError) {
    try {
        const clientId = await fetchClientId();
        if (!clientId)
            throw new Error("GOOGLE_CLIENT_ID vacío");
        await loadGIS();
        // Inicializa con callback específico para “segundo jugador”
        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async ({ credential }) => {
                try {
                    const r = await fetch("/api/auth/google-second", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ token: credential }), // acepta token/id_token/credential
                    });
                    if (!r.ok) {
                        const t = await r.text();
                        onError?.(`HTTP ${r.status}: ${t}`);
                        return;
                    }
                    const player = await r.json();
                    onSuccess(player);
                }
                catch (e) {
                    onError?.(e?.message || "Fallo de red");
                }
            },
            auto_select: false,
            itp_support: true,
            use_fedcm_for_prompt: true,
        });
        // Render del botón oficial
        window.google.accounts.id.renderButton(host, {
            theme: "filled_black",
            size: "large",
            width: 280,
            text: "continue_with",
            shape: "rectangular",
        });
    }
    catch (e) {
        onError?.(e?.message || "No se pudo preparar Google");
    }
}
