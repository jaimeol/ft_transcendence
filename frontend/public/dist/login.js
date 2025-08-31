var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { initializeLanguages, changeLanguage } from "./translate.js";
function qs(sel) {
    return document.querySelector(sel);
}
function setError(msg) {
    const err = qs("#error-message");
    if (err) {
        err.textContent = msg;
        err.style.display = "block";
    }
}
function clearError() {
    const err = qs("#error-message");
    if (err) {
        err.style.display = "none";
    }
}
function setLoading(loading) {
    const btn = qs('button[type="submit"]');
    if (btn) {
        btn.disabled = loading;
        btn.textContent = loading ? "Iniciando sesión..." : "Entrar";
    }
}
function onSubmit(e) {
    return __awaiter(this, void 0, void 0, function* () {
        e.preventDefault();
        clearError();
        const form = e.currentTarget;
        const formData = new FormData(form);
        const email = formData.get("email");
        const password = formData.get("password");
        if (!email || !password) {
            setError("Por favor, completa todos los campos");
            return;
        }
        setLoading(true);
        try {
            const response = yield api("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });
            console.log("Login exitoso:", response);
            // Redirigir al usuario a la página principal
            window.location.href = "/home.html";
        }
        catch (error) {
            console.error("Error en login:", error);
            setError(error instanceof Error ? error.message : "Error al iniciar sesión");
            setLoading(false);
        }
    });
}
function initLogin() {
    const form = qs("#login-form");
    if (form) {
        form.addEventListener("submit", onSubmit);
    }
}
// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    initializeLanguages();
    initLogin();
});
// Hacer changeLanguage disponible globalmente
window.changeLanguage = changeLanguage;
