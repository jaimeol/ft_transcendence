// frontend/src/chat.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
// ===== Estado =====
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
// ===== API (expuesta por tu app en window.api) =====
function api(url, init) {
    return __awaiter(this, void 0, void 0, function* () { return window.api(url, init); });
}
// ===== Utils Layout =====
function computeMsgOuterHeight(el) {
    const rect = el.getBoundingClientRect();
    const cs = window.getComputedStyle(el);
    const mt = parseFloat(cs.marginTop) || 0;
    const mb = parseFloat(cs.marginBottom) || 0;
    return rect.height + mt + mb;
}
// Calcula la altura exacta para que quepan *los últimos VISIBLE_MSGS* y la aplica a mensajes+lista
function resizeMessagesViewport() {
    const box = document.getElementById('chat-messages');
    const peers = document.getElementById('chat-peers');
    if (!box)
        return;
    const items = Array.from(box.querySelectorAll('[data-msg-id],[data-cid]'));
    const last = items.slice(Math.max(0, items.length - VISIBLE_MSGS));
    // Suma alturas reales (incluyendo márgenes) de los últimos N
    let h = 0;
    for (const el of last)
        h += computeMsgOuterHeight(el);
    // + padding vertical del contenedor
    const cs = window.getComputedStyle(box);
    const pt = parseFloat(cs.paddingTop) || 0;
    const pb = parseFloat(cs.paddingBottom) || 0;
    h += pt + pb;
    // Seguridad: no superar % de ventana (evita solapar header/menú si las burbujas son altas)
    const maxH = Math.floor(window.innerHeight * MAX_VIEWPORT_RATIO);
    const finalH = Math.min(Math.max(h, 120), maxH); // mínimo 120px para estados vacíos
    box.style.height = `${finalH}px`;
    box.style.overflowY = 'auto';
    // Igualamos la altura de la lista de amigos para alinear visualmente ambas tarjetas
    if (peers) {
        peers.style.height = `${finalH}px`;
        peers.style.overflowY = 'auto';
    }
}
// Mantiene la vista clavada al fondo SOLO si el usuario está abajo
function maybeStickToBottom(box) {
    if (!box)
        return;
    if (autoStickBottom)
        box.scrollTop = box.scrollHeight;
}
// Escucha de scroll del panel de mensajes
function onMessagesScroll(e) {
    const box = e.currentTarget;
    const nearTop = box.scrollTop <= 8; // umbral 8px para “arriba del todo”
    const nearBottom = (box.scrollHeight - box.scrollTop - box.clientHeight) < 40;
    autoStickBottom = nearBottom; // si el usuario está abajo, seguiremos auto-pegando
    if (nearTop) {
        loadOlderHistory();
    } // al llegar arriba, pedir más historial
}
// ===== WebSocket =====
function connectWS() {
    if ((ws === null || ws === void 0 ? void 0 : ws.readyState) === WebSocket.OPEN)
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
        catch (_a) { }
    };
    ws.onclose = () => { setTimeout(connectWS, wsBackoff); wsBackoff = Math.min(wsBackoff * 2, 15000); };
    ws.onerror = () => { try {
        ws === null || ws === void 0 ? void 0 : ws.close();
    }
    catch (_a) { } };
}
// ===== Renderizado de mensajes =====
function addMessageToUI(m, cid) {
    var _a;
    if (!currentPeer)
        return;
    const isThisChat = (m.sender_id === currentPeer.id && m.receiver_id === me.id) ||
        (m.sender_id === me.id && m.receiver_id === currentPeer.id);
    if (!isThisChat)
        return;
    const box = $('#chat-messages');
    // Reconciliar burbuja optimista si llega el mismo mensaje con id real
    if (cid && pendingByCid.has(cid)) {
        const el = pendingByCid.get(cid);
        const timeEl = el.querySelector('[data-time]');
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
        return; // evita duplicados
    const mine = m.sender_id === me.id;
    const wrapper = h('div', Object.assign({ class: `max-w-[80%] ${mine ? 'self-end' : 'self-start'} my-1` }, (m.id ? { 'data-msg-id': String(m.id) } : {})));
    const bubble = h('div', { class: `rounded-2xl px-3 py-2 ${mine ? 'bg-indigo-600/80' : 'bg-white/10'}` }, m.kind === 'invite' ? '🎮 Invitación a jugar a Pong' : ((_a = m.body) !== null && _a !== void 0 ? _a : ''));
    const time = h('div', {
        class: `text-[11px] opacity-60 mt-0.5 ${mine ? 'text-right' : 'text-left'}`,
        'data-time': '1'
    }, fmtTime(m.created_at));
    wrapper.append(bubble, time);
    // Añadimos mensajes nuevos al FINAL (debajo). El spacer está al principio del contenedor.
    box.append(wrapper);
    if (m.id)
        renderedIds.add(m.id);
    // Reajusta viewport a 8 mensajes y sólo scroll al fondo si el usuario está abajo
    resizeMessagesViewport();
    maybeStickToBottom(box);
}
const addInviteToUI = addMessageToUI;
// ===== Peers & Header =====
function loadPeers() {
    return __awaiter(this, void 0, void 0, function* () {
        const { peers } = yield api('/api/chat/peers');
        const { blocked } = yield api('/api/chat/blocked');
        blockedIds = new Set(blocked);
        const list = $('#chat-peers');
        list.innerHTML = '';
        peers.forEach(p => {
            const row = h('button', { class: 'flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-white/10' });
            const img = h('img', { src: p.avatar_path || '/uploads/default-avatar.png', class: 'w-7 h-7 rounded-full' });
            const name = h('span', { class: 'text-sm' }, p.display_name);
            const link = h('a', { href: `/profile.html?id=${p.id}`, class: 'ml-auto underline text-xs opacity-80 hover:opacity-100', target: '_self' }, 'ver perfil');
            row.append(img, name, link);
            row.onclick = () => __awaiter(this, void 0, void 0, function* () { currentPeer = p; yield loadHistory(p.id); updateHeader(p); });
            list.append(row);
        });
    });
}
function updateHeader(p) {
    var _a;
    const hname = $('#chat-peer-name');
    hname.textContent = p.display_name;
    const act = $('#chat-actions');
    act.innerHTML = '';
    const btnInvite = h('button', { class: 'px-2 py-1 rounded bg-emerald-600/70 text-sm' }, 'Invitar a Pong');
    btnInvite.onclick = () => sendInvite(p.id);
    const btnBlock = h('button', { class: 'px-2 py-1 rounded bg-red-600/70 text-sm' }, blockedIds.has(p.id) ? 'Desbloquear' : 'Bloquear');
    btnBlock.onclick = () => __awaiter(this, void 0, void 0, function* () {
        if (blockedIds.has(p.id)) {
            yield api(`/api/chat/block/${p.id}`, { method: 'DELETE' });
            blockedIds.delete(p.id);
        }
        else {
            yield api(`/api/chat/block/${p.id}`, { method: 'POST' });
            blockedIds.add(p.id);
        }
        updateHeader(p);
    });
    act.append(btnInvite, btnBlock);
    (_a = $('#chat-input')) === null || _a === void 0 ? void 0 : _a.removeAttribute('disabled');
}
// ===== Historial (carga inicial y carga hacia arriba) =====
function loadHistory(peerId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { messages } = yield api(`/api/chat/history/${peerId}?limit=50`);
        const box = $('#chat-messages');
        box.innerHTML = '';
        // Spacer al principio para permitir scroll correcto (pega contenido abajo cuando hay poco)
        const existingSpacer = document.getElementById('chat-bottom-spacer');
        if (!existingSpacer) {
            box.append(h('div', { id: 'chat-bottom-spacer', class: 'mt-auto flex-none' }));
        }
        else {
            box.append(existingSpacer); // asegúrate de que queda como primer hijo
        }
        renderedIds.clear();
        messages.forEach(m => addMessageToUI(m));
        // Guarda cursor (created_at del más antiguo del lote)
        const oldest = messages.length ? messages[0].created_at : null;
        historyCursorByPeer.set(peerId, oldest);
        resizeMessagesViewport();
        autoStickBottom = true; // al abrir, pegamos abajo
        box.scrollTop = box.scrollHeight;
    });
}
function loadOlderHistory() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!currentPeer || isFetchingOlder)
            return;
        const before = historyCursorByPeer.get(currentPeer.id);
        if (!before)
            return; // ya no hay más en servidor
        isFetchingOlder = true;
        const box = $('#chat-messages');
        const prevScrollTop = box.scrollTop;
        const prevScrollHeight = box.scrollHeight;
        try {
            const url = `/api/chat/history/${currentPeer.id}?limit=50&before=${encodeURIComponent(before)}`;
            const { messages } = yield api(url);
            if (!messages.length) {
                historyCursorByPeer.set(currentPeer.id, null);
                isFetchingOlder = false;
                return;
            }
            // Preparamos fragmento en orden ascendente (del más viejo al más nuevo del lote)
            const frag = document.createDocumentFragment();
            for (const m of messages) {
                if (m.id && renderedIds.has(m.id))
                    continue;
                const mine = m.sender_id === me.id;
                const wrap = h('div', {
                    class: `max-w-[80%] ${mine ? 'self-end' : 'self-start'} my-1`,
                    'data-msg-id': String(m.id)
                });
                const bubble = h('div', { class: `rounded-2xl px-3 py-2 ${mine ? 'bg-indigo-600/80' : 'bg-white/10'}` }, m.kind === 'invite' ? '🎮 Invitación a jugar a Pong' : ((_a = m.body) !== null && _a !== void 0 ? _a : ''));
                const time = h('div', {
                    class: `text-[11px] opacity-60 mt-0.5 ${mine ? 'text-right' : 'text-left'}`,
                    'data-time': '1'
                }, fmtTime(m.created_at));
                wrap.append(bubble, time);
                frag.append(wrap);
                if (m.id)
                    renderedIds.add(m.id);
            }
            // Insertar *antes* del primer mensaje existente (después del spacer)
            const anchor = $('#chat-bottom-spacer');
            const firstMsg = anchor.nextSibling; // puede ser null si no hay mensajes
            box.insertBefore(frag, firstMsg || null);
            // Mantener posición visual del usuario (compensa altura añadida arriba)
            const newScrollHeight = box.scrollHeight;
            box.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
            // Actualiza cursor al nuevo más antiguo
            historyCursorByPeer.set(currentPeer.id, messages[0].created_at);
            // Recalcula altura visible (8 mensajes)
            resizeMessagesViewport();
        }
        finally {
            isFetchingOlder = false;
        }
    });
}
// ===== Envío de mensajes =====
const randCid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
function sendText() {
    return __awaiter(this, void 0, void 0, function* () {
        const input = $('#chat-input');
        if (!input || !currentPeer)
            return;
        const text = input.value.trim();
        if (!text)
            return;
        const cid = randCid();
        // burbuja optimista (al final)
        const box = $('#chat-messages');
        const wrapper = h('div', { class: 'max-w-[80%] self-end my-1', 'data-cid': cid });
        const bubble = h('div', { class: 'rounded-2xl px-3 py-2 bg-indigo-600/80' }, text);
        const time = h('div', { class: 'text-[11px] opacity-60 mt-0.5 text-right', 'data-time': '1' }, fmtTime(new Date().toISOString()));
        wrapper.append(bubble, time);
        box.append(wrapper);
        pendingByCid.set(cid, wrapper);
        input.value = '';
        resizeMessagesViewport();
        maybeStickToBottom(box);
        // Intento WS; si no, fallback HTTP
        const payload = JSON.stringify({ type: 'send', kind: 'text', to: currentPeer.id, body: text, cid });
        try {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(payload);
            }
            else {
                const { message, cid: backCid } = yield api('/api/chat/send', {
                    method: 'POST',
                    body: JSON.stringify({ to: currentPeer.id, body: text, cid }),
                    headers: { 'Content-Type': 'application/json' }
                });
                addMessageToUI(message, backCid || cid);
            }
        }
        catch (_a) {
            // opcional: marcar error en la burbuja optimista
        }
    });
}
function sendInvite(to) {
    const payload = JSON.stringify({ type: 'send', kind: 'invite', to });
    ws === null || ws === void 0 ? void 0 : ws.send(payload);
}
// ===== UI =====
function mountUI() {
    // Elimina panel anterior si existiera
    const prev = document.getElementById('chat-panel');
    if (prev)
        prev.remove();
    // Punto de anclaje: el <main> de home.html (si no existe, body)
    const main = document.querySelector('main') || document.body;
    // Contenedor: se integra en el flujo del layout (no fixed)
    const wrapper = h('section', {
        id: 'chat-panel',
        class: 'grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4'
    });
    // Tarjeta IZQUIERDA: lista de amigos
    const peersCard = h('aside', {
        class: 'bg-zinc-900/90 text-white rounded-2xl border border-white/10 shadow-2xl overflow-hidden'
    }, h('div', { class: 'px-4 py-3 border-b border-white/10 font-semibold' }, 'Amigos'), h('div', { id: 'chat-peers', class: 'p-2 overflow-y-auto space-y-1' }, 'Cargando…'));
    // Tarjeta DERECHA: conversación
    const chatCard = h('div', {
        class: 'bg-zinc-900/90 text-white rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col'
    }, 
    // Cabecera
    h('div', { class: 'px-4 py-3 flex items-center gap-3 border-b border-white/10' }, h('strong', {}, 'Chat'), h('span', { id: 'chat-peer-name', class: 'opacity-80 text-sm' }, '—'), h('div', { id: 'chat-actions', class: 'ml-auto flex gap-2' })), 
    // Mensajes: altura controlada por JS (EXACTAMENTE 8 visibles), scroll arriba
    // Usamos spacer (#chat-bottom-spacer) al principio para permitir scroll correcto.
    h('div', {
        id: 'chat-messages',
        class: 'overflow-y-auto overscroll-contain px-3 py-2 flex flex-col'
    }, h('div', { id: 'chat-bottom-spacer', class: 'mt-auto flex-none' })), 
    // Input
    h('div', { class: 'p-3 flex gap-2 border-t border-white/10' }, h('input', {
        id: 'chat-input',
        class: 'flex-1 bg-zinc-800 text-white placeholder-white/60 rounded p-2',
        placeholder: 'Escribe un mensaje…',
        disabled: 'true',
        onkeydown: (e) => { if (e.key === 'Enter') {
            e.preventDefault();
            sendText();
        } }
    }), h('button', { class: 'px-3 rounded bg-indigo-600/70', onclick: sendText }, 'Enviar')));
    wrapper.append(peersCard, chatCard);
    main.appendChild(wrapper);
    // Listeners
    const box = document.getElementById('chat-messages');
    box.addEventListener('scroll', onMessagesScroll);
    box.style.setProperty('-webkit-overflow-scrolling', 'touch'); // inercia iOS
    window.addEventListener('resize', resizeMessagesViewport);
    // Altura inicial (8 mensajes) y pegado abajo al montar
    resizeMessagesViewport();
    box.scrollTop = box.scrollHeight;
    autoStickBottom = true;
}
// ===== Main =====
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const { user } = yield api('/api/auth/me');
            me.id = (_a = user === null || user === void 0 ? void 0 : user.id) !== null && _a !== void 0 ? _a : 0;
        }
        catch (_b) {
            location.href = '/login.html';
            return;
        }
        mountUI();
        connectWS();
        yield loadPeers();
    });
}
document.addEventListener('DOMContentLoaded', main);
export {};
