// frontend/src/chat.ts
// ===== Helpers =====
const $ = (s, p = document) => p.querySelector(s);
function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
        if (k === 'class')
            el.className = String(v);
        else if (k.startsWith('on') && typeof v === 'function')
            el[k] = v;
        else
            el.setAttribute(k, String(v));
    }
    for (const c of children)
        el.append(c instanceof Node ? c : document.createTextNode(c));
    return el;
}
// Acepta ISO y timestamps SQL "YYYY-MM-DD HH:MM:SS" (asumidos UTC) -> hora local
const fmtTime = (raw) => {
    if (!raw)
        return '';
    const iso = raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
// ===== Config =====
const VISIBLE_MSGS = 8; // cantidad de mensajes visibles
const MAX_VIEWPORT_RATIO = 0.7; // altura máxima del panel en % de la ventana
export function mountChat(host, ctx) {
    let ws = null;
    let wsBackoff = 1000;
    let me = { id: 0 };
    let currentPeer = null;
    let blockedIds = new Set();
    const renderedIds = new Set(); // ids ya pintados (de-dupe)
    const pendingByCid = new Map(); // burbujas optimistas por cid
    const historyCursorByPeer = new Map(); // peerId -> created_at más antiguo cargado
    let autoStickBottom = true; // sólo pegar al fondo si el usuario está abajo
    let isFetchingOlder = false; // evita cargas simultáneas
    const subs = new AbortController();
    const on = (type, handler) => window.addEventListener(type, handler, { signal: subs.signal });
    // ===== API (expuesta por tu app en window.api) =====
    async function api(url, init) { return ctx.api(url, init); }
    function computeMsgOuterHeight(el) {
        const rect = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        const mt = parseFloat(cs.marginTop) || 0;
        const mb = parseFloat(cs.marginBottom) || 0;
        return rect.height + mt + mb;
    }
    function resizeMessagesViewport() {
        const box = $('#chat-messages', host);
        const peers = $('#chat-peers', host);
        if (!box)
            return;
        const items = Array.from(box.querySelectorAll('[data-msg-id], [data-cid]'));
        const last = items.slice(Math.max(0, items.length - VISIBLE_MSGS));
        let h = 0;
        for (const el of last)
            h += computeMsgOuterHeight(el);
        const cs = window.getComputedStyle(box);
        const pt = parseFloat(cs.paddingTop) || 0;
        const pb = parseFloat(cs.paddingBottom) || 0;
        h += pt + pb;
        const maxH = Math.floor(window.innerHeight * MAX_VIEWPORT_RATIO);
        const finalH = Math.min(Math.max(h, 120), maxH);
        box.style.height = `${finalH}px`;
        box.style.overflowY = 'auto';
        if (peers) {
            peers.style.height = `${finalH}px`;
            peers.style.overflowY = 'auto';
        }
    }
    function maybeStickToBottom(box) {
        if (!box)
            return;
        if (autoStickBottom)
            box.scrollTop = box.scrollHeight;
    }
    function onMessagesScroll(e) {
        const box = e.currentTarget;
        const nearTop = box.scrollTop <= 8;
        const nearBottom = (box.scrollHeight - box.scrollTop - box.clientHeight) < 40;
        autoStickBottom = nearBottom;
        if (nearTop) {
            loadOlderHistory();
        }
        ;
    }
    function connectWS() {
        if (ws?.readyState === WebSocket.OPEN)
            return;
        ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/chat`);
        ws.onopen = () => { wsBackoff = 1000; };
        ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.type === 'hello') {
                    const prev = me.id;
                    me.id = data.userId;
                    if (!prev && currentPeer)
                        loadHistory(currentPeer.id);
                }
                if (data.type === 'message')
                    addMessageToUI(data.message, data.cid);
                if (data.type === 'invite')
                    addMessageToUI(data.message);
            }
            catch { }
        };
        ws.onclose = () => { setTimeout(connectWS, wsBackoff); wsBackoff = Math.min(wsBackoff * 2, 15000); };
        ws.onerror = () => { try {
            ws?.close();
        }
        catch { } };
    }
    function addMessageToUI(m, cid) {
        if (!currentPeer)
            return;
        const isThisChat = (m.sender_id === currentPeer.id && m.receiver_id === me.id) ||
            (m.sender_id === me.id && m.receiver_id === currentPeer.id);
        if (!isThisChat)
            return;
        const box = $('#chat-messages', host);
        if (cid && pendingByCid.has(cid)) {
            const el = pendingByCid.get(cid);
            const timeEl = el?.querySelector('[data-time]');
            if (timeEl)
                timeEl.textContent = fmtTime(m.created_at);
            el.dataset.msgId = String(m.id);
            pendingByCid.delete(cid);
            renderedIds.add(m.id);
            resizeMessagesViewport();
            maybeStickToBottom(box);
            return;
        }
        if (m.id && renderedIds.has(m.id))
            return;
        const mine = m.sender_id === me.id;
        const wrapper = h('div', {
            class: `max-w-[80%] ${mine ? 'self-end' : 'self-start'} my-1`,
            ...(m.id ? { 'data-msg-id': String(m.id) } : {})
        });
        const bubble = h('div', { class: `rounded-2xl px-3 py-2 ${mine ? 'bg-indigo-600/80' : 'bg-white/10'}` }, m.kind === 'invite' ? '🎮 Invitación a jugar a Pong' : (m.body ?? ''));
        const time = h('div', {
            class: `text-[11px] opacity-60 mt-0.5 ${mine ? 'text-right' : 'text-left'}`,
            'data-time': '1'
        }, fmtTime(m.created_at));
        wrapper.append(bubble, time);
        box.append(wrapper);
        if (m.id)
            renderedIds.add(m.id);
        resizeMessagesViewport();
        maybeStickToBottom(box);
    }
    const addInviteToUI = addMessageToUI;
    async function loadPeers() {
        const { peers } = await api('/api/chat/peers');
        const { blocked } = await api('/api/chat/blocked');
        blockedIds = new Set(blocked);
        const list = $('#chat-peers', host);
        list.innerHTML = '';
        peers.forEach(p => {
            const row = h('button', { class: 'flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-white/10' });
            const img = h('img', { src: p.avatar_path || '/uploads/default-avatar.png', class: 'w-7 h-7 rounded-full', alt: 'avatar' });
            const name = h('span', { class: 'text-sm' }, p.display_name);
            const link = h('a', { href: `/profile?user=${p.id}`, class: 'ml-auto underline text-xs opacity-80 hover:opacity-100' }, `${ctx.t("chat.profile") ?? "Ver Perfil"}`);
            row.append(img, name, link);
            row.onclick = async () => { currentPeer = p; await loadHistory(p.id); updateHeader(p); };
            list.append(row);
        });
    }
    function updateHeader(p) {
        const hname = $('#chat-peer-name', host);
        hname.textContent = p.display_name;
        const act = $('#chat-actions', host);
        act.innerHTML = '';
        const btnInvite = h('button', { class: 'px-2 py-1 rounded bg-emerald-600/70 text-sm' }, `${ctx.t("chat.invite") ?? "Invitar a pong"}`);
        btnInvite.onclick = () => sendInvite(p.id);
        const isBlocked = blockedIds.has(p.id);
        const btnBlock = h('button', { class: 'px-2 py-1 rounded bg-red-600/70 text-sm' }, isBlocked ? `${ctx.t("chat.unblock") ?? "Desbloquear"}` : `${ctx.t("chat.block") ?? "Bloquear"}`);
        btnBlock.onclick = async () => {
            if (isBlocked) {
                await api(`/api/chat/block/${p.id}`, { method: 'DELETE' });
                blockedIds.delete(p.id);
            }
            else {
                await api(`/api/chat/block/${p.id}`, { method: 'POST' });
                blockedIds.add(p.id);
            }
            updateHeader(p);
        };
        act.append(btnInvite, btnBlock);
        $('#chat-input', host)?.removeAttribute('disabled');
    }
    async function loadHistory(peerId) {
        const { messages } = await api(`/api/chat/history/${peerId}?limit=50`);
        const box = $('#chat-messages', host);
        box.innerHTML = '';
        const existingSpacer = $('#chat-bottom-spacer', host);
        if (!existingSpacer) {
            box.append(h('div', { id: 'chat-bottom-spacer', class: 'mt-auto flex-none' }));
        }
        else {
            box.append(existingSpacer);
        }
        renderedIds.clear();
        messages.forEach(m => addMessageToUI(m));
        const oldest = messages.length ? messages[0].created_at : null;
        historyCursorByPeer.set(peerId, oldest);
        resizeMessagesViewport();
        autoStickBottom = true;
        box.scrollTop = box.scrollHeight;
    }
    async function loadOlderHistory() {
        if (!currentPeer || isFetchingOlder)
            return;
        const before = historyCursorByPeer.get(currentPeer.id);
        if (!before)
            return;
        isFetchingOlder = true;
        const box = $('#chat-messages', host);
        const prevScrollTop = box.scrollTop;
        const prevScrollHeight = box.scrollHeight;
        try {
            const url = `/api/chat/history/${currentPeer.id}?limit=50&before=${encodeURIComponent(before)}`;
            const { messages } = await api(url);
            if (!messages.length) {
                historyCursorByPeer.set(currentPeer.id, null);
                isFetchingOlder = false;
                return;
            }
            const frag = document.createDocumentFragment();
            for (const m of messages) {
                if (m.id && renderedIds.has(m.id))
                    continue;
                const mine = m.sender_id === me.id;
                const wrap = h('div', {
                    class: `max-w-[80%] ${mine ? 'self-end' : 'self-start'} my-1`,
                    'data-msg-id': String(m.id)
                });
                const bubble = h('div', { class: `rounded-2xl px-3 py-2 ${mine ? 'bg-indigo-600/80' : 'bg-white/10'}` }, m.kind === 'invite' ? '🎮 Invitación a jugar a Pong' : (m.body ?? ''));
                const time = h('div', {
                    class: `text-[11px] opacity-60 mt-0.5 ${mine ? 'text-right' : 'text-left'}`
                }, fmtTime(m.created_at));
                wrap.append(bubble, time);
                frag.append(wrap);
                if (m.id)
                    renderedIds.add(m.id);
            }
            const anchor = $('#chat-bottom-spacer', host);
            const firstMsg = anchor.nextSibling;
            box.insertBefore(frag, firstMsg || null);
            const newScrollHeight = box.scrollHeight;
            box.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
            historyCursorByPeer.set(currentPeer.id, messages[0].created_at);
            resizeMessagesViewport();
        }
        finally {
            isFetchingOlder = false;
        }
    }
    const randCid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
    async function sendText() {
        const input = $('#chat-input', host);
        if (!input || !currentPeer)
            return;
        const text = input.value.trim();
        if (!text)
            return;
        const cid = randCid();
        const box = $('#chat-messages', host);
        const wrapper = h('div', { class: 'max-w-[80%] self-end my-1', 'data-cid': cid });
        const bubble = h('div', { class: 'rounded-2xl px-3 py-2 bg-indigo-600/80' }, text);
        const time = h('div', { class: 'text-[11px] opacity-60 mt-0.5 text-right', 'data-time': '1' }, fmtTime(new Date().toISOString()));
        wrapper.append(bubble, time);
        box.append(wrapper);
        pendingByCid.set(cid, wrapper);
        input.value = '';
        resizeMessagesViewport();
        maybeStickToBottom(box);
        const payload = JSON.stringify({ type: 'send', kind: 'text', to: currentPeer.id, body: text, cid });
        try {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(payload);
            }
            else {
                const { message, cid: backCid } = await api('/api/chat/send', {
                    method: 'POST',
                    body: JSON.stringify({ to: currentPeer.id, body: text, cid }),
                    headers: { 'Content-Type': 'application/json' }
                });
                addMessageToUI(message, backCid || cid);
            }
        }
        catch { }
    }
    function sendInvite(to) {
        const payload = JSON.stringify({ type: 'send', kind: 'invite', to });
        ws?.send(payload);
    }
    function mountUI() {
        host.innerHTML = '';
        const wrapper = h('section', {
            id: 'chat-panel',
            class: 'grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4'
        });
        const peersCard = h('aside', {
            class: 'bg-zinc-900/90 text-white rounded-2xl border border-white/10 shadow-2xl overflow-hidden'
        }, h('div', { class: 'px-4 py-3 border-b border-white/10 font-semibold' }, `${ctx.t("chat.friends") ?? "Amigos"}`), h('div', { id: 'chat-peers', class: 'p-2 overflow-y-auto space-y-1' }, `${ctx.t("loading") ?? "Cargando..."}`));
        const chatCard = h('div', {
            class: 'bg-zinc-900/90 text-white rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col'
        }, h('div', { class: 'px-4 py-3 flex items-center gap-3 border-b border-white/10' }, h('strong', {}, 'Chat'), h('span', { id: 'chat-peer-name', class: 'opacity-80 text-sm' }, '—'), h('div', { id: 'chat-actions', class: 'ml-auto flex gap-2' })), h('div', {
            id: 'chat-messages',
            class: 'overflow-y-auto overscroll-contain px-3 py-2 flex flex-col'
        }, h('div', { id: 'chat-bottom-spacer', class: 'mt-auto flex-none' })), h('div', { class: 'p-3 flex gap-2 border-t border-white/10' }, h('input', {
            id: 'chat-input',
            class: 'flex-1 bg-zinc-800 text-white placeholder-white/60 rounded p-2',
            placeholder: `${ctx.t("chat.write") ?? "Escribe un mensaje..."}`,
            disabled: 'true',
            onkeydown: (e) => { if (e.key === 'Enter') {
                e.preventDefault();
                sendText();
            } }
        }), h('button', { class: 'px-3 rounded bg-indigo-600/70', onclick: sendText }, `${ctx.t("chat.send") ?? "Enviar"}`)));
        wrapper.append(peersCard, chatCard);
        host.appendChild(wrapper);
        const box = $('#chat-messages', host);
        box.addEventListener('scroll', onMessagesScroll, { signal: subs.signal });
        box.style.webkitOverflowScrolling = 'touch';
        on('resize', () => resizeMessagesViewport());
        resizeMessagesViewport();
        box.scrollTop = box.scrollHeight;
        autoStickBottom = true;
    }
    async function bootStrap() {
        try {
            const { user } = await api('/api/auth/me');
            me.id = user?.id ?? 0;
        }
        catch {
            ctx.navigate('/login', { replace: true });
            return;
        }
        mountUI();
        connectWS();
        await loadPeers();
    }
    (function watchDetach() {
        if (!host.isConnected) {
            subs.abort();
            try {
                ws.close();
            }
            catch { }
            return;
        }
        requestAnimationFrame(watchDetach);
    })();
    bootStrap();
}
