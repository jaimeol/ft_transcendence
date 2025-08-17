

export let currentTranslations: Record<string, string> = {};

export type language = "es" | "fr" | "en";

export function getCurrentLanguage(): language {
	const savedLang = localStorage.getItem('language') as language;
	if (savedLang && ['es', 'en', 'fr'].includes(savedLang))
		return savedLang;
	const browserLang = navigator.language.split('-')[0] as language;
	if (['es', 'en', 'fr'].includes(browserLang))
		return browserLang;
	return 'en';
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
	const elements = document.querySelectorAll<HTMLElement>('[data-translate]');

	elements.forEach(el => {
		const key = el.getAttribute('data-translate');
		if (key && currentTranslations[key]) {
			el.innerHTML = currentTranslations[key];
		}
	});
}

export async function changeLanguage(lang: language): Promise<void> {
	localStorage.setItem('language', lang);
	await loadTranslations(lang);
	updateContent();
}

(window as any).changeLanguage = changeLanguage;

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
	await loadTranslations(initialLang);
	updateContent();
	(window as any).changeLanguage = changeLanguage;
}