// frontend/src/tournament.ts
import { currentTranslations, initializeLanguages } from "./translate.js";
import type { Ctx } from "./router.js";

type BackendTournament = {
  id: number;
  name: string;
  max_players: number;
  is_public: number;
  status: 'registration' | 'active' | 'completed' | 'finished';
  creator_id: number;
  creator_name?: string;
  winner_id?: number | null;
  current_round?: number;
  current_players?: number;
  created_at?: string;
  completed_at?: string;
  is_joined?: number;
  is_creator?: number;
  participants?: any[];
  matches?: any[];
  // History specific fields
  total_players?: number;
  was_participant?: number;
  was_creator?: number;
  was_winner?: number;
  winner_name?: string;
};

export async function mount(el: HTMLElement, ctx: Ctx) {
  // Inicializar el sistema de traducción primero
  await initializeLanguages();

  // Helper function to format tournament status consistently
  function formatTournamentStatus(status: string): { text: string; class: string } {
    let statusText = '';
    let statusClass = 'px-2 py-1 rounded-full text-xs font-medium';

    switch (status) {
      case 'registration':
        statusText = ctx.t("tournament.statusRegistration") ?? 'Registration';
        statusClass += ' bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
        break;
      case 'active':
        statusText = ctx.t("tournament.statusActive") ?? 'Active';
        statusClass += ' bg-green-500/20 text-green-300 border border-green-500/30';
        break;
      case 'finished':
        statusText = ctx.t("tournament.statusFinished") ?? 'Finished';
        statusClass += ' bg-gray-500/20 text-gray-300 border border-gray-500/30';
        break;
      case 'completed':
        statusText = ctx.t("tournament.statusCompleted") ?? 'Completed';
        statusClass += ' bg-blue-500/20 text-blue-300 border border-blue-500/30';
        break;
      default:
        statusText = escapeHtml(String(status));
        statusClass += ' text-white/60';
    }

    return { text: statusText, class: statusClass };
  }
  
  el.innerHTML = `
    <header class="sticky top-0 z-50 backdrop-blur bg-black/30 border-b border-white/10">
      <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <a href="/home" class="flex items-center gap-2">
          <div class="size-7 rounded-lg bg-gradient-to-br from-indigo-400 to-emerald-400"></div>
          <span class="font-semibold">ft_transcendence</span>
        </a>

        <div class="flex items-center gap-3">
          <div class="bg-white/5 border border-white/10 px-2 py-1 rounded-full text-xs backdrop-blur">
            <button class="hover:underline" onclick="window.changeLanguage?.('en')">EN</button>
            <span class="mx-1 text-white/40">|</span>
            <button class="hover:underline" onclick="window.changeLanguage?.('es')">ES</button>
            <span class="mx-1 text-white/40">|</span>
            <button class="hover:underline" onclick="window.changeLanguage?.('fr')">FR</button>
          </div>

          <button id="logoutBtn"
            class="hidden sm:inline-flex items-center bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-1.5 rounded-lg text-xs"
            data-translate="home.logout">
            ${ctx.t("home.logout") ?? "Cerrar sesión"}
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 py-8 space-y-8">
       <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold" data-translate="tournament.title">${ctx.t("tournament.title") ?? "Tournaments"}</h1>
          <p class="text-white/60 mt-1" data-translate="tournament.subtitle">${ctx.t("tournament.subtitle") ?? "Participate in tournaments and compete with other players"}</p>
        </div>
        <button id="createTournamentBtn" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition" data-translate="tournament.create">
          ⚔️ ${ctx.t("tournament.create") ?? "Create Tournament"}
        </button>
      </div>

      <!-- Tabs -->
      <div class="bg-white/5 border border-white/10 rounded-2xl backdrop-blur overflow-hidden">
        <div class="flex border-b border-white/10">
          <button id="availableTab" class="tab-button flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 bg-white/10 text-white border-b-2 border-indigo-500" data-translate="tournament.available">🏆 ${ctx.t("tournament.available") ?? "Available Tournaments"}</button>
          <button id="myTournamentsTab" class="tab-button flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 text-white/60 hover:text-white hover:bg-white/5" data-translate="tournament.myTournaments">🎯 ${ctx.t("tournament.myTournaments") ?? "My Tournaments"}</button>
          <button id="historyTab" class="tab-button flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 text-white/60 hover:text-white hover:bg-white/5" data-translate="tournament.history">📚 ${ctx.t("tournament.history") ?? "Tournament History"}</button>
        </div>
        <div class="p-6">
          <div id="availableContent" class="tab-content">
            <div id="availableTournaments" class="space-y-4">
              <div class="text-center py-8 text-white/60">
                <div class="text-4xl mb-2">🏆</div>
                <div data-translate="tournament.noAvailable">${ctx.t("tournament.noAvailable") ?? "No tournaments available"}</div>
                <div class="text-sm mt-1" data-translate="tournament.createFirst">${ctx.t("tournament.createFirst") ?? "Create the first tournament!"}</div>
              </div>
            </div>
          </div>
          <div id="myTournamentsContent" class="tab-content hidden">
            <div id="myTournaments" class="space-y-4">
              <div class="text-center py-8 text-white/60">
                <div class="text-4xl mb-2">🎯</div>
                <div data-translate="tournament.notParticipating">${ctx.t("tournament.notParticipating") ?? "You're not participating in any tournaments"}</div>
                <div class="text-sm mt-1" data-translate="tournament.joinToSee">${ctx.t("tournament.joinToSee") ?? "Join a tournament to see it here!"}</div>
              </div>
            </div>
          </div>
          <div id="historyContent" class="tab-content hidden">
            <div id="tournamentHistory" class="space-y-4">
              <div class="text-center py-8 text-white/60">
                <div class="text-4xl mb-2">📚</div>
                <div data-translate="tournament.noHistory">${ctx.t("tournament.noHistory") ?? "No tournament history"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Tournament Modal (hidden) -->
      <div id="createTournamentModal" class="fixed inset-0 bg-black/50 backdrop-blur z-50 hidden items-center justify-center">
        <div class="bg-white/10 border border-white/20 rounded-2xl p-6 max-w-md w-full mx-4 backdrop-blur-xl">
          <h2 class="text-xl font-semibold mb-4" data-translate="tournament.create">${ctx.t("tournament.create") ?? "Create Tournament"}</h2>
          <form id="createTournamentForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2" data-translate="tournament.tournamentName">${ctx.t("tournament.tournamentName") ?? "Tournament Name"}</label>
              <input type="text" id="tournamentNameInput" class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg" placeholder="${ctx.t("tournament.tournamentNamePlaceholder") ?? "My Epic Tournament"}" required>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2" data-translate="tournament.numberOfPlayers">${ctx.t("tournament.numberOfPlayers") ?? "Number of Players"}</label>
              <select id="tournamentPlayersInput" class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white">
                <option style="background-color: #313236ff !important; color: white !important;" value="4">${ctx.t("tournament.players4") ?? "4 Players"}</option>
                <option style="background-color: #313236ff !important; color: white !important;" value="8">${ctx.t("tournament.players8") ?? "8 Players"}</option>
                <option style="background-color: #313236ff !important; color: white !important;" value="16">${ctx.t("tournament.players16") ?? "16 Players"}</option>
                <option style="background-color: #313236ff !important; color: white !important;" value="32">${ctx.t("tournament.players32") ?? "32 Players"}</option>
               </select>
            </div>
            <div class="flex gap-3 pt-4">
              <button type="button" id="cancelTournamentBtn" class="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 transition" data-translate="tournament.cancel">${ctx.t("tournament.cancel") ?? "Cancel"}</button>
              <button type="submit" class="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition" data-translate="tournament.create">${ctx.t("tournament.create") ?? "Create"}</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  `;

  // helpers
  function $<T extends HTMLElement = HTMLElement>(sel: string) { return el.querySelector(sel) as T | null; }
  async function apiFetch(path: string, opts: RequestInit = {}) {
    opts.credentials = 'include';
    opts.headers = { ...(opts.headers || {}), 'Content-Type': 'application/json' };
    const res = await fetch(path, opts);
    const text = await res.text();
    let data: any;
    try { data = text ? JSON.parse(text) : {}; } catch { data = text; }
    return { ok: res.ok, status: res.status, data };
  }

  // state
  let availableTournaments: BackendTournament[] = [];
  let myTournaments: BackendTournament[] = [];
  let tournamentHistory: BackendTournament[] = [];
  let currentTournament: BackendTournament | null = null;
  let activeTab: 'available' | 'my' | 'history' = 'available';
  let currentUser: any = null;

  // init
  bindEventListeners();
  await loadCurrentUser();
  await loadAvailableTournaments();

  // Logout handler
  $("#logoutBtn")?.addEventListener("click", async () => {
    try { await ctx.api("/api/auth/logout", { method: "POST" }); }
    finally { ctx.navigate("/"); }
  });

  // --- functions ---
  async function loadCurrentUser() {
    try {
      const r = await apiFetch('/api/auth/me', { method: 'GET' });
      if (r.ok && r.data && r.data.user) currentUser = r.data.user;
    } catch (e) { console.error('loadCurrentUser', e); }
  }

  async function loadAvailableTournaments() {
    try {
      const r = await apiFetch('/api/tournaments', { method: 'GET' });
      if (r.ok) {
        availableTournaments = Array.isArray(r.data) ? r.data : [];
        renderAvailableTournaments();
      } else {
        console.error('Failed loading tournaments', r.data);
      }
    } catch (err) { console.error(err); }
  }

  async function loadMyTournaments() {
    try {
      const r = await apiFetch('/api/tournaments', { method: 'GET' });
      if (r.ok) {
        const all: BackendTournament[] = Array.isArray(r.data) ? r.data : [];
        myTournaments = all.filter(t => t.is_joined === 1);
        renderMyTournaments();
      }
    } catch (err) { console.error(err); }
  }

  async function loadTournamentHistory() {
    try {
      const r = await apiFetch('/api/tournaments/history', { method: 'GET' });
      if (r.ok) {
        tournamentHistory = Array.isArray(r.data) ? r.data : [];
        renderHistory();
      } else {
        console.error('Failed loading tournament history', r.data);
      }
    } catch (err) { console.error(err); }
  }

  function bindEventListeners() {
    // tabs
    $('#availableTab')?.addEventListener('click', () => switchTab('available'));
    $('#myTournamentsTab')?.addEventListener('click', () => switchTab('my'));
    $('#historyTab')?.addEventListener('click', () => switchTab('history'));

    // create
    $('#createTournamentBtn')?.addEventListener('click', () => showCreateTournamentModal());
    $('#cancelTournamentBtn')?.addEventListener('click', () => hideCreateTournamentModal());
    $('#createTournamentForm')?.addEventListener('submit', (ev) => handleCreateTournament(ev));
  }

  function switchTab(tab: 'available' | 'my' | 'history') {
    activeTab = tab;
    (['availableTab','myTournamentsTab','historyTab'] as string[]).forEach(id => {
      const elTab = $(`#${id}`);
      if (!elTab) return;
      elTab.className = 'tab-button flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 text-white/60 hover:text-white hover:bg-white/5';
    });
    const activeId = tab === 'available' ? 'availableTab' : tab === 'my' ? 'myTournamentsTab' : 'historyTab';
    const activeEl = $(`#${activeId}`);
    if (activeEl) activeEl.className = 'tab-button flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 bg-white/10 text-white border-b-2 border-indigo-500';

    $<HTMLElement>('#availableContent')!.classList.toggle('hidden', tab !== 'available');
    $<HTMLElement>('#myTournamentsContent')!.classList.toggle('hidden', tab !== 'my');
    $<HTMLElement>('#historyContent')!.classList.toggle('hidden', tab !== 'history');

    if (tab === 'my') loadMyTournaments();
    if (tab === 'available') renderAvailableTournaments();
    if (tab === 'history') loadTournamentHistory();
  }

  function renderAvailableTournaments() {
    const container = $('#availableTournaments');
    if (!container) return;
    container.innerHTML = '';
    if (availableTournaments.length === 0) {
      container.innerHTML = `<div class="text-center py-8 text-white/60"><div class="text-4xl mb-2">🏆</div><div data-translate="tournament.noAvailable">${ctx.t("tournament.noAvailable") ?? "No tournaments available"}</div><div class="text-sm mt-1" data-translate="tournament.createFirst">${ctx.t("tournament.createFirst") ?? "Create the first tournament!"}</div></div>`;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';

    for (const t of availableTournaments) {
      const card = document.createElement('div');
      card.className = 'bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition flex flex-col';
      const canJoin = t.status === 'registration' && (t.current_players || 0) < (t.max_players || 0);
      const isJoined = t.is_joined === 1;
      const statusFormat = formatTournamentStatus(t.status);
      card.innerHTML = `
        <div class="flex-1">
          <div class="flex items-start justify-between mb-3">
            <h3 class="font-semibold text-lg">${escapeHtml(t.name)}</h3>
            <div class="${statusFormat.class} ml-2">${statusFormat.text}</div>
          </div>
          <div class="text-center mb-4">
            <div class="text-2xl font-bold text-white">${t.current_players || 0}/${t.max_players || 0}</div>
            <div class="text-xs text-white/60" data-translate="tournament.players">${ctx.t("tournament.players") ?? "Players"}</div>
          </div>
        </div>
        <div class="space-y-2">
          <button data-id="${t.id}" class="view-details w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm transition" data-translate="tournament.viewDetails">${ctx.t("tournament.viewDetails") ?? "View Details"}</button>
          ${canJoin ? (isJoined ? (t.status === 'registration' ? `<button data-id="${t.id}" class="leave-t w-full px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm transition" data-translate="tournament.leave">${ctx.t("tournament.leave") ?? "Leave Tournament"}</button>` : '') : `<button data-id="${t.id}" class="join-t w-full px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm transition" data-translate="tournament.join">${ctx.t("tournament.join") ?? "Join Tournament"}</button>`) : ''}
        </div>
      `;
      grid.appendChild(card);
    }
    container.appendChild(grid);

    // delegate buttons
    container.querySelectorAll<HTMLButtonElement>('.view-details').forEach(btn => {
      btn.addEventListener('click', () => viewTournament(parseInt(btn.dataset.id!)));
    });
    container.querySelectorAll<HTMLButtonElement>('.join-t').forEach(btn => {
      btn.addEventListener('click', () => joinTournament(parseInt(btn.dataset.id!)));
    });
    container.querySelectorAll<HTMLButtonElement>('.leave-t').forEach(btn => {
      btn.addEventListener('click', () => leaveTournament(parseInt(btn.dataset.id!)));
    });
  }

  function renderMyTournaments() {
    const container = $('#myTournaments');
    if (!container) return;
    container.innerHTML = '';
    if (myTournaments.length === 0) {
      container.innerHTML = `<div class="text-center py-8 text-white/60"><div class="text-4xl mb-2">🎮</div><div data-translate="tournament.notJoined">${ctx.t("tournament.notJoined") ?? "You haven't joined any tournaments yet"}</div><div class="text-sm mt-1" data-translate="tournament.joinToSee">${ctx.t("tournament.joinToSee") ?? "Join a tournament to see it here!"}</div></div>`;
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
    for (const t of myTournaments) {
      const card = document.createElement('div');
      card.className = 'bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition flex flex-col';
      const statusFormat = formatTournamentStatus(t.status);
      card.innerHTML = `
        <div class="flex-1">
          <div class="flex items-start justify-between mb-3">
            <h3 class="font-semibold text-lg">${escapeHtml(t.name)}</h3>
            <div class="${statusFormat.class} ml-2">${statusFormat.text}</div>
          </div>
          <div class="text-center mb-4">
            <div class="text-2xl font-bold text-white">${t.current_players || 0}/${t.max_players || 0}</div>
            <div class="text-xs text-white/60" data-translate="tournament.players">${ctx.t("tournament.players") ?? "Players"}</div>
          </div>
        </div>
        <div class="space-y-2">
          <button data-id="${t.id}" class="view-details w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm transition" data-translate="tournament.viewDetails">${ctx.t("tournament.viewDetails") ?? "View Details"}</button>
          ${t.status === 'registration' ? `<button data-id="${t.id}" class="leave-t w-full px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm transition" data-translate="tournament.leave">${ctx.t("tournament.leave") ?? "Leave Tournament"}</button>` : ''}
        </div>
      `;
      grid.appendChild(card);
    }
    container.appendChild(grid);
    container.querySelectorAll<HTMLButtonElement>('.view-details').forEach(btn => {
      btn.addEventListener('click', () => viewTournament(parseInt(btn.dataset.id!)));
    });
    container.querySelectorAll<HTMLButtonElement>('.leave-t').forEach(btn => {
      btn.addEventListener('click', () => leaveTournament(parseInt(btn.dataset.id!)));
    });
  }

  function renderHistory() {
    const container = $('#tournamentHistory');
    if (!container) return;
    container.innerHTML = '';
    
    if (tournamentHistory.length === 0) {
      container.innerHTML = `<div class="text-center py-8 text-white/60"><div class="text-4xl mb-2">📚</div><div data-translate="tournament.noHistory">${ctx.t("tournament.noHistory") ?? "No tournament history"}</div><div class="text-sm mt-1" data-translate="tournament.pastTournaments">${ctx.t("tournament.pastTournaments") ?? "Complete tournaments to see them here"}</div></div>`;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';

    for (const t of tournamentHistory) {
      const card = document.createElement('div');
      card.className = 'bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition flex flex-col';
      
      // Determinar el estado del usuario en el torneo - solo Ganador o Perdedor
      let userStatus = '';
      let statusClass = 'px-2 py-1 rounded-full text-xs font-medium';
      
      if (t.was_winner === 1) {
        userStatus = ctx.t("tournament.champion") ?? "Champion";
        statusClass += ' bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
      } else if (t.was_creator === 1 || t.was_participant === 1) {
        // Tanto creadores como participantes que no ganaron son "perdedores"
        userStatus = ctx.t("tournament.loser") ?? "Loser";
        statusClass += ' bg-red-500/20 text-red-300 border border-red-500/30';
      }

      const completedDate = t.completed_at ? new Date(t.completed_at).toLocaleDateString() : 
                           (t.created_at ? new Date(t.created_at).toLocaleDateString() : '—');

      card.innerHTML = `
        <div class="flex-1">
          <div class="flex items-start justify-between mb-3">
            <h3 class="font-semibold text-lg">${escapeHtml(t.name)}</h3>
            <div class="${statusClass}">${userStatus}</div>
          </div>
          <div class="space-y-2 mb-4">
            <div class="flex justify-between text-sm">
              <span class="text-white/60" data-translate="tournament.winner">${ctx.t("tournament.winner") ?? "Winner"}:</span>
              <span class="text-white">${escapeHtml(t.winner_name || (ctx.t("tournament.noWinner") ?? "No winner"))}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-white/60" data-translate="tournament.players">${ctx.t("tournament.players") ?? "Players"}:</span>
              <span class="text-white">${t.total_players || 0}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-white/60" data-translate="tournament.completed">${ctx.t("tournament.completed") ?? "Completed"}:</span>
              <span class="text-white">${completedDate}</span>
            </div>
          </div>
        </div>
        <div class="space-y-2">
          <button data-id="${t.id}" class="view-details w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm transition" data-translate="tournament.viewDetails">${ctx.t("tournament.viewDetails") ?? "View Details"}</button>
        </div>
      `;
      grid.appendChild(card);
    }
    
    container.appendChild(grid);

    // Delegate buttons
    container.querySelectorAll<HTMLButtonElement>('.view-details').forEach(btn => {
      btn.addEventListener('click', () => viewTournament(parseInt(btn.dataset.id!)));
    });
  }

  async function handleCreateTournament(e: Event) {
    e.preventDefault();
    const nameInput = $<HTMLInputElement>('#tournamentNameInput');
    const playersInput = $<HTMLSelectElement>('#tournamentPlayersInput');
    if (!nameInput || !playersInput) return;
    const name = nameInput.value.trim();
    const maxPlayers = parseInt(playersInput.value, 10);
    if (!name) return alert(ctx.t("tournament.nameRequired") ?? 'Name required');
    const r = await apiFetch('/api/tournaments', {
      method: 'POST',
      body: JSON.stringify({ name, maxPlayers, isPublic: true })
    });
    if (r.ok) {
      hideCreateTournamentModal();
      await loadAvailableTournaments();
      nameInput.value = '';
      playersInput.value = '4';
      alert(ctx.t("tournament.createSuccess") ?? 'Tournament created successfully!');
    } else {
      alert(r.data?.error || (ctx.t("tournament.createError") ?? 'Error creating tournament'));
    }
  }

  function showCreateTournamentModal() {
    const m = $('#createTournamentModal');
    m?.classList.remove('hidden'); m?.classList.add('flex');
  }
  function hideCreateTournamentModal() {
    const m = $('#createTournamentModal');
    m?.classList.add('hidden'); m?.classList.remove('flex');
  }

  async function viewTournament(tournamentId: number) {
    // fetch tournament details and show modal
    const r = await apiFetch(`/api/tournaments/${tournamentId}`, { method: 'GET' });
    if (!r.ok) { alert(r.data?.error || (ctx.t("tournament.loadError") ?? 'Error loading tournament')); return; }

    console.log('=== VIEW TOURNAMENT ===');
    console.log('Tournament data:', r.data);
    console.log('Status:', r.data.status);
    console.log('Matches:', r.data.matches);
    console.log('=== END VIEW TOURNAMENT ===');

    const t: BackendTournament = r.data;
    currentTournament = t;

    showTournamentDetailsModal(t);
  }

  function showTournamentDetailsModal(t: BackendTournament) {
    // create modal HTML similar to original; keep it simple
    const existing = document.getElementById('tournamentDetailsModal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'tournamentDetailsModal';
    modal.className = 'fixed inset-0 bg-black/90 backdrop-blur z-50 flex items-center justify-center p-4';
    // participants list
    const participantsHtml = (t.participants && t.participants.length > 0)
      ? t.participants.map(p => `<div class="flex items-center justify-between py-3 px-4 bg-white/5 rounded-lg border border-white/10"><div><div class="font-medium text-white">${escapeHtml(p.alias)}</div><div class="text-sm text-white/60">${escapeHtml(p.display_name || '')}</div></div><div class="text-xs text-white/40">${ctx.t("tournament.joined") ?? "Joined"}: ${p.joined_at ? new Date(p.joined_at).toLocaleString() : '—'}</div></div>`).join('')
      : `<div class="text-center text-white/60 py-8 bg-white/5 rounded-lg border border-white/10 border-dashed" data-translate="tournament.noParticipants">${ctx.t("tournament.noParticipants") ?? "No participants yet"}</div>`;

    // Determinar si el usuario está unido al torneo
    const isJoined = t.is_joined === 1;
    const isCreator = t.is_creator === 1;
    const canJoin = t.status === 'registration' && !isJoined && !isCreator;
    const canStart = isCreator && t.status === 'registration'; // Solo permitir iniciar manualmente

    // Usar la función helper para formato consistente del estado del torneo
    const statusFormat = formatTournamentStatus(t.status);

    modal.innerHTML = `
    <div class="bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-white/30 rounded-2xl p-6 max-w-4xl w-full mx-4 backdrop-blur-xl max-h-[90vh] overflow-y-auto relative">
      <button onclick="document.getElementById('tournamentDetailsModal')?.remove()" class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60">✕</button>
      <h2 class="text-2xl font-semibold mb-2">${escapeHtml(t.name)}</h2>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white/5 rounded-lg p-4"><div class="text-sm text-white/60 mb-1" data-translate="tournament.status">${ctx.t("tournament.status") ?? "Status"}</div><div class="${statusFormat.class}">${statusFormat.text}</div></div>
        <div class="bg-white/5 rounded-lg p-4"><div class="text-sm text-white/60 mb-1" data-translate="tournament.players">${ctx.t("tournament.players") ?? "Players"}</div><div class="font-semibold">${t.current_players ?? t.participants?.length ?? 0}/${t.max_players}</div></div>
        <div class="bg-white/5 rounded-lg p-4"><div class="text-sm text-white/60 mb-1" data-translate="tournament.round">${ctx.t("tournament.round") ?? "Round"}</div><div class="font-semibold">${t.current_round ?? 0}</div></div>
        <div class="bg-white/5 rounded-lg p-4"><div class="text-sm text-white/60 mb-1" data-translate="tournament.creator">${ctx.t("tournament.creator") ?? "Creator"}</div><div class="font-semibold">${escapeHtml(t.creator_name || (ctx.t("tournament.unknown") ?? "Unknown"))}</div></div>
      </div>
      <div class="mb-6"><h3 class="text-lg font-semibold mb-4" data-translate="tournament.participants">${ctx.t("tournament.participants") ?? "Participants"} (${t.participants?.length || 0})</h3><div class="space-y-2 max-h-48 overflow-y-auto">${participantsHtml}</div></div>
      ${(t.status === 'active' || t.status === 'completed' || t.status === 'finished') ? `<div class="mb-6"><h3 class="text-lg font-semibold mb-4" data-translate="tournament.bracket">${ctx.t("tournament.bracket") ?? "Tournament Bracket"}</h3><div class="bg-white/5 rounded-lg p-4 max-h-96 overflow-auto">${renderBracketPreviewHtml(t)}</div></div>` : ''}
      <div class="flex gap-3">
        ${canStart ? `<button id="startTournamentBtn" class="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500" data-translate="tournament.start">${ctx.t("tournament.start") ?? "Start Tournament"}</button>` : ''}
        ${canJoin ? `<button id="joinFromDetailsBtn" class="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500" data-translate="tournament.join">${ctx.t("tournament.join") ?? "Join"}</button>` : ''}
        ${isJoined && !isCreator && t.status === 'registration' ? `<button id="leaveFromDetailsBtn" class="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500" data-translate="tournament.leave">${ctx.t("tournament.leave") ?? "Leave"}</button>` : ''}
        ${t.status === 'finished' ? `<div class="flex-1 px-4 py-2 rounded-lg bg-yellow-600/20 text-yellow-300 border border-yellow-600/30 text-center">${ctx.t("tournament.completed") ?? "Completed"} ${(t as any).winner_name ? `- ${ctx.t("tournament.champion") ?? "Champion"}: ${(t as any).winner_name}` : ''}</div>` : ''}
        ${t.status === 'active' ? `<div class="flex-1 px-4 py-2 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-600/30 text-center">${ctx.t("tournament.inProgress") ?? "In Progress"} - ${ctx.t("tournament.round") ?? "Round"} ${t.current_round}</div>` : ''}
        ${isCreator && t.status !== 'finished' && t.status !== 'active' ? `<button id="deleteTournamentBtn" class="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500" data-translate="tournament.delete">${ctx.t("tournament.delete") ?? "Delete"}</button>` : ''}
      </div>
    </div>
  `;
    document.body.appendChild(modal);

    // bind advanced actions
    (document.getElementById('joinFromDetailsBtn') as HTMLButtonElement | null)?.addEventListener('click', () => {
      if (t.id) joinTournament(t.id);
    });
    
    // Añadir event listener para el botón de abandonar
    (document.getElementById('leaveFromDetailsBtn') as HTMLButtonElement | null)?.addEventListener('click', async () => {
      if (!confirm(ctx.t("tournament.confirmLeave") ?? 'Are you sure you want to leave this tournament?')) return;
      await leaveTournament(t.id);
      modal.remove();
    });
    
    (document.getElementById('deleteTournamentBtn') as HTMLButtonElement | null)?.addEventListener('click', () => {
      if (!confirm(ctx.t("tournament.confirmDelete") ?? 'Delete this tournament?')) return;
      deleteTournament(t.id);
      modal.remove();
    });
    (document.getElementById('startTournamentBtn') as HTMLButtonElement | null)?.addEventListener('click', async () => {
      if (t.status === 'registration') {
        if (!confirm(ctx.t("tournament.confirmStart") ?? 'Start tournament?')) return;
        modal.remove();
        await startTournament(t.id);
      }
    });

    // Add event listeners for play match buttons
    modal.querySelectorAll<HTMLButtonElement>('.play-match-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const matchId = btn.dataset.matchId;
        const tournamentId = btn.dataset.tournamentId;
        const player1 = btn.dataset.player1;
        const player2 = btn.dataset.player2;
        const player1Id = btn.dataset.player1Id;
        const player2Id = btn.dataset.player2Id;

        if (matchId && tournamentId && player1 && player2 && player1Id && player2Id) {
          modal.remove();
          showMatchAuthenticationModal({
            matchId,
            tournamentId,
            player1,
            player2,
            player1Id,
            player2Id
          });
        } else {
          alert('Missing match parameters');
        }
      });
    });
  }

  async function showMatchAuthenticationModal(matchData: any) {
    // Remove any existing auth modal
    const existingModal = document.getElementById('matchAuthModal');
    if (existingModal) existingModal.remove();

    // First, identify who is the opponent (the one who needs to authenticate)
    let opponentName = '';
    let currentUserName = '';
    
    try {
      // Get current user info to determine who is the opponent
      const userResponse = await apiFetch('/api/auth/me', { method: 'GET' });
      if (!userResponse.ok || !userResponse.data?.user) {
        alert('Unable to verify current user');
        return;
      }
      
      const currentUserId = userResponse.data.user.id;
      
      // Determine who is the opponent
      if (currentUserId.toString() === matchData.player1Id) {
        opponentName = matchData.player2;
        currentUserName = matchData.player1;
      } else if (currentUserId.toString() === matchData.player2Id) {
        opponentName = matchData.player1;
        currentUserName = matchData.player2;
      } else {
        alert('You are not a participant in this match');
        return;
      }
    } catch (error) {
      console.error('Error getting user info:', error);
      alert('Error verifying user information');
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'matchAuthModal';
    modal.className = 'fixed inset-0 bg-black/90 backdrop-blur z-50 flex items-center justify-center p-4';
    
    modal.innerHTML = `
      <div class="bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-white/30 rounded-2xl p-6 max-w-md w-full mx-4 backdrop-blur-xl">
        <button onclick="document.getElementById('matchAuthModal')?.remove()" class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60">✕</button>
        
        <h2 class="text-2xl font-semibold mb-4 text-center">
          <span data-translate="tournament.opponentAuth">${ctx.t("tournament.opponentAuth") ?? "Opponent Authentication"}</span>
        </h2>
        
        <div class="mb-6">
          <p class="text-white/70 text-sm text-center mb-4">
            ${ctx.t("tournament.opponentMustAuth") ?? "Your opponent must authenticate to start the match"}
          </p>
          <div class="text-center font-semibold mb-4">
            ${escapeHtml(currentUserName)} vs ${escapeHtml(opponentName)}
          </div>
          <div class="text-center text-indigo-400 text-sm">
            ${ctx.t("tournament.waitingFor") ?? "Waiting for"} <strong>${escapeHtml(opponentName)}</strong> ${ctx.t("tournament.toAuthenticate") ?? "to authenticate"}
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2" data-translate="tournament.email">${ctx.t("tournament.email") ?? "Email"}</label>
            <input type="email" id="authEmail" class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg" placeholder="${ctx.t("tournament.emailPlaceholder") ?? "Enter your email"}" required>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2" data-translate="tournament.password">${ctx.t("tournament.password") ?? "Password"}</label>
            <input type="password" id="authPassword" class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg" placeholder="${ctx.t("tournament.passwordPlaceholder") ?? "Enter your password"}" required>
          </div>

          <div id="authError" class="hidden p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"></div>

          <div class="flex gap-3 pt-4">
            <button type="button" onclick="document.getElementById('matchAuthModal')?.remove()" class="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 transition" data-translate="tournament.cancel">
              ${ctx.t("tournament.cancel") ?? "Cancel"}
            </button>
            <button type="button" id="authenticateBtn" class="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition" data-translate="tournament.authenticate">
              ${ctx.t("tournament.authenticate") ?? "Authenticate"}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Authentication logic
    const authBtn = modal.querySelector('#authenticateBtn') as HTMLButtonElement;
    const authError = modal.querySelector('#authError') as HTMLElement;
    const emailInput = modal.querySelector('#authEmail') as HTMLInputElement;
    const passwordInput = modal.querySelector('#authPassword') as HTMLInputElement;

    function showError(message: string) {
      authError.textContent = message;
      authError.classList.remove('hidden');
    }

    function hideError() {
      authError.classList.add('hidden');
    }

    authBtn?.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        showError(ctx.t("tournament.fillCredentials") ?? "Please fill in all credentials");
        return;
      }

      hideError();
      authBtn.disabled = true;
      authBtn.textContent = ctx.t("tournament.authenticating") ?? "Authenticating...";

      try {
        console.log('=== FRONTEND AUTH DEBUG ===');
        console.log('Authenticating opponent with:', { email, matchData });
        
        const response = await apiFetch(`/api/tournaments/${matchData.tournamentId}/matches/${matchData.matchId}/verify-opponent`, {
          method: 'POST',
          body: JSON.stringify({
            email,
            password
          })
        });

        console.log('Authentication response:', response);

        if (response.ok) {
          console.log('Authentication successful!');
          // Authentication successful, start the match
          const params = new URLSearchParams({
            matchId: matchData.matchId,
            tournamentId: matchData.tournamentId,
            player1: matchData.player1,
            player2: matchData.player2,
            player1Id: matchData.player1Id,
            player2Id: matchData.player2Id
          });

          modal.remove();
          ctx.navigate(`/tournament-pong?${params.toString()}`);
        } else {
          console.log('Authentication failed:', response.data);
          showError(response.data?.error || (ctx.t("tournament.authenticationFailed") ?? "Authentication failed"));
        }
      } catch (error) {
        console.log('Authentication error (catch):', error);
        showError(ctx.t("tournament.authenticationError") ?? "Authentication error");
        console.error('Authentication error:', error);
      } finally {
        authBtn.disabled = false;
        authBtn.textContent = ctx.t("tournament.authenticate") ?? "Authenticate";
      }
    });

    // Allow Enter key to submit
    emailInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        passwordInput?.focus();
      }
    });

    passwordInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        authBtn?.click();
      }
    });

    // Focus on email input
    setTimeout(() => emailInput?.focus(), 100);
  }

  function renderBracketPreviewHtml(t: BackendTournament): string {
    if (!t.matches || t.matches.length === 0) return `<div class="text-center text-white/60 py-4" data-translate="tournament.noMatches">${ctx.t("tournament.noMatches") ?? "No matches yet"}</div>`;
    
    // Group matches by round
    const rounds: Record<number, any[]> = {};
    for (const m of t.matches) { 
      rounds[m.round] = rounds[m.round] || []; 
      rounds[m.round].push(m); 
    }
    const keys = Object.keys(rounds).map(k => parseInt(k)).sort((a,b)=>a-b);
    
    // Función para obtener el nombre de la ronda (reutilizada)
    function getRoundName(roundNumber: number, totalRounds: number): string {
      const maxPlayers = t.max_players || 0;
      
      if (totalRounds === 1) {
        return ctx.t("tournament.final") ?? "Final";
      }
      
      if (roundNumber === totalRounds) {
        return ctx.t("tournament.final") ?? "Final";
      }
      
      if (roundNumber === totalRounds - 1) {
        return ctx.t("tournament.semifinals") ?? "Semifinals";
      }
      
      if (roundNumber === totalRounds - 2 && maxPlayers >= 8) {
        return ctx.t("tournament.quarterfinals") ?? "Quarterfinals";
      }
      
      const specificKey = `tournament.round${roundNumber}`;
      const specificTranslation = ctx.t(specificKey);
      if (specificTranslation && specificTranslation !== specificKey) {
        return specificTranslation;
      }
      
      return `${ctx.t("tournament.round") ?? "Round"} ${roundNumber}`;
    }
    
    const totalRounds = Math.max(...keys);
    
    // Create the bracket structure for the modal
    const columnsHtml = keys.map(rk => {
      const roundName = getRoundName(rk, totalRounds);
      const matchesHtml = rounds[rk].map(match => {
        // Check if current user is in this match and if it's pending
        const isUserInMatch = currentUser && (
          match.player1_user_id === currentUser.id || 
          match.player2_user_id === currentUser.id
        );
        const canPlay = !match.winner_id && isUserInMatch && match.player1_user_id && match.player2_user_id;
        
        // Prepare score display for completed matches
        const showScore = match.winner_id && (match.score_player1 !== null && match.score_player1 !== undefined) && (match.score_player2 !== null && match.score_player2 !== undefined);
        
        return `
        <div class="border border-white/20 rounded-lg p-3 bg-white/5 ${match.winner_id ? 'bg-green-500/10 border-green-500/30' : ''} ${canPlay ? 'bg-blue-500/10 border-blue-500/30' : ''} mb-3">
          <div class="space-y-2">
            <div class="flex items-center justify-between ${match.winner_id === match.player1_id ? 'text-green-300 font-semibold' : ''}">
              <span>${escapeHtml(match.player1_alias || 'TBD')}</span>
              ${showScore ? `<span class="text-sm ${match.winner_id === match.player1_id ? 'text-green-300 font-bold' : 'text-white/60'}">${match.score_player1}</span>` : ''}
            </div>
            <div class="border-t border-white/20"></div>
            <div class="flex items-center justify-between ${match.winner_id === match.player2_id ? 'text-green-300 font-semibold' : ''}">
              <span>${escapeHtml(match.player2_alias || 'TBD')}</span>
              ${showScore ? `<span class="text-sm ${match.winner_id === match.player2_id ? 'text-green-300 font-bold' : 'text-white/60'}">${match.score_player2}</span>` : ''}
            </div>
            ${canPlay ? `
            <div class="border-t border-white/20 mt-2 pt-2">
              <button 
                class="play-match-btn w-full px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-sm font-medium transition" 
                data-match-id="${match.id}" 
                data-tournament-id="${t.id}"
                data-player1="${escapeHtml(match.player1_alias || 'Player 1')}"
                data-player2="${escapeHtml(match.player2_alias || 'Player 2')}"
                data-player1-id="${match.player1_user_id || ''}"
                data-player2-id="${match.player2_user_id || ''}"
                data-translate="tournament.playMatch">
                ${ctx.t("tournament.playMatch") ?? "Play Match"}
              </button>
            </div>
            ` : ''}
          </div>
        </div>
        `;
      }).join('');
      
      return `
        <div class="flex flex-col gap-2 min-w-max">
          <h4 class="text-sm font-medium text-white/60 text-center mb-2">${roundName}</h4>
          ${matchesHtml}
        </div>
      `;
    }).join('');
    
    return `<div class="flex gap-6 overflow-x-auto pb-4">${columnsHtml}</div>`;
  }

  async function joinTournament(tournamentId: number) {
    if (!confirm(ctx.t("tournament.confirmJoin") ?? 'Join this tournament?')) return;
    
    const r = await apiFetch(`/api/tournaments/${tournamentId}/join`, { method: 'POST', body: JSON.stringify({}) });
    if (r.ok) {
      // Recargar AMBAS listas para actualizar el estado
      await loadAvailableTournaments();
      if (activeTab === 'my') {
        await loadMyTournaments();
      }
      
      alert(ctx.t("tournament.joinSuccess") ?? 'Successfully joined tournament!');
    } else {
      alert(r.data?.error || (ctx.t("tournament.joinError") ?? 'Error joining tournament'));
    }
  }

  async function leaveTournament(tournamentId: number) {
    if (!confirm(ctx.t("tournament.confirmLeave") ?? 'Are you sure you want to leave this tournament?')) return;
    const r = await apiFetch(`/api/tournaments/${tournamentId}/leave`, { method: 'DELETE' });
    if (r.ok) {
      await loadAvailableTournaments();
      await loadMyTournaments();
      alert(ctx.t("tournament.leaveSuccess") ?? 'Successfully left tournament!');
    } else {
      alert(r.data?.error || (ctx.t("tournament.leaveError") ?? 'Error leaving tournament'));
    }
  }

  async function deleteTournament(tournamentId: number) {
    if (!confirm(ctx.t("tournament.confirmDelete") ?? 'Delete tournament? This cannot be undone.')) return;
    const r = await apiFetch(`/api/tournaments/${tournamentId}`, { method: 'DELETE' });
    if (r.ok) {
      await loadAvailableTournaments();
      await loadMyTournaments();
      alert(ctx.t("tournament.deleteSuccess") ?? 'Tournament deleted successfully');
    } else {
      alert(r.data?.error || (ctx.t("tournament.deleteError") ?? 'Error deleting tournament'));
    }
  }

  async function startTournament(tournamentId: number) {
    console.log('Starting tournament:', tournamentId);
    document.getElementById('tournamentDetailsModal')?.remove();
    const r = await apiFetch(`/api/tournaments/${tournamentId}/start`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    console.log('Start tournament response:', r);
    if (r.ok) {
      await loadAvailableTournaments();
      await loadMyTournaments();

      const tournamentResponse = await apiFetch(`/api/tournaments/${tournamentId}`, { method: 'GET' });
      if (tournamentResponse.ok) {
        console.log('=== TOURNAMENT AFTER START ===');
        console.log('Updated tournament data:', tournamentResponse.data);
        console.log('Matches:', tournamentResponse.data.matches);
        console.log('Status:', tournamentResponse.data.status);
        console.log('=== END TOURNAMENT AFTER START ===');
        const updatedTournament: BackendTournament = tournamentResponse.data;
        currentTournament = updatedTournament;
        
      }
      
      alert(r.data?.message || (ctx.t("tournament.startSuccess") ?? 'Tournament started'));
      
      // Mostrar el modal actualizado con el nuevo status después del alert
      if (tournamentResponse.ok) {
        const updatedTournament: BackendTournament = tournamentResponse.data;
        setTimeout(() => {
          showTournamentDetailsModal(updatedTournament);
        }, 200);
      }
    } else {
      console.error('Error starting tournament:', r.data);
      alert(r.data?.error || (ctx.t("tournament.startError") ?? 'Error starting tournament'));
    }
  }





  // small helpers
  function escapeHtml(s: any) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'} as any)[m]);
  }
}
