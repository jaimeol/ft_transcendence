var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { initializeLanguages } from "./translate.js";
function qs(sel) {
    return document.querySelector(sel);
}
function setError(msg) {
    const err = qs("#err");
    if (err)
        err.textContent = msg;
}
function disableSubmit(disabled) {
    const btn = qs("#submitBtn");
    if (btn)
        btn.disabled = disabled;
}
function onSubmit(e) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        e.preventDefault();
        const form = e.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());
        try {
            disableSubmit(true);
            setError("");
            yield api("/api/auth/register", {
                method: "POST",
                body: JSON.stringify(data),
                headers: { "Content-Type": "application/json" },
            });
            location.href = "../home.html";
        }
        catch (err) {
            setError((_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : "Error inesperado");
        }
        finally {
            disableSubmit(false);
        }
    });
}
function setupEmailReadOnly() {
    const emailInput = qs('input[name="email"]');
    if (!emailInput)
        return;
    const enable = () => emailInput.removeAttribute("readonly");
    const disable = () => emailInput.setAttribute("readonly", "true");
    disable();
    emailInput.addEventListener('pointerdown', enable);
    emailInput.addEventListener('focus', enable);
    emailInput.addEventListener('keydown', enable);
    emailInput.addEventListener("blur", disable);
    setTimeout(() => {
        if (document.activeElement === emailInput)
            enable();
    }, 0);
}
function setupPasswordToggle() {
    const pwd = qs("#pwd");
    const toggle = qs("#togglePwd");
    if (!pwd || !toggle)
        return;
    toggle.addEventListener("click", () => {
        const isPwd = pwd.type === "password";
        pwd.type = isPwd ? "text" : "password";
        toggle.textContent = isPwd ? "🙈" : "👁️";
    });
}
window.addEventListener("DOMContentLoaded", () => __awaiter(void 0, void 0, void 0, function* () {
    yield initializeLanguages();
    const form = qs("#f");
    if (form)
        form.addEventListener("submit", onSubmit);
    setupEmailReadOnly();
    setupPasswordToggle();
}));
