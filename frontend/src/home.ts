

type User = { display_name? : string; email?: string; avatar_path?: string | null };
type FriendsResp = { friends: Array<any> };
type MatchesResp = { matches?: Array<{ you: number; rival: number; date: string }> };

declare global {
  interface Window {
	api: (url: string, init?: RequestInit) => Promise<any>;
  }
}

function $<T extends HTMLElement = HTMLElement>(sel: string, parent: ParentNode = document) {
  return parent.querySelector(sel) as T | null;
}


export async function apiFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
	if (window.api) {
		// Si tu api() ya devuelve JSON parseado
		const data = await window.api(url, init);
		// (Por si acaso alguien hizo que api() devuelva un Response)
		if (data && typeof data === 'object' && 'ok' in data && 'json' in data) {
	  		const res = data as Response;
	  if (!res.ok) throw new Error(String(res.status));
	  return (await res.json()) as T;
	}
	return data as T;
  }

  // Fallback a fetch estándar
  const res = await fetch(url, { credentials: 'include', ...init });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as T;   // <- importante: invocar json()
}

function escapeHtml(s: string = '') {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string));
}

async function loadUser() {
	try {
		const j = await apiFetch<{ user: User }>('/api/auth/me');
		const u = j.user || {};
		const avatar = u.avatar_path || '/uploads/default-avatar.png';
		$('#userAvatar')?.setAttribute('src', avatar);
		$('#userName')!.textContent = u.display_name || '-';
		$('#userEmail')!.textContent = u.email || '-';
	} catch {
		location.href = '/login.html';
	}
}


async function loadFriendsCount() {
	try {
		const { friends } = await apiFetch<FriendsResp>('/api/friends');
		const count = Array.isArray(friends) ? friends.length : 0;
		const badge = $('#friendsCount');
		if (badge)
			badge.textContent = `${count} ${count === 1 ? 'amigo' : 'amigos'}`;
	}	catch {

	}
}

function wireLogout() {
	$('#logoutBtn')?.addEventListener('click', async() => {
		try { await apiFetch('/api/auth/logout', { method: 'POST '}); }
		finally { location.href = '/'; }
	});
}

async function main() {
	await loadUser();
	await loadFriendsCount();
	await wireLogout();
}

document.addEventListener('DOMContentLoaded', main);
export {};