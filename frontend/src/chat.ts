// frontend/src/chat.ts
type Peer = { id:number; display_name:string; avatar_path?:string|null };
type Msg  = { id:number; sender_id:number; receiver_id:number; body?:string; kind:'text'|'invite'|'system'; meta?:string|null; created_at:string };

const $ = (s:string, p:Document|HTMLElement=document) => p.querySelector(s) as HTMLElement | null;

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function h<K extends keyof HTMLElementTagNameMap>(tag:K, attrs:any={}, ...children:(Node|string)[]){
  const el = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs||{})){
    if (k === 'class') el.className = String(v);
    else if (k.startsWith('on') && typeof v === 'function') (el as any)[k] = v;
    else el.setAttribute(k, String(v));
  }
  for (const c of children) el.append(c instanceof Node ? c : document.createTextNode(c));
  return el;
}

let ws: WebSocket | null = null;
let me = { id: 0 };
let currentPeer: Peer | null = null;
let blockedIds = new Set<number>();

async function api<T=any>(url:string, init?:RequestInit){ return window.api(url, init) as Promise<T>; }

function connectWS(){
  if (ws?.readyState === WebSocket.OPEN) return;
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/chat`);
  ws.onopen = () => {};
  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'hello')
        {
            const prev = me.id;
            me.id = data.userId;
            // si antes era 0 y ya hay chat abierto, recarga histórico
            if (!prev && currentPeer) { loadHistory(currentPeer.id);}
        }
      if (data.type === 'message') addMessageToUI(data.message);
      if (data.type === 'invite')  addInviteToUI(data.message);
      if (data.type === 'tournament.next') showTournamentToast(data.notification);
    } catch {}
  };
}

function addMessageToUI(m: Msg) {
  if (!currentPeer) return;

  const isThisChat =
    (m.sender_id === currentPeer.id && m.receiver_id === me.id) ||
    (m.sender_id === me.id && m.receiver_id === currentPeer.id);
  if (!isThisChat) return;

  const box = $('#chat-messages')!;
  const mine = m.sender_id === me.id;

  const wrapper = h('div', { class: `max-w-[80%] ${mine ? 'self-end' : 'self-start'} my-1` });
  const bubble  = h(
    'div',
    { class: `rounded-2xl px-3 py-2 ${mine ? 'bg-indigo-600/80' : 'bg-white/10'}` },
    m.kind === 'invite' ? '🎮 Invitación a jugar a Pong' : (m.body ?? '')
  );
  const time    = h('div', { class: `text-[11px] opacity-60 mt-0.5 ${mine ? 'text-right' : 'text-left'}` }, fmtTime(m.created_at));

  wrapper.append(bubble, time);
  box.append(wrapper);
  box.scrollTop = box.scrollHeight;
}

function addInviteToUI(m: Msg){ addMessageToUI(m); }

function showTournamentToast(n:any){
  const t = $('#chat-toast')!;
  t.textContent = `Próximo partido: ${n?.payload ?? ''}`;
  t.classList.remove('hidden');
  setTimeout(()=>t.classList.add('hidden'), 4500);
}

async function loadPeers(){
  const { peers } = await api<{peers:Peer[]}>('/api/chat/peers');
  const { blocked } = await api<{blocked:number[]}>('/api/chat/blocked');
  blockedIds = new Set(blocked);

  const list = $('#chat-peers')!;
  list.innerHTML = '';
  peers.forEach(p => {
    const row = h('button',
      { class:'flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-white/10' });
    const img = h('img', { src: p.avatar_path || '/uploads/default-avatar.png', class:'w-7 h-7 rounded-full'});
    const name = h('span', { class:'text-sm' }, p.display_name);
    const link = h('a', { href:`/profile.html?id=${p.id}`, class:'ml-auto underline text-xs opacity-80 hover:opacity-100', target:'_self' }, 'ver perfil');
    row.append(img, name, link);
    row.onclick = async () => { currentPeer = p; await loadHistory(p.id); updateHeader(p); };
    list.append(row);
  });
}

async function loadHistory(peerId:number){
  const { messages } = await api<{messages:Msg[]}>(`/api/chat/history/${peerId}?limit=50`);
  const box = $('#chat-messages')!;
  box.innerHTML = '';
  messages.forEach(addMessageToUI);
}

function updateHeader(p:Peer){
  const hname = $('#chat-peer-name')!; hname.textContent = p.display_name;
  const act = $('#chat-actions')!;
  act.innerHTML = '';
  const btnInvite = h('button', { class:'px-2 py-1 rounded bg-emerald-600/70 text-sm' }, 'Invitar a Pong');
  btnInvite.onclick = () => sendInvite(p.id);
  const btnBlock = h('button', { class:'px-2 py-1 rounded bg-red-600/70 text-sm' }, blockedIds.has(p.id) ? 'Desbloquear' : 'Bloquear');
  btnBlock.onclick = async () => {
    if (blockedIds.has(p.id)) { await api(`/api/chat/block/${p.id}`, { method:'DELETE' }); blockedIds.delete(p.id); }
    else { await api(`/api/chat/block/${p.id}`, { method:'POST' }); blockedIds.add(p.id); }
    updateHeader(p);
  };
  act.append(btnInvite, btnBlock);
  $('#chat-input')?.removeAttribute('disabled');
}

function sendText(){
  const input = $('#chat-input') as HTMLInputElement | null;
  if (!input || !currentPeer) return;
  const text = input.value.trim();
  if (!text) return;
  const payload = JSON.stringify({ type:'send', kind:'text', to: currentPeer.id, body: text });
  ws?.send(payload);
  input.value = '';
}

function sendInvite(to:number){
  const payload = JSON.stringify({ type:'send', kind:'invite', to });
  ws?.send(payload);
}

function mountUI(){
  const host = document.body;

  const panel = h('section', { id:'chat-panel',
    class:'fixed bottom-0 left-0 right-0 bg-zinc-900/90 border-t border-white/10 text-white' });

  panel.append(
    // barra cabecera
    h('div', { class:'max-w-6xl mx-auto px-3 py-2 flex items-center gap-3' },
      h('strong', {}, 'Chat'),
      h('span', { id:'chat-peer-name', class:'opacity-80 text-sm' }, '—'),
      h('div', { id:'chat-actions', class:'ml-auto flex gap-2' })
    ),
    // cuerpo: lista de peers + conversación
    h('div', { class:'max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[260px_1fr] gap-3 px-3 pb-3' },
      h('aside', { class:'bg-white/5 rounded-xl p-2 max-h-64 overflow-auto' },
        h('div', { id:'chat-peers', class:'space-y-1' }, 'Cargando...')
      ),
      h('div', { class:'bg-white/5 rounded-xl p-2 flex flex-col' },
        h('div', { id:'chat-messages', class:'flex-1 overflow-auto flex flex-col' }),
        h('div', { class:'mt-2 flex gap-2' },
          h('input', { id:'chat-input', class:'flex-1 bg-zinc-800 rounded p-2', placeholder:'Escribe un mensaje…', disabled:'true',
            onkeydown:(e:KeyboardEvent)=>{ if(e.key==='Enter'){ e.preventDefault(); sendText(); }} }),
          h('button', { class:'px-3 rounded bg-indigo-600/70', onclick: sendText }, 'Enviar')
        )
      )
    ),
    // toast torneo
    h('div', { id:'chat-toast', class:'hidden fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/80 px-3 py-2 rounded' })
  );

  host.append(panel);
}

async function main(){
  try {
    const { user } = await api('/api/auth/me');   // ← trae tu usuario
    me.id = user?.id ?? 0;                        // ← fija tu id
  } catch {
    location.href = '/login.html';
    return;
  }
  mountUI();
  connectWS();
  await loadPeers();
}

document.addEventListener('DOMContentLoaded', main);
export {};
