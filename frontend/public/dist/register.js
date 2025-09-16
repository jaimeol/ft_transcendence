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
async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
        disableSubmit(true);
        setError("");
        await api("/api/auth/register", {
            method: "POST",
            body: JSON.stringify(data),
            headers: { "Content-Type": "application/json" },
        });
        location.href = "../home.html";
    }
    catch (err) {
        setError(err?.message ?? "Error inesperado");
    }
    finally {
        disableSubmit(false);
    }
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
window.addEventListener("DOMContentLoaded", async () => {
    await initializeLanguages();
    const form = qs("#f");
    if (form)
        form.addEventListener("submit", onSubmit);
    setupEmailReadOnly();
    setupPasswordToggle();
});
