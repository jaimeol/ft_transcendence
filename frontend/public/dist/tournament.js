// tournaments_frontend.ts
import { initializeLanguages } from "./translate.js";
export async function mount(el, ctx) {
    el.innerHTML = `
    <main class="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">Tournaments</h1>
          <p class="text-white/60 mt-1">Participate in tournaments and compete with other players</p>
        </div>
        <button id="createTournamentBtn" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition">
          ⚔️ Create Tournament
        </button>
      </div>

      <section id="currentTournamentSection" class="hidden bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold">Current Tournament</h2>
          <div id="tournamentStatus" class="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30"><span>Active</span></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div class="bg-white/5 rounded-lg p-4">
            <div class="text-sm text-white/60">Name</div>
            <div id="tournamentName" class="font-semibold">—</div>
          </div>
          <div class="bg-white/5 rounded-lg p-4">
            <div class="text-sm text-white/60">Players</div>
            <div id="tournamentPlayers" class="font-semibold">—</div>
          </div>
          <div class="bg-white/5 rounded-lg p-4">
            <div class="text-sm text-white/60">Round</div>
            <div id="tournamentRound" class="font-semibold">—</div>
          </div>
          <div class="bg-white/5 rounded-lg p-4">
            <div class="text-sm text-white/60">Creator</div>
            <div id="tournamentCreator" class="font-semibold">—</div>
          </div>
        </div>

        <div id="nextMatchSection" class="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4 mb-4 hidden">
          <h3 class="font-semibold mb-2">Next Match</h3>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="text-center">
                <div id="nextPlayer1" class="font-semibold">Player 1</div>
                <div class="text-xs text-white/60">vs</div>
              </div>
              <div class="text-2xl">⚔️</div>
              <div class="text-center">
                <div id="nextPlayer2" class="font-semibold">Player 2</div>
              </div>
            </div>
            <button id="startMatchBtn" class="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-sm font-medium transition">
              Start Match
            </button>
          </div>
        </div>

        <div class="bg-white/5 rounded-lg p-4">
          <h3 class="font-semibold mb-4">Tournament Bracket</h3>
          <div id="tournamentBracket" class="overflow-x-auto"></div>
        </div>
      </section>

      <!-- Tabs -->
      <div class="bg-white/5 border border-white/10 rounded-2xl backdrop-blur overflow-hidden">
        <div class="flex border-b border-white/10">
          <button id="availableTab" class="tab-button flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 bg-white/10 text-white border-b-2 border-indigo-500">🏆 Available Tournaments</button>
          <button id="myTournamentsTab" class="tab-button flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 text-white/60 hover:text-white hover:bg-white/5">🎯 My Tournaments</button>
          <button id="historyTab" class="tab-button flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 text-white/60 hover:text-white hover:bg-white/5">📚 Tournament History</button>
        </div>
        <div class="p-6">
          <div id="availableContent" class="tab-content">
            <div id="availableTournaments" class="space-y-4">
              <div class="text-center py-8 text-white/60">
                <div class="text-4xl mb-2">🏆</div>
                <div>No tournaments available</div>
                <div class="text-sm mt-1">Create the first tournament!</div>
              </div>
            </div>
          </div>
          <div id="myTournamentsContent" class="tab-content hidden">
            <div id="myTournaments" class="space-y-4">
              <div class="text-center py-8 text-white/60">
                <div class="text-4xl mb-2">🎯</div>
                <div>You're not participating in any tournaments</div>
                <div class="text-sm mt-1">Join a tournament to see it here!</div>
              </div>
            </div>
          </div>
          <div id="historyContent" class="tab-content hidden">
            <div id="tournamentHistory" class="space-y-4">
              <div class="text-center py-8 text-white/60">
                <div class="text-4xl mb-2">📚</div>
                <div>No tournament history</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Tournament Modal (hidden) -->
      <div id="createTournamentModal" class="fixed inset-0 bg-black/50 backdrop-blur z-50 hidden items-center justify-center">
        <div class="bg-white/10 border border-white/20 rounded-2xl p-6 max-w-md w-full mx-4 backdrop-blur-xl">
          <h2 class="text-xl font-semibold mb-4">Create Tournament</h2>
          <form id="createTournamentForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">Tournament Name</label>
              <input type="text" id="tournamentNameInput" class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg" placeholder="My Epic Tournament" required>
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">Number of Players</label>
              <select id="tournamentPlayersInput" class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg">
                <option value="4">4 Players</option>
                <option value="8">8 Players</option>
                <option value="16">16 Players</option>
                <option value="32">32 Players</option>
              </select>
            </div>
            <div class="flex gap-3 pt-4">
              <button type="button" id="cancelTournamentBtn" class="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 transition">Cancel</button>
              <button type="submit" class="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition">Create</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  `;
    // helpers
    function $(sel) { return el.querySelector(sel); }
    async function apiFetch(path, opts = {}) {
        opts.credentials = 'include';
        opts.headers = { ...(opts.headers || {}), 'Content-Type': 'application/json' };
        const res = await fetch(path, opts);
        const text = await res.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        }
        catch {
            data = text;
        }
        return { ok: res.ok, status: res.status, data };
    }
    // state
    let availableTournaments = [];
    let myTournaments = [];
    let currentTournament = null;
    let activeTab = 'available';
    let currentUser = null;
    // init
    await initializeLanguages();
    bindEventListeners();
    await loadCurrentUser();
    await loadAvailableTournaments();
    // --- functions ---
    async function loadCurrentUser() {
        try {
            const r = await apiFetch('/api/auth/me', { method: 'GET' });
            if (r.ok && r.data && r.data.user)
                currentUser = r.data.user;
        }
        catch (e) {
            console.error('loadCurrentUser', e);
        }
    }
    async function loadAvailableTournaments() {
        try {
            const r = await apiFetch('/api/tournaments', { method: 'GET' });
            if (r.ok) {
                availableTournaments = Array.isArray(r.data) ? r.data : [];
                renderAvailableTournaments();
            }
            else {
                console.error('Failed loading tournaments', r.data);
            }
        }
        catch (err) {
            console.error(err);
        }
    }
    async function loadMyTournaments() {
        try {
            const r = await apiFetch('/api/tournaments', { method: 'GET' });
            if (r.ok) {
                const all = Array.isArray(r.data) ? r.data : [];
                myTournaments = all.filter(t => t.is_joined === 1);
                renderMyTournaments();
            }
        }
        catch (err) {
            console.error(err);
        }
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
    function switchTab(tab) {
        activeTab = tab;
        ['availableTab', 'myTournamentsTab', 'historyTab'].forEach(id => {
            const elTab = $(`#${id}`);
            if (!elTab)
                return;
            elTab.className = 'tab-button flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 text-white/60 hover:text-white hover:bg-white/5';
        });
        const activeId = tab === 'available' ? 'availableTab' : tab === 'my' ? 'myTournamentsTab' : 'historyTab';
        const activeEl = $(`#${activeId}`);
        if (activeEl)
            activeEl.className = 'tab-button flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 bg-white/10 text-white border-b-2 border-indigo-500';
        $('#availableContent').classList.toggle('hidden', tab !== 'available');
        $('#myTournamentsContent').classList.toggle('hidden', tab !== 'my');
        $('#historyContent').classList.toggle('hidden', tab !== 'history');
        if (tab === 'my')
            loadMyTournaments();
        if (tab === 'available')
            renderAvailableTournaments();
        if (tab === 'history')
            renderHistory();
    }
    function renderAvailableTournaments() {
        const container = $('#availableTournaments');
        if (!container)
            return;
        container.innerHTML = '';
        if (availableTournaments.length === 0) {
            container.innerHTML = `<div class="text-center py-8 text-white/60"><div class="text-4xl mb-2">🏆</div><div>No tournaments available</div><div class="text-sm mt-1">Create the first tournament!</div></div>`;
            return;
        }
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
        for (const t of availableTournaments) {
            const card = document.createElement('div');
            card.className = 'bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition flex flex-col';
            const canJoin = t.status === 'registration' && (t.current_players || 0) < (t.max_players || 0);
            const isJoined = t.is_joined === 1;
            card.innerHTML = `
        <div class="flex-1">
          <div class="flex items-start justify-between mb-3">
            <h3 class="font-semibold text-lg">${escapeHtml(t.name)}</h3>
            <div class="px-2 py-1 rounded-full text-xs font-medium text-white/60 ml-2">${escapeHtml(t.status)}</div>
          </div>
          <div class="text-center mb-4">
            <div class="text-2xl font-bold text-white">${t.current_players || 0}/${t.max_players || 0}</div>
            <div class="text-xs text-white/60">Players</div>
          </div>
        </div>
        <div class="space-y-2">
          <button data-id="${t.id}" class="view-details w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm transition">View Details</button>
          ${canJoin ? (isJoined ? `<button data-id="${t.id}" class="leave-t w-full px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm transition">Leave Tournament</button>` : `<button data-id="${t.id}" class="join-t w-full px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm transition">Join Tournament</button>`) : ''}
        </div>
      `;
            grid.appendChild(card);
        }
        container.appendChild(grid);
        // delegate buttons
        container.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', () => viewTournament(parseInt(btn.dataset.id)));
        });
        container.querySelectorAll('.join-t').forEach(btn => {
            btn.addEventListener('click', () => showJoinModal(parseInt(btn.dataset.id)));
        });
        container.querySelectorAll('.leave-t').forEach(btn => {
            btn.addEventListener('click', () => leaveTournament(parseInt(btn.dataset.id)));
        });
    }
    function renderMyTournaments() {
        const container = $('#myTournaments');
        if (!container)
            return;
        container.innerHTML = '';
        if (myTournaments.length === 0) {
            container.innerHTML = `<div class="text-center py-8 text-white/60"><div class="text-4xl mb-2">🎮</div><div>You haven't joined any tournaments yet</div><div class="text-sm mt-1">Join a tournament to see it here!</div></div>`;
            return;
        }
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
        for (const t of myTournaments) {
            const card = document.createElement('div');
            card.className = 'bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition flex flex-col';
            card.innerHTML = `
        <div class="flex-1">
          <div class="flex items-start justify-between mb-3">
            <h3 class="font-semibold text-lg">${escapeHtml(t.name)}</h3>
            <div class="px-2 py-1 rounded-full text-xs font-medium text-white/60 ml-2">${escapeHtml(t.status)}</div>
          </div>
          <div class="text-center mb-4">
            <div class="text-2xl font-bold text-white">${t.current_players || 0}/${t.max_players || 0}</div>
            <div class="text-xs text-white/60">Players</div>
          </div>
        </div>
        <div class="space-y-2">
          <button data-id="${t.id}" class="view-details w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm transition">View Details</button>
          <button data-id="${t.id}" class="leave-t w-full px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm transition">Leave Tournament</button>
        </div>
      `;
            grid.appendChild(card);
        }
        container.appendChild(grid);
        container.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', () => viewTournament(parseInt(btn.dataset.id)));
        });
        container.querySelectorAll('.leave-t').forEach(btn => {
            btn.addEventListener('click', () => leaveTournament(parseInt(btn.dataset.id)));
        });
    }
    function renderHistory() {
        const container = $('#tournamentHistory');
        if (!container)
            return;
        container.innerHTML = `<div class="text-center py-8 text-white/60"><div class="text-4xl mb-2">📚</div><div>Tournament history</div><div class="text-sm mt-1">Past tournaments will appear here</div></div>`;
    }
    async function handleCreateTournament(e) {
        e.preventDefault();
        const nameInput = $('#tournamentNameInput');
        const playersInput = $HTMLSelectElement('#tournamentPlayersInput');
        if (!nameInput || !playersInput)
            return;
        const name = nameInput.value.trim();
        const maxPlayers = parseInt(playersInput.value, 10);
        if (!name)
            return alert('Name required');
        const r = await apiFetch('/api/tournaments', {
            method: 'POST',
            body: JSON.stringify({ name, maxPlayers, isPublic: true })
        });
        if (r.ok) {
            hideCreateTournamentModal();
            await loadAvailableTournaments();
            nameInput.value = '';
            playersInput.value = '4';
            alert('Tournament created successfully!');
        }
        else {
            alert(r.data?.error || 'Error creating tournament');
        }
    }
    function showCreateTournamentModal() {
        const m = $('#createTournamentModal');
        m?.classList.remove('hidden');
        m?.classList.add('flex');
    }
    function hideCreateTournamentModal() {
        const m = $('#createTournamentModal');
        m?.classList.add('hidden');
        m?.classList.remove('flex');
    }
    async function viewTournament(tournamentId) {
        // fetch tournament details and show modal
        const r = await apiFetch(`/api/tournaments/${tournamentId}`, { method: 'GET' });
        if (!r.ok) {
            alert(r.data?.error || 'Error loading tournament');
            return;
        }
        console.log('=== VIEW TOURNAMENT ===');
        console.log('Tournament data:', r.data);
        console.log('Status:', r.data.status);
        console.log('Matches:', r.data.matches);
        console.log('=== END VIEW TOURNAMENT ===');
        const t = r.data;
        currentTournament = t;
        showTournamentDetailsModal(t);
        if (t.status === 'active' || t.status === 'completed' || t.status === 'finished') {
            renderCurrentTournamentSection(t);
        }
    }
    function renderCurrentTournamentSection(t) {
        const sec = $('#currentTournamentSection');
        if (!sec)
            return;
        sec.classList.remove('hidden');
        $('#tournamentName').textContent = t.name;
        $('#tournamentPlayers').textContent = String(t.participants?.length ?? t.current_players ?? 0);
        $('#tournamentRound').textContent = String(t.current_round ?? t.current_round ?? 0);
        $('#tournamentCreator').textContent = t.creator_name || 'Unknown';
        const statusEl = $('#tournamentStatus');
        if (statusEl) {
            statusEl.className = `px-3 py-1 rounded-full text-xs font-medium text-white/60`;
            statusEl.innerHTML = `<span>${escapeHtml(String(t.status))}</span>`;
        }
        updateNextMatch();
        renderTournamentBracket(t);
    }
    function renderTournamentBracket(t) {
        const bracket = $('#tournamentBracket');
        if (!bracket || !t)
            return;
        bracket.innerHTML = '';
        if (!t.matches || t.matches.length === 0) {
            bracket.innerHTML = '<div class="text-center text-white/60">No matches yet</div>';
            return;
        }
        // group by round
        const rounds = {};
        for (const m of t.matches) {
            rounds[m.round] = rounds[m.round] || [];
            rounds[m.round].push(m);
        }
        const container = document.createElement('div');
        container.className = 'flex gap-8 overflow-x-auto pb-4';
        const roundKeys = Object.keys(rounds).map(k => parseInt(k)).sort((a, b) => a - b);
        for (const rk of roundKeys) {
            const col = document.createElement('div');
            col.className = 'flex flex-col gap-4 min-w-max';
            const header = document.createElement('h4');
            header.className = 'text-sm font-medium text-white/60 text-center mb-2';
            header.textContent = `Round ${rk}`;
            col.appendChild(header);
            for (const match of rounds[rk]) {
                const card = document.createElement('div');
                card.className = `border border-white/20 rounded-lg p-3 bg-white/5 ${match.winner_id ? 'bg-green-500/10 border-green-500/30' : ''}`;
                card.innerHTML = `
          <div class="space-y-2">
            <div class="flex items-center justify-between ${match.winner_id === match.player1_id ? 'text-green-300 font-semibold' : ''}">
              <span>${escapeHtml(match.player1_alias || 'TBD')}</span>
              ${match.winner_id === match.player1_id ? '<span>🏆</span>' : ''}
            </div>
            <div class="border-t border-white/20"></div>
            <div class="flex items-center justify-between ${match.winner_id === match.player2_id ? 'text-green-300 font-semibold' : ''}">
              <span>${escapeHtml(match.player2_alias || 'TBD')}</span>
              ${match.winner_id === match.player2_id ? '<span>🏆</span>' : ''}
            </div>
          </div>
        `;
                col.appendChild(card);
            }
            container.appendChild(col);
        }
        bracket.appendChild(container);
    }
    function updateNextMatch() {
        if (!currentTournament?.matches)
            return;
        const curRound = currentTournament.current_round ?? 1;
        const pending = currentTournament.matches.filter(m => m.round === curRound && !m.winner_id);
        const next = pending[0];
        const section = $('#nextMatchSection');
        if (!next) {
            section?.classList.add('hidden');
            return;
        }
        $('#nextPlayer1').textContent = next.player1_alias || 'TBD';
        $('#nextPlayer2').textContent = next.player2_alias || 'TBD';
        section?.classList.remove('hidden');
        const startBtn = $('#startMatchBtn');
        if (startBtn) {
            startBtn.replaceWith(startBtn.cloneNode(true));
            const newStartBtn = $('#startMatchBtn');
            newStartBtn?.addEventListener('click', () => {
                // DEBUG MEJORADO
                console.log('Next match object:', next);
                console.log('player1_participant_id:', next.player1_participant_id);
                console.log('player2_participant_id:', next.player2_participant_id);
                const params = new URLSearchParams({
                    matchId: String(next.id),
                    tournamentId: String(currentTournament.id),
                    player1: next.player1_alias || 'Player 1',
                    player2: next.player2_alias || 'Player 2',
                    player1Id: String(next.player1_participant_id || ''), // USAR participant_id
                    player2Id: String(next.player2_participant_id || '') // USAR participant_id
                });
                console.log('All params:', params.toString());
                ctx.navigate(`/tournament-pong?${params.toString()}`);
            });
        }
    }
    function showTournamentDetailsModal(t) {
        // create modal HTML similar to original; keep it simple
        const existing = document.getElementById('tournamentDetailsModal');
        if (existing)
            existing.remove();
        const modal = document.createElement('div');
        modal.id = 'tournamentDetailsModal';
        modal.className = 'fixed inset-0 bg-black/90 backdrop-blur z-50 flex items-center justify-center p-4';
        // participants list
        const participantsHtml = (t.participants && t.participants.length > 0)
            ? t.participants.map(p => `<div class="flex items-center justify-between py-3 px-4 bg-white/5 rounded-lg border border-white/10"><div><div class="font-medium text-white">${escapeHtml(p.alias)}</div><div class="text-sm text-white/60">${escapeHtml(p.display_name || '')}</div></div><div class="text-xs text-white/40">Joined: ${p.joined_at ? new Date(p.joined_at).toLocaleString() : '—'}</div></div>`).join('')
            : '<div class="text-center text-white/60 py-8 bg-white/5 rounded-lg border border-white/10 border-dashed">No participants yet</div>';
        // Determinar si el usuario está unido al torneo
        const isJoined = t.is_joined === 1;
        const isCreator = t.is_creator === 1;
        const canJoin = t.status === 'registration' && !isJoined && !isCreator;
        let statusText = escapeHtml(String(t.status));
        let statusClass = 'px-2 py-1 rounded-full text-xs font-medium text-white/60';
        if (isJoined && !isCreator) {
            statusText = 'Joined';
            statusClass = 'px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30';
        }
        else if (isCreator) {
            statusText = 'Creator';
            statusClass = 'px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30';
        }
        modal.innerHTML = `
    <div class="bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-white/30 rounded-2xl p-6 max-w-2xl w-full mx-4 backdrop-blur-xl max-h-[90vh] overflow-y-auto relative">
      <button onclick="document.getElementById('tournamentDetailsModal')?.remove()" class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/60">✕</button>
      <h2 class="text-2xl font-semibold mb-2">${escapeHtml(t.name)}</h2>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white/5 rounded-lg p-4"><div class="text-sm text-white/60 mb-1">Status</div><div class="${statusClass}">${statusText}</div></div>
        <div class="bg-white/5 rounded-lg p-4"><div class="text-sm text-white/60 mb-1">Players</div><div class="font-semibold">${t.current_players ?? t.participants?.length ?? 0}/${t.max_players}</div></div>
        <div class="bg-white/5 rounded-lg p-4"><div class="text-sm text-white/60 mb-1">Round</div><div class="font-semibold">${t.current_round ?? 0}</div></div>
        <div class="bg-white/5 rounded-lg p-4"><div class="text-sm text-white/60 mb-1">Creator</div><div class="font-semibold">${escapeHtml(t.creator_name || 'Unknown')}</div></div>
      </div>
      <div class="mb-6"><h3 class="text-lg font-semibold mb-4">Participants (${t.participants?.length || 0})</h3><div class="space-y-2 max-h-48 overflow-y-auto">${participantsHtml}</div></div>
      ${(t.status === 'active' || t.status === 'completed' || t.status === 'finished') ? `<div class="mb-6"><h3 class="text-lg font-semibold mb-4">Bracket</h3><div class="bg-white/5 rounded-lg p-4">${renderBracketPreviewHtml(t)}</div></div>` : ''}
      <div class="flex gap-3">
        ${isCreator ? `<button id="startTournamentBtn" class="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500">Start/Advance</button>` : ''}
        ${canJoin ? `<button id="joinFromDetailsBtn" class="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500">Join</button>` : ''}
        ${isJoined && !isCreator ? `<button id="leaveFromDetailsBtn" class="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500">Leave</button>` : ''}
        ${isCreator ? `<button id="deleteTournamentBtn" class="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500">Delete</button>` : ''}
      </div>
    </div>
  `;
        document.body.appendChild(modal);
        // bind advanced actions
        document.getElementById('joinFromDetailsBtn')?.addEventListener('click', () => {
            if (t.id)
                showJoinModal(t.id);
        });
        // Añadir event listener para el botón de abandonar
        document.getElementById('leaveFromDetailsBtn')?.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to leave this tournament?'))
                return;
            await leaveTournament(t.id);
            modal.remove();
        });
        document.getElementById('deleteTournamentBtn')?.addEventListener('click', () => {
            if (!confirm('Delete this tournament?'))
                return;
            deleteTournament(t.id);
            modal.remove();
        });
        document.getElementById('startTournamentBtn')?.addEventListener('click', async () => {
            modal.remove();
            if (t.status === 'registration') {
                // start
                if (!confirm('Start tournament?'))
                    return;
                await startTournament(t.id);
            }
            else if (t.status === 'active') {
                // show advance check
                await checkAndShowAdvanceButton(t.id);
            }
        });
    }
    function renderBracketPreviewHtml(t) {
        if (!t.matches || t.matches.length === 0)
            return '<div class="text-center text-white/60 py-4">No matches yet</div>';
        const rounds = {};
        for (const m of t.matches) {
            rounds[m.round] = rounds[m.round] || [];
            rounds[m.round].push(m);
        }
        const keys = Object.keys(rounds).map(k => parseInt(k)).sort((a, b) => a - b);
        return keys.map(rk => {
            const matchesHtml = rounds[rk].map(m => `<div class="flex items-center justify-between bg-white/5 rounded p-3 text-sm mb-2"><div>${escapeHtml(m.player1_alias || 'TBD')} vs ${escapeHtml(m.player2_alias || 'TBD')}</div><div class="text-xs text-white/60">${m.winner_id ? 'Winner: ' + escapeHtml(m.winner_alias || '') : 'Pending'}</div></div>`).join('');
            return `<div><h4 class="text-sm font-medium text-white/80 mb-2">Round ${rk}</h4>${matchesHtml}</div>`;
        }).join('');
    }
    function showJoinModal(tournamentId) {
        const existing = document.getElementById('joinTournamentModal');
        if (existing)
            existing.remove();
        const modal = document.createElement('div');
        modal.id = 'joinTournamentModal';
        modal.className = 'fixed inset-0 bg-black/50 backdrop-blur z-50 flex items-center justify-center';
        modal.innerHTML = `
      <div class="bg-white/10 border border-white/20 rounded-2xl p-6 max-w-md w-full mx-4 backdrop-blur-xl">
        <h2 class="text-xl font-semibold mb-4">Join Tournament</h2>
        <form id="joinTournamentForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Your Alias</label>
            <input type="text" id="joinAliasInput" class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg" placeholder="Alias" required>
          </div>
          <div class="flex gap-3 pt-4">
            <button type="button" id="cancelJoinBtn" class="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20">Cancel</button>
            <button type="submit" class="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500">Join</button>
          </div>
        </form>
      </div>
    `;
        document.body.appendChild(modal);
        modal.querySelector('#cancelJoinBtn')?.addEventListener('click', () => modal.remove());
        modal.querySelector('#joinTournamentForm')?.addEventListener('submit', (e) => handleJoinTournament(e, tournamentId));
    }
    async function handleJoinTournament(e, tournamentId) {
        e.preventDefault();
        const modal = document.getElementById('joinTournamentModal');
        if (!modal)
            return;
        const aliasEl = modal.querySelector('#joinAliasInput');
        if (!aliasEl)
            return;
        const alias = aliasEl.value.trim();
        if (!alias)
            return alert('Alias required');
        const r = await apiFetch(`/api/tournaments/${tournamentId}/join`, { method: 'POST', body: JSON.stringify({ alias }) });
        if (r.ok) {
            document.getElementById('joinTournamentModal')?.remove();
            // Recargar AMBAS listas para actualizar el estado
            await loadAvailableTournaments();
            if (activeTab === 'my') {
                await loadMyTournaments();
            }
            alert('Successfully joined tournament!');
        }
        else {
            alert(r.data?.error || 'Error joining tournament');
        }
    }
    async function leaveTournament(tournamentId) {
        if (!confirm('Are you sure you want to leave this tournament?'))
            return;
        const r = await apiFetch(`/api/tournaments/${tournamentId}/leave`, { method: 'DELETE' });
        if (r.ok) {
            await loadAvailableTournaments();
            await loadMyTournaments();
            alert('Successfully left tournament!');
        }
        else {
            alert(r.data?.error || 'Error leaving tournament');
        }
    }
    async function deleteTournament(tournamentId) {
        if (!confirm('Delete tournament? This cannot be undone.'))
            return;
        const r = await apiFetch(`/api/tournaments/${tournamentId}`, { method: 'DELETE' });
        if (r.ok) {
            await loadAvailableTournaments();
            await loadMyTournaments();
            alert('Tournament deleted successfully');
        }
        else {
            alert(r.data?.error || 'Error deleting tournament');
        }
    }
    async function startTournament(tournamentId) {
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
                const updatedTournament = tournamentResponse.data;
                currentTournament = updatedTournament;
                renderCurrentTournamentSection(updatedTournament);
            }
            alert(r.data?.message || 'Tournament started');
        }
        else {
            console.error('Error starting tournament:', r.data);
            alert(r.data?.error || 'Error starting tournament');
        }
    }
    async function checkAndShowAdvanceButton(tournamentId) {
        const r = await apiFetch(`/api/tournaments/${tournamentId}/can-advance-round`, { method: 'GET' });
        if (!r.ok) {
            alert(r.data?.error || 'Error checking');
            return;
        }
        const data = r.data;
        if (data.canAdvance) {
            if (!confirm('Advance to next round?'))
                return;
            await advanceTournamentRound(tournamentId);
        }
        else if (data.isCompleted) {
            alert('Tournament completed — show winner.');
            await showTournamentWinner(tournamentId);
        }
        else {
            alert(`Cannot advance: ${data.incompleteMatches} incomplete matches`);
        }
    }
    async function advanceTournamentRound(tournamentId) {
        const r = await apiFetch(`/api/tournaments/${tournamentId}/advance-round`, { method: 'POST' });
        if (r.ok) {
            await loadAvailableTournaments();
            await loadMyTournaments();
            alert(r.data?.message || `Advanced to round ${r.data?.newRound}`);
        }
        else {
            alert(r.data?.error || 'Error advancing round');
        }
    }
    async function showTournamentWinner(tournamentId) {
        const r = await apiFetch(`/api/tournaments/${tournamentId}`, { method: 'GET' });
        if (!r.ok) {
            alert(r.data?.error || 'Error loading tournament');
            return;
        }
        const t = r.data;
        if (t.status === 'finished' && t.winner_id) {
            let winnerName = null;
            if (Array.isArray(t.participants)) {
                const p = t.participants.find((part) => part.user_id === t.winner_id);
                if (p) {
                    winnerName = p.display_name || p.alias || null;
                }
            }
            if (!winnerName) {
                try {
                    const ru = await apiFetch(`/api/users/${t.winner_id}`, { method: 'GET' });
                    if (ru.ok && ru.data && ru.data.user) {
                        winnerName = ru.data.user.display_name || ru.data.user.username || null;
                    }
                }
                catch (err) {
                    console.error('Error fetching winner user:', err);
                }
            }
            alert(`Winner: ${winnerName ?? t.winner_id}`);
        }
        else {
            alert('Tournament not finished yet or winner not defined');
        }
    }
    // small helpers
    function escapeHtml(s) {
        if (s == null)
            return '';
        return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }
    // typed selectors
    function $HTMLSelectElement(sel) { return el.querySelector(sel); }
    function $HTMLElement(sel) { return el.querySelector(sel); }
}
