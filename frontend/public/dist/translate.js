var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export let currentTranslations = {};
export function getCurrentLanguage() {
    const savedLang = localStorage.getItem('language');
    if (savedLang && ['es', 'en', 'fr'].includes(savedLang))
        return savedLang;
    const browserLang = navigator.language.split('-')[0];
    if (['es', 'en', 'fr'].includes(browserLang))
        return browserLang;
    return 'en';
}
export function loadTranslations(lang) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`/locales/${lang}.json`);
            if (!response.ok)
                throw new Error(`Language ${lang} not found.`);
            currentTranslations = yield response.json();
            console.log(`Translations for ${lang} loaded`);
        }
        catch (error) {
            console.error(error);
            const response = yield fetch(`/locales/en.json`);
            currentTranslations = yield response.json();
        }
    });
}
export function updateContent() {
    const lang = getCurrentLanguage();
    document.documentElement.lang = lang;
    const dict = currentTranslations;
    // 1) Texto interior (como ya tenías, pero usando textContent por seguridad)
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        const t = key ? dict[key] : undefined;
        if (t != null) {
            // Para inputs/textarea con data-translate, si quieres que ponga placeholder automáticamente:
            if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                el.placeholder = t;
            }
            else {
                el.textContent = t; // evita inyectar HTML
            }
        }
    });
    // 2) Placeholder explícito
    document.querySelectorAll('[data-translate-placeholder]')
        .forEach(el => {
        const key = el.getAttribute('data-translate-placeholder');
        const t = key ? dict[key] : undefined;
        if (t != null)
            el.placeholder = t;
    });
    // 3) title
    document.querySelectorAll('[data-translate-title]').forEach(el => {
        const key = el.getAttribute('data-translate-title');
        const t = key ? dict[key] : undefined;
        if (t != null)
            el.setAttribute('title', t);
    });
    // 4) aria-label
    document.querySelectorAll('[data-translate-aria-label]').forEach(el => {
        const key = el.getAttribute('data-translate-aria-label');
        const t = key ? dict[key] : undefined;
        if (t != null)
            el.setAttribute('aria-label', t);
    });
    // 5) value (opcional)
    document.querySelectorAll('[data-translate-value]').forEach(el => {
        const key = el.getAttribute('data-translate-value');
        const t = key ? dict[key] : undefined;
        if (t != null)
            el.value = t;
    });
}
export function changeLanguage(lang) {
    return __awaiter(this, void 0, void 0, function* () {
        localStorage.setItem('language', lang);
        yield loadTranslations(lang);
        updateContent();
    });
}
window.changeLanguage = changeLanguage;
export function initializeAnimations() {
    const gameLinks = document.querySelectorAll('.game-link');
    gameLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            link.classList.add('zoom-into-game');
            link.style.pointerEvents = 'none';
            setTimeout(() => {
                window.location.href = link.href;
            }, 500);
        });
    });
}
export function initializeLanguages() {
    return __awaiter(this, void 0, void 0, function* () {
        const initialLang = getCurrentLanguage();
        yield loadTranslations(initialLang);
        updateContent();
        window.changeLanguage = changeLanguage;
    });
}
