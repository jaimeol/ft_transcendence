var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// ---------- UI refs ----------
const btn = document.getElementById("google-btn");
const label = document.getElementById("google-label");
const gIcon = document.getElementById("google-g-icon");
const spinner = document.getElementById("google-spinner");
// Guardar el texto original del botón
const originalLabelText = (label === null || label === void 0 ? void 0 : label.textContent) || "Continuar con Google";
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
// brillo radial al puntero
btn === null || btn === void 0 ? void 0 : btn.addEventListener("mousemove", (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    e.currentTarget.style.setProperty("--x", `${x}px`);
    e.currentTarget.style.setProperty("--y", `${y}px`);
});
// ---------- GIS init ----------
function getClientId() {
    const meta = document.querySelector('meta[name="google-client-id"]');
    return (meta === null || meta === void 0 ? void 0 : meta.content) || "";
}
function waitForGIS(timeoutMs = 6000) {
    var _a, _b;
    if ((_b = (_a = window.google) === null || _a === void 0 ? void 0 : _a.accounts) === null || _b === void 0 ? void 0 : _b.id)
        return Promise.resolve();
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const t = setInterval(() => {
            var _a, _b;
            if ((_b = (_a = window.google) === null || _a === void 0 ? void 0 : _a.accounts) === null || _b === void 0 ? void 0 : _b.id) {
                clearInterval(t);
                resolve();
            }
            else if (Date.now() - start > timeoutMs) {
                clearInterval(t);
                reject(new Error("Google Identity Services no cargó"));
            }
        }, 50);
    });
}
let initialized = false;
let isLoading = false; // Prevenir múltiples clics
let googleButtonRendered = false; // Saber si ya renderizamos el botón
function initGoogle() {
    return __awaiter(this, void 0, void 0, function* () {
        if (initialized)
            return;
        const clientId = getClientId();
        if (!clientId) {
            console.warn("Falta <meta name='google-client-id' ...>");
            return;
        }
        yield waitForGIS();
        // Inicializar una sola vez
        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: window.handleGoogle,
            auto_select: false,
            itp_support: true,
            use_fedcm_for_prompt: true,
        });
        initialized = true;
    });
}
// ---------- Callback principal: envía id_token al backend ----------
window.handleGoogle = (_a) => __awaiter(void 0, [_a], void 0, function* ({ credential }) {
    try {
        const r = yield fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ id_token: credential }),
        });
        if (!r.ok) {
            const msg = yield r.text();
            setLoading(false);
            isLoading = false;
            alert("Error al iniciar sesión con Google: " + msg);
            return;
        }
        // éxito → dejamos el loading hasta navegar
        location.href = "/home.html";
    }
    catch (_b) {
        setLoading(false);
        isLoading = false;
        alert("Fallo de red con Google Sign-In");
    }
});
// ---------- Click del botón: disparar One Tap o selector de cuentas ----------
btn === null || btn === void 0 ? void 0 : btn.addEventListener("click", () => __awaiter(void 0, void 0, void 0, function* () {
    // Prevenir múltiples clics
    if (isLoading) {
        console.log("Google Sign-In ya está en proceso...");
        return;
    }
    setLoading(true);
    isLoading = true;
    // Timeout de seguridad para evitar que se quede cargando forever
    const timeout = setTimeout(() => {
        setLoading(false);
        isLoading = false;
        console.warn("Timeout en Google Sign-In");
    }, 10000); // Reducido a 10 segundos
    try {
        yield initGoogle();
        // Si ya renderizamos el botón de Google anteriormente, solo usar prompt
        if (googleButtonRendered) {
            console.log("Usando One Tap prompt...");
            // Usar prompt() que mostrará el selector de cuentas
            window.google.accounts.id.prompt((notification) => {
                clearTimeout(timeout);
                isLoading = false;
                if (notification.isNotDisplayed() || notification.isSkippedMoment() || notification.isDismissedMoment()) {
                    setLoading(false);
                    console.log("One Tap no se pudo mostrar, renderizando botón de Google...");
                    // Si One Tap no funciona, renderizar el botón de Google como fallback
                    renderGoogleButton();
                }
            });
        }
        else {
            // Primera vez: intentar renderizar el botón de Google directamente
            console.log("Renderizando botón de Google...");
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
}));
// Función para renderizar el botón de Google como fallback
function renderGoogleButton() {
    if (!btn || googleButtonRendered)
        return;
    try {
        // Crear un div temporal para el botón de Google
        const googleBtnContainer = document.createElement('div');
        googleBtnContainer.style.position = 'absolute';
        googleBtnContainer.style.top = '0';
        googleBtnContainer.style.left = '0';
        googleBtnContainer.style.width = '100%';
        googleBtnContainer.style.height = '100%';
        googleBtnContainer.style.opacity = '0';
        googleBtnContainer.style.pointerEvents = 'auto';
        btn.style.position = 'relative';
        btn.appendChild(googleBtnContainer);
        window.google.accounts.id.renderButton(googleBtnContainer, {
            theme: "outline",
            size: "large",
            width: btn.offsetWidth,
            text: "continue_with",
            shape: "rectangular",
        });
        googleButtonRendered = true;
        // Simular click en el botón de Google
        setTimeout(() => {
            const googleBtn = googleBtnContainer.querySelector('div[role="button"]');
            if (googleBtn) {
                googleBtn.click();
            }
        }, 100);
    }
    catch (e) {
        console.error("Error renderizando botón de Google:", e);
        setLoading(false);
        isLoading = false;
    }
}
export {};
