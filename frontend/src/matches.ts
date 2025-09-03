function $(sel: string, parent: Document | HTMLElement = document) {
  return parent.querySelector(sel);
}

export function apiFetch(url: string, init?: RequestInit): Promise<any> {
  return new Promise(async (resolve, reject) => {
    try {
      if ((window as any).api) {
        const data = await (window as any).api(url, init);
        if (data && typeof data === "object" && "ok" in data && "json" in data) {
          const res = data as Response;
          if (!res.ok) throw new Error(String(res.status));
          return resolve(await res.json());
        }
        return resolve(data);
      }
      const res = await fetch(url, { credentials: "include", ...init });
      if (!res.ok) throw new Error(String(res.status));
      resolve(await res.json());
    } catch (e) {
      reject(e);
    }
  });
}

function escapeHtml(s: string = "") {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c)
  );
}

const fmtDateTime = (s?: string) =>
  !s ? "—" : new Date(s).toLocaleString();

function parseScore(details?: string) {
  if (!details) return {};
  try {
    const j = JSON.parse(details);
    const left = Number.isFinite(j?.leftScore) ? Number(j.leftScore) : undefined;
    const right = Number.isFinite(j?.rightScore) ? Number(j.rightScore) : undefined;
    return { left, right };
  } catch {
    return {};
  }
}

function formatDuration(ms?: number) {
  if (!ms) return "—";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${s}s`;
}

function resultFor(meId: number, m: any): "W" | "L" | "D" {
  if (!m.winner_id || m.winner_id === 0 || m.winner_id === -1) return "D";
  return m.winner_id === meId ? "W" : "L";
}

async function getUserName(userId: number): Promise<string> {
  if (!userId || userId <= 0) return "IA";
  try {
    const { user } = await apiFetch(`/api/users/${userId}`);
    return user?.display_name || `Usuario #${userId}`;
  } catch {
    return `Usuario #${userId}`;
  }
}

async function loadMatches() {
  const tbody = $("#matches-table") as HTMLElement;
  const errorEl = $("#matches-error") as HTMLElement | null;
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-400">Cargando…</td></tr>`;

  try {
    const me = await apiFetch("/api/auth/me");
    const myId = me.user.id;
    const r = await apiFetch("/api/users/me/matches");
    const list = r.matches || [];

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-400">Aún no hay partidas</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    const namesCache = new Map<number, string>();

    for (const m of list) {
      const oppId = m.player1_id === myId ? m.player2_id : m.player1_id;
      let opponent: string;
      if (namesCache.has(oppId)) {
        opponent = namesCache.get(oppId)!;
      } else {
        opponent = await getUserName(oppId);
        namesCache.set(oppId, opponent);
      }

      const { left, right } = parseScore(m.details);
      const score =
        Number.isFinite(left) && Number.isFinite(right)
          ? `${left}-${right}`
          : "—";

      const when = fmtDateTime(m.played_at);
      const mode = m.mode === "ai" ? "IA" : "PvP";
      const duration = formatDuration(m.duration_ms);

      const res = resultFor(myId, m);
      const badgeClass =
        res === "W"
          ? "bg-emerald-600/70 text-emerald-200"
          : res === "L"
          ? "bg-rose-600/70 text-rose-200"
          : "bg-zinc-600/70 text-zinc-200";
      const label =
        res === "W" ? "Victoria" : res === "L" ? "Derrota" : "Empate";

      const row = document.createElement("tr");
      row.className = "hover:bg-gray-700 transition";
      row.innerHTML = `
        <td class="py-3 px-4">${escapeHtml(when)}</td>
        <td class="py-3 px-4">${escapeHtml(mode)}</td>
        <td class="py-3 px-4">${escapeHtml(opponent)}</td>
        <td class="py-3 px-4 text-center">
          <span class="px-2 py-1 rounded text-xs font-semibold ${badgeClass}">
            ${label} ${score !== "—" ? `· ${score}` : ""}
          </span>
        </td>
        <td class="py-3 px-4 text-right">${escapeHtml(duration)}</td>
      `;
      tbody.appendChild(row);
    }
  } catch (err) {
    console.error(err);
    if (errorEl) {
      errorEl.textContent = "No se pudo cargar el historial de partidas.";
      errorEl.classList.remove("hidden");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadMatches();
});
