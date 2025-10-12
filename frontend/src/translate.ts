export let currentTranslations: Record<string, string> = {};

export type language = "es" | "fr" | "en";

function normalize(l: string | null | undefined): language | null {
  if (!l) return null;
  const s = l.toLowerCase();
  if (s.startsWith("es")) return "es";
  if (s.startsWith("en")) return "en";
  if (s.startsWith("fr")) return "fr";
  return null;
}

function getLangFromURL(): language | null {
  const p = new URLSearchParams(window.location.search);
  return normalize(p.get("lang"));
}

export function getCurrentLanguage(): language {

  const urlLang = getLangFromURL();
  if (urlLang) return urlLang;

  const savedLang = normalize(localStorage.getItem("language"));
  if (savedLang) return savedLang;

  const browserLang = normalize(navigator.language.split("-")[0]);
  return browserLang ?? "en";
}

export async function loadTranslations(lang: language): Promise<void> {
	try {
		const response = await fetch(`/locales/${lang}.json`);
		if (!response.ok)
			throw new Error(`Language ${lang} not found.`);
		currentTranslations = await response.json();
		console.log(`Translations for ${lang} loaded`);
	} catch(error) {
		console.error(error);
		const response = await fetch(`/locales/en.json`);
		currentTranslations = await response.json();
	}
}

export function updateContent(): void {
  const lang = getCurrentLanguage();
  document.documentElement.lang = lang;
  const dict = currentTranslations;

  // 1) Texto interior (como ya tenías, pero usando textContent por seguridad)
  document.querySelectorAll<HTMLElement>('[data-translate]').forEach(el => {
    const key = el.getAttribute('data-translate');
    const t = key ? dict[key] : undefined;
    if (t != null) {
      // Para inputs/textarea con data-translate, si quieres que ponga placeholder automáticamente:
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.placeholder = t;
      } else {
        el.textContent = t; // evita inyectar HTML
      }
    }
  });

  // 2) Placeholder explícito
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-translate-placeholder]')
    .forEach(el => {
      const key = el.getAttribute('data-translate-placeholder');
      const t = key ? dict[key] : undefined;
      if (t != null) el.placeholder = t;
    });

  // 3) title
  document.querySelectorAll<HTMLElement>('[data-translate-title]').forEach(el => {
    const key = el.getAttribute('data-translate-title');
    const t = key ? dict[key] : undefined;
    if (t != null) el.setAttribute('title', t);
  });

  // 4) aria-label
  document.querySelectorAll<HTMLElement>('[data-translate-aria-label]').forEach(el => {
    const key = el.getAttribute('data-translate-aria-label');
    const t = key ? dict[key] : undefined;
    if (t != null) el.setAttribute('aria-label', t);
  });

  // 5) value (opcional)
  document.querySelectorAll<HTMLInputElement>('[data-translate-value]').forEach(el => {
    const key = el.getAttribute('data-translate-value');
    const t = key ? dict[key] : undefined;
    if (t != null) el.value = t;
  });
}


export async function changeLanguage(lang: language): Promise<void> {
  localStorage.setItem('language', lang);

  const url = new URL(location.href);
  url.searchParams.set('lang', lang);
  history.replaceState({}, '', url.toString());

  await loadTranslations(lang);
  updateContent();
  
  // Disparar evento para que las páginas SPA se actualicen
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

(window as any).changeLanguage = changeLanguage;

export function ensureLinksCarryLang(selector = 'a[href]') {
  const lang = getCurrentLanguage();
  document.querySelectorAll<HTMLAnchorElement>(selector).forEach(a => {
    try {
      const url = new URL(a.href, location.href);
      url.searchParams.set('lang', lang);
      a.href = url.pathname + url.search + url.hash;
    } catch {}
  });
}

export function initializeAnimations() {
	const gameLinks = document.querySelectorAll<HTMLAnchorElement>('.game-link');

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

  (window as any).changeLanguage = changeLanguage;

  ensureLinksCarryLang('a[href^="game.html"], a[href^="/"], a[href^="./"]');

  window.addEventListener('storage', (e) => {
    if (e.key === 'language' && e.newValue) {
      changeLanguage(normalize(e.newValue) ?? 'en');
    }
  });
}