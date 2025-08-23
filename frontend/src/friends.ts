function escapeHTML(s: string): string {
  return (s || "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!
  ));
}

async function loadFriends() {
  const listEl = document.getElementById("list") as HTMLElement;
  const errBox = document.getElementById("err") as HTMLElement;
  listEl.textContent = "Cargando...";
  errBox.textContent = "";

  try {
    const res = await fetch("/api/friends", { credentials: "include" });
    if (!res.ok) throw res;
    const { friends } = await res.json();

    if (!friends || friends.length === 0) {
      listEl.textContent = "Todavía no tienes amigos 😢";
      return;
    }

    listEl.innerHTML = friends.map((f: any) => `
      <div class="flex items-center gap-3 p-2 rounded bg-zinc-800/60 hover:bg-zinc-800 transition">
        <img src="${f.avatar_path || "/default-avatar.png"}" width="36" height="36" class="avatar" alt="Avatar">
        <div>
          <div class="font-semibold">${escapeHTML(f.display_name)}</div>
          <div class="opacity-70 text-xs">${f.online ? "🟢 Online" : "⚪ Offline"}</div>
        </div>
      </div>
    `).join("");
  } catch (err: any) {
    if (err?.status === 401) {
      location.href = "/login.html";
    } else {
      listEl.textContent = "";
      errBox.textContent = "❌ Error cargando amigos";
    }
  }
}

document.addEventListener("DOMContentLoaded", loadFriends);
