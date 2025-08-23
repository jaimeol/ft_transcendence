declare global {
	interface Window {
		api: (url: string, init?: RequestInit) => Promise<any>;
	}
}

function escapeHTML(s: string = ""): string {
  return s.replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

function normalizePath(p?: string | null) {
	const clean = (p ?? '').replace(/[""']/g, '').trim();
	return clean || '/uploads/default-avatar.png';
}

async function me() {
	try {
		const j = await window.api("/api/auth/me");
		const u = j.user;

		const avatar = normalizePath(u?.avatar_path);
		document.getElementById('info')!.innerHTML = `
		<img class="avatar" src="${avatar}" width="72" height="72" alt="Avatar"
       onerror="this.onerror=null; this.src='/default-avatar.png'">
		<div>
			<div class="font-bold">${escapeHTML(u.display_name || '')}</div>
    	<div class="opacity-80 text-sm">${escapeHTML(u.email || '')}</div>
  	</div>`;
		return u;
	} catch {
		location.href = "/login.html";
	}
}

function wireUpdateForm() {
	const form = document.getElementById("upd") as HTMLFormElement | null;
	if (!form) return;

	form.addEventListener("submit", async e => {
		e.preventDefault();
		const data = Object.fromEntries(new FormData(form).entries());
		const errBox = document.getElementById("err-upd");
		try {
			await window.api("/api/auth/me", {method: "PUT", body: JSON.stringify(data) });
			await me();
			if (errBox) errBox.textContent = "✅ Datos actualizados";
		} catch (err: any) {
			if (errBox) errBox.textContent = err?.message || "Error actualizando perfil";
		}
	});
}

function wireAvatarForm() {
	const form = document.getElementById("ava") as HTMLFormElement | null;
	if (!form) return;

	form.addEventListener("submit", async e => {
		e.preventDefault();
		const fd = new FormData(form);
		const errBox = document.getElementById("err-ava");
		try {
			const res = await fetch("/api/users/me/avatar", {
				method: "POST",
				body: fd,
				credentials: "include"
			});
			if (res.ok) {
				await me();
				if (errBox) errBox.textContent = "✅ Avatar actualizado";
			} else {
				if (errBox) errBox.textContent = "Error subiendo avatar";
			}
		} catch {
			if (errBox) errBox.textContent = "Error subiendo avatar";
		}
	});
}

export async function logout(e?: Event) {
	e?.preventDefault();
	try {
		await window.api("/api/auth/logout", { method: "POST"});
	} finally {
		location.href = "/";
	}
}

document.addEventListener("DOMContentLoaded", () => {
	me();
	wireUpdateForm();
	wireAvatarForm();
})

export {};