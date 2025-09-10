

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
	await loadRecentMatches();
	await wireLogout();
}

document.addEventListener('DOMContentLoaded', main);
export {};

// === Añade/actualiza tipos, debajo de tus tipos actuales ===
type Match = {
	id: number;
	player1_id: number;
	player2_id: number;
	winner_id: number | null;
	played_at?: string | null;
	details?: string | null; // guardamos marcador aquí si lo envías desde el juego
  };
  
  // Helper de fecha “bonita”
  const fmtDateTime = (s?: string | null) => (!s ? '—' : new Date(s).toLocaleString());
  
  // Dado un match y mi id, devuelve {res, label} donde res ∈ {'W','L','D'}
  function safeDetails(m: Match): any | null {
	try {
		return m.details ? JSON.parse(m.details) : null;
	} catch {
		return null;
	}
  }

  function is_draw(m: Match): boolean {
	const d = safeDetails(m);

	return m.winner_id == null || d?.is_draw === true;
  }

  function resultFor(meId: number, m: Match): 'W' | 'L' | 'D' {
	if (is_draw(m)) return 'D';
	return m.winner_id === meId ? 'W' : 'L';
  }
  
  function perspectiveScore(m: Match, myId: number): { you: number; rival: number } | null {
	const d = safeDetails(m);
	if (!d?.score) return null;

	if (Number.isFinite(d.score_left) && Number.isFinite(d.score_right)){
		const leftId = d?.players?.left_id;
		if (leftId === myId) return { you: d.score_left, rival: d.score_right};
		if (leftId != null) return { you: d.score_right, rival: d.score_left};
	}

	if (Number.isFinite(d.score_user) && Number.isFinite(d.score_ai)) {
		return { you: d.score_user, rival: d.score_ai };
	}

	return null;
  }
  
  // Trae display_name de un user (para el rival). Si id<=0 devolvemos etiqueta “IA”.
  async function getUserName(userId: number): Promise<string> {
	if (!userId || userId <= 0) return 'IA';
	try {
	  const { user } = await apiFetch<{ user: { display_name?: string } }>(`/api/users/${userId}`);
	  return user?.display_name || `Usuario #${userId}`;
	} catch {
	  return `Usuario #${userId}`;
	}
  }
  
  // Pinta los últimos N matches en #matches
  async function loadRecentMatches(limit = 5) {
	const box = $('#matches');
	if (!box) return;
  
	// estado de carga
	box.textContent = 'Cargando…';
  
	try {
	  const me = await apiFetch<{ user: { id: number } }>('/api/auth/me');
	  const myId = me.user.id;
  
	  const r = await apiFetch<{ matches: Match[] }>('/api/users/me/matches');
	  const list = (r.matches || []).slice(0, limit);
  
	  if (list.length === 0) {
		box.innerHTML = `<div class="text-white/50">Aún no hay partidas</div>`;
		return;
	  }
  
	  // Resolvemos nombres de rival pero solo para los que apliquen (máx. 'limit' llamadas)
	  const namesCache = new Map<number, string>();
	  async function opponentName(m: Match): Promise<string> {
		const opp = m.player1_id === myId ? m.player2_id : m.player1_id;
		if (namesCache.has(opp)) return namesCache.get(opp)!;
		const name = await getUserName(opp);
		namesCache.set(opp, name);
		return name;
	  }
  
	  const rows = await Promise.all(list.map(async (m) => {
		const res = resultFor(myId, m);
		const opp = await opponentName(m);
		const sc = perspectiveScore(m, myId);
		const score = sc ? ` · ${sc.you} - ${sc.rival}` : '';
		const when = fmtDateTime(m.played_at);
  
		// Badge por resultado
		const badgeClass =
		  res === 'W' ? 'bg-emerald-600/70' :
		  res === 'L' ? 'bg-rose-600/70' :
						'bg-zinc-600/70';
  
		const label =
		  res === 'W' ? 'Victoria' :
		  res === 'L' ? 'Derrota'  :
						'Empate';
  
		return `
		  <li class="flex items-center justify-between py-1.5">
			<div class="min-w-0">
			  <div class="text-white truncate">${opp}<span class="opacity-60">${score}</span></div>
			  <div class="text-xs text-white/50">${when}</div>
			</div>
			<span class="ml-3 inline-flex text-xs px-2 py-0.5 rounded ${badgeClass}">${label}</span>
		  </li>`;
	  }));
  
	  box.innerHTML = `<ul class="divide-y divide-white/10">${rows.join('')}</ul>`;
	} catch (e) {
	  box.innerHTML = `<div class="text-rose-400 text-sm">No se pudieron cargar las partidas.</div>`;
	}
  }
  