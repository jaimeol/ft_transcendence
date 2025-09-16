export let currentTranslations = {};
function normalize(l) {
    if (!l)
        return null;
    const s = l.toLowerCase();
    if (s.startsWith("es"))
        return "es";
    if (s.startsWith("en"))
        return "en";
    if (s.startsWith("fr"))
        return "fr";
    return null;
}
function getLangFromURL() {
    const p = new URLSearchParams(window.location.search);
    return normalize(p.get("lang"));
}
export function getCurrentLanguage() {
    const urlLang = getLangFromURL();
    if (urlLang)
        return urlLang;
    const savedLang = normalize(localStorage.getItem("language"));
    if (savedLang)
        return savedLang;
    const browserLang = normalize(navigator.language.split("-")[0]);
    return browserLang ?? "en";
    // const savedLang = localStorage.getItem('language') as language;
    // if (savedLang && ['es', 'en', 'fr'].includes(savedLang))
    // 	return savedLang;
    // const browserLang = navigator.language.split('-')[0] as language;
    // if (['es', 'en', 'fr'].includes(browserLang))
    // 	return browserLang;
    // return 'en';
}
export async function loadTranslations(lang) {
    try {
        const response = await fetch(`/locales/${lang}.json`);
        if (!response.ok)
            throw new Error(`Language ${lang} not found.`);
        currentTranslations = await response.json();
        console.log(`Translations for ${lang} loaded`);
    }
    catch (error) {
        console.error(error);
        const response = await fetch(`/locales/en.json`);
        currentTranslations = await response.json();
    }
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
export async function changeLanguage(lang) {
    localStorage.setItem('language', lang);
    const url = new URL(location.href);
    url.searchParams.set('lang', lang);
    history.replaceState({}, '', url.toString());
    await loadTranslations(lang);
    updateContent();
}
window.changeLanguage = changeLanguage;
export function ensureLinksCarryLang(selector = 'a[href]') {
    const lang = getCurrentLanguage();
    document.querySelectorAll(selector).forEach(a => {
        try {
            const url = new URL(a.href, location.href);
            url.searchParams.set('lang', lang);
            a.href = url.pathname + url.search + url.hash;
        }
        catch { }
    });
}
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
export async function initializeLanguages() {
    const initialLang = getCurrentLanguage();
    localStorage.setItem('language', initialLang);
    await loadTranslations(initialLang);
    updateContent();
    window.changeLanguage = changeLanguage;
    ensureLinksCarryLang('a[href^="game.html"], a[href^="/"], a[href^="./"]');
    window.addEventListener('storage', (e) => {
        if (e.key === 'language' && e.newValue) {
            changeLanguage(normalize(e.newValue) ?? 'en');
        }
    });
}
