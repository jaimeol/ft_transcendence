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
    function renderMessageBubble(m) {
        const isMine = m.sender_id === me.id;
        const baseClass = 'rounded-2xl px-3 py-2';
        let meta = {};
        try {
            meta = m.meta ? JSON.parse(m.meta) : {};
        }
        catch { }
        // Definir el cuerpo de la invitación
        const inviteBody = ctx.t("chat.invite_body") ?? "🎮 ¡Te reto a jugar a Pong!";
        // 1. Mensajes de Sistema
        if (m.kind === 'system') {
            const translatedBody = ctx.t(m.body ?? 'notify.unknown', meta);
            const bubble = h('div', { class: `${baseClass} bg-yellow-600/80 text-black font-semibold` }, translatedBody);
            // Añadir atributo para identificar mensajes del sistema
            bubble.dataset.systemMessage = 'true';
            bubble.dataset.messageId = String(m.id);
            return bubble;
        }
        // 2. Mensajes de Invitación
        if (m.kind === 'invite') {
            const status = meta.status || 'pending'; // 'pending' o 'accepted'
            if (isMine) {
                // --- Soy el ANFITRIÓN (A) ---
                const bubble = h('div', { class: `${baseClass} bg-emerald-600/80 flex items-center justify-between gap-3` });
                const text = h('span', {}, inviteBody);
                const isPlayed = meta.played === true;
                const button = h('button', {
                    class: `px-3 py-1 rounded text-black font-semibold text-sm whitespace-nowrap ${status === 'pending'
                        ? 'bg-gray-400 cursor-not-allowed' // Deshabilitado
                        : 'bg-green-500 hover:bg-green-400' // Habilitado
                    }`,
                    ...((status === 'pending' || isPlayed) && { disabled: 'true' }) // Propiedad disabled
                }, isPlayed ? (ctx.t("chat.match_played") ?? "Partida iniciada") : (ctx.t("chat.start_game") ?? "Empezar"));
                if (status === 'accepted' && !isPlayed) {
                    // Solo añadimos el 'onclick' si está aceptada
                    button.onclick = async () => {
                        try {
                            button.disabled = true;
                            button.textContent = ctx.t("chat.starting") ?? "Iniciando...";
                            const url = `/pong?mode=pvp&pvp_players=1`;
                            ctx.navigate(url, {
                                state: {
                                    opponentId: m.receiver_id,
                                    isInvite: true
                                }
                            });
                            try {
                                await api(`/api/chat/mark-played/${m.id}`, { method: 'POST' });
                                const updatedMeta = { ...meta, played: true };
                                const updatedMessage = { ...m, meta: JSON.stringify(updatedMeta) };
                                updateMessageInUI(updatedMessage); // Update bubble visually
                            }
                            catch (markErr) {
                                console.error("Failed to mark invite as played:", markErr);
                            }
                        }
                        catch (err) {
                            button.disabled = false;
                            button.textContent = ctx.t("chat.start_game") ?? "Empezar";
                            console.error("Failed to start match:", err);
                        }
                    };
                }
                bubble.append(text, button);
                return bubble;
            }
            else {
                // --- Soy el INVITADO (B) ---
                if (status === 'pending') {
                    // Botón para Aceptar
                    return h('button', {
                        class: `${baseClass} bg-emerald-700/60 hover:bg-emerald-600 transition font-semibold w-full text-center`,
                        onclick: async () => {
                            if (!m.id)
                                return;
                            let accepted = false;
                            // Enviar evento de aceptación por WebSocket
                            if (ws && ws.readyState === WebSocket.OPEN) {
                                try {
                                    ws.send(JSON.stringify({ type: 'accept_invite', messageId: m.id }));
                                    accepted = true;
                                }
                                catch (e) {
                                    console.warn("WebSocket send failed, falling back to HTTP", e);
                                }
                            }
                            if (!accepted) {
                                try {
                                    const response = await api(`/api/chat/accept-invite/${m.id}`, {
                                        method: 'POST'
                                    });
                                    if (response && response.message) {
                                        updateMessageInUI(response.message);
                                        accepted = true;
                                    }
                                    else {
                                        throw new Error("Invalid response from accept invite API");
                                    }
                                }
                                catch (err) {
                                    console.error("Failed to accept invite via HTTP:", err);
                                    alert('Error al aceptar la invitación. Intenta recargar');
                                }
                            }
                        }
                    }, inviteBody + ` (${ctx.t("chat.accept_invite") ?? "¡Aceptar!"})`);
                }
                else {
                    // Ya aceptado, solo mostrar texto
                    return h('div', { class: `${baseClass} bg-emerald-700/60 opacity-70` }, (ctx.t("chat.invite_accepted") ?? "¡Invitación aceptada! Ve al ordenador del anfitrión."));
                }
            }
        }
        // 3. Mensajes de Texto Normales
        const bubbleClass = isMine ? 'bg-indigo-600/80' : 'bg-white/10';
        return h('div', { class: `${baseClass} ${bubbleClass}` }, m.body ?? '');
    }
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
                if (data.type === 'system')
                    addMessageToUI(data.message); // Maneja notificaciones del sistema
                if (data.type === 'invite_update')
                    updateMessageInUI(data.message);
            }
            catch { }
        };
        ws.onclose = () => { setTimeout(connectWS, wsBackoff); wsBackoff = Math.min(wsBackoff * 2, 15000); };
        ws.onerror = () => { try {
            ws?.close();
        }
        catch { } };
    }
    function updateMessageInUI(m) {
        if (!m.id)
            return;
        const wrapper = $(`[data-msg-id="${m.id}"]`, host);
        if (!wrapper)
            return; // El mensaje no está cargado/visible
        const timeEl = wrapper.querySelector('[data-time]'); // Guardar el timestamp
        const newBubble = renderMessageBubble(m); // Renderizar la nueva burbuja
        wrapper.innerHTML = ''; // Limpiar la burbuja antigua
        wrapper.append(newBubble); // Añadir la nueva
        if (timeEl)
            wrapper.append(timeEl); // Re-añadir el timestamp
    }
    function addMessageToUI(m, cid) {
        if (!currentPeer)
            return;
        const isThisChat = (m.sender_id === currentPeer.id && m.receiver_id === me.id) ||
            (m.sender_id === me.id && m.receiver_id === currentPeer.id) ||
            (m.sender_id === 0 && currentPeer.id === 0 && m.receiver_id === me.id); // Mostrar notificaciones del sistema
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
        if (m.id && renderedIds.has(m.id)) {
            updateMessageInUI(m);
            return;
        }
        const isMine = m.sender_id === me.id;
        const wrapper = h('div', {
            class: `max-w-[80%] ${isMine ? 'self-end' : 'self-start'} my-1`,
            ...(m.id ? { 'data-msg-id': String(m.id) } : {})
        });
        const bubble = renderMessageBubble(m);
        const time = h('div', {
            class: `text-[11px] opacity-60 mt-0.5 ${isMine ? 'text-right' : 'text-left'}`,
            'data-time': '1'
        }, fmtTime(m.created_at));
        wrapper.append(bubble, time);
        box.append(wrapper);
        if (m.id)
            renderedIds.add(m.id);
        resizeMessagesViewport();
        maybeStickToBottom(box);
    }
    async function updateChatTexts() {
        // 1. Actualizar textos estáticos de la UI principal
        const peersHeader = $('#chat-peers', host)?.previousElementSibling;
        if (peersHeader)
            peersHeader.textContent = ctx.t("chat.friends") ?? "Amigos";
        const sendButton = host.querySelector('#chat-input + button'); // Botón "Enviar"
        if (sendButton)
            sendButton.textContent = ctx.t("chat.send") ?? "Enviar";
        await loadPeers();
        if (currentPeer) {
            updateHeader(currentPeer);
            await loadHistory(currentPeer.id);
        }
        else {
            const input = $('#chat-input', host);
            if (input) {
                input.placeholder = ctx.t("chat.write") ?? "Escribe un mensaje...";
            }
        }
    }
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
        const isBlocked = blockedIds.has(p.id);
        const btnInvite = h('button', { class: 'px-2 py-1 rounded bg-emerald-600/70 hover:bg-emerald-700 text-sm' }, `${ctx.t("chat.invite") ?? "Invitar a pong"}`);
        btnInvite.onclick = async () => {
            const originalText = btnInvite.textContent;
            btnInvite.textContent = '✓ Enviado';
            btnInvite.setAttribute('disabled', 'true');
            await sendInvite(p.id);
            setTimeout(() => {
                btnInvite.textContent = originalText;
                btnInvite.removeAttribute('disabled');
            }, 2000);
        };
        const btnBlock = h('button', { class: 'px-2 py-1 rounded bg-red-600/70 hover:bg-red-700 text-sm' }, isBlocked ? `${ctx.t("chat.unblock") ?? "Desbloquear"}` : `${ctx.t("chat.block") ?? "Bloquear"}`);
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
        // Deshabilitar input si está bloqueado
        const input = $('#chat-input', host);
        if (input) {
            if (isBlocked) {
                input.setAttribute('disabled', 'true');
                input.placeholder = ctx.t("chat.blocked") ?? "Usuario bloqueado";
            }
            else {
                input.removeAttribute('disabled');
                input.placeholder = ctx.t("chat.write") ?? "Escribe un mensaje...";
            }
        }
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
                const bubble = renderMessageBubble(m);
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
    async function sendInvite(to) {
        const body = '🎮 ¡Te reto a jugar a Pong!';
        const cid = randCid();
        const meta = { game: 'pong', status: 'pending' };
        // Crear mensaje optimista en la UI
        const optimisticMsg = {
            id: 0, // temporal
            sender_id: me.id,
            receiver_id: to,
            body,
            kind: 'invite',
            meta: JSON.stringify(meta),
            created_at: new Date().toISOString()
        };
        // Mostrar inmediatamente en la UI
        addMessageToUI(optimisticMsg, cid);
        try {
            if (ws && ws.readyState === WebSocket.OPEN) {
                const payload = JSON.stringify({ type: 'send', kind: 'invite', to, body, meta, cid });
                ws.send(payload);
            }
            else {
                // Fallback HTTP si el WebSocket no está conectado
                await api('/api/chat/invite', {
                    method: 'POST',
                    body: JSON.stringify({ to }),
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        catch { }
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
        window.addEventListener('languageChanged', () => {
            updateChatTexts();
        }, { signal: subs.signal });
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
