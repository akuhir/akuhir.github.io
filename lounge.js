(() => {
'use strict';
/* H.I.S Digital Archives — CHATS (Socket.IO client)
   Backend contract, auth token keys and identity keys are unchanged:
   emit  chat:send {text, replyToId}, chat:delete {messageId}
   on    chat:history, chat:new, chat:deleted, presence:count, chat:error */
const API = String(window.AKUHIR_API_BASE_URL || '').replace(/\/+$/, '');
const token = () => localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('authToken') || '';
const $ = id => document.getElementById(id);
let socket = null, socketToken = '', replyTo = null, started = false, unseen = 0;

const time = v => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const dayKey = v => { const d = new Date(v); return isNaN(d) ? '' : d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); };
function dayLabel(v) {
  const d = new Date(v), now = new Date(), y = new Date(); y.setDate(now.getDate() - 1);
  if (dayKey(d) === dayKey(now)) return 'Today';
  if (dayKey(d) === dayKey(y)) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'long', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}
const me = () => String(localStorage.getItem('currentUser') || '').toUpperCase();
const isMine = m => !!me() && String(m.senderMatric || '').toUpperCase() === me();

/* ---------- avatars ---------- */
function hue(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360; return h; }
function initials(name) {
  const p = String(name || 'Student').trim().split(/\s+/).filter(Boolean);
  return ((p[0] || 'S')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
function avatar(m, spacer) {
  const el = document.createElement('div');
  el.className = 'chat-avatar' + (spacer ? ' spacer' : '');
  if (spacer) return el;
  const name = m.senderName || 'Student';
  el.style.background = `hsl(${hue(String(m.senderMatric || name))},48%,42%)`;
  const photo = m.senderPhoto || m.senderAvatar || m.photoUrl || m.avatarUrl || '';
  const fallback = () => { el.replaceChildren(document.createTextNode(initials(name))); };
  if (typeof photo === 'string' && /^(https?:|\/|data:image\/)/.test(photo)) {
    const img = document.createElement('img'); img.alt = ''; img.loading = 'lazy'; img.src = photo; img.onerror = fallback; el.append(img);
  } else fallback();
  return el;
}

/* ---------- status / presence ---------- */
function status(v, ok = false) {
  const c = $('loungeConnection'); if (c) { c.textContent = ok ? '' : v; c.classList.toggle('connected', ok); }
  $('loungeDot')?.classList.toggle('on', ok);
}

/* ---------- reply bar ---------- */
function reply(m) {
  replyTo = m;
  $('loungeReplyPreview').hidden = !m;
  if (m) {
    $('loungeReplyName').textContent = m.senderName || 'Student';
    $('loungeReplyText').textContent = m.deleted ? 'Message deleted' : m.text;
    $('loungeMessageInput').focus();
  }
}

/* ---------- scrolling ---------- */
const box = () => $('loungeMessages');
const nearBottom = () => { const b = box(); return b.scrollHeight - b.scrollTop - b.clientHeight < 140; };
function toBottom() { const b = box(); b.scrollTop = b.scrollHeight; }
function updateJump() {
  const j = $('loungeJump'); if (!j) return;
  const away = !nearBottom();
  if (!away) unseen = 0;
  j.classList.toggle('show', away);
  $('loungeJumpCount').textContent = unseen ? String(unseen) : '';
}

/* ---------- message rendering ---------- */
function closeActions(except) {
  box().querySelectorAll('.lounge-message.show-actions').forEach(x => { if (x !== except) x.classList.remove('show-actions'); });
}
function jumpTo(id) {
  const t = box().querySelector(`[data-id="${CSS.escape(String(id))}"]`);
  if (!t) return;
  t.scrollIntoView({ block: 'center', behavior: 'smooth' });
  t.classList.add('flash'); setTimeout(() => t.classList.remove('flash'), 1200);
}
function getStudentLevel(matricNumber) {
  const matric = String(matricNumber || '').trim().toUpperCase();
  if (matric === 'AKU25/FEDU/HIS/2001' || matric === 'AKU25/FEDU/HIS/2002') return '200L';
  if (matric.startsWith('AKU24/')) return '200L';
  if (matric.startsWith('AKU25/')) return '100L';
  return '';
}
function render(m, cont) {
  const mine = isMine(m);
  const a = document.createElement('article');
  a.className = 'lounge-message' + (mine ? ' mine' : '') + (cont ? ' cont' : '');
  a.dataset.id = m.id; a.dataset.sender = String(m.senderMatric || m.senderName || '');
  a.dataset.day = dayKey(m.createdAt); a.dataset.cont = cont ? '1' : '';

  if (!mine) a.append(avatar(m, cont));

  const col = document.createElement('div'); col.className = 'chat-col';
  const bubble = document.createElement('div'); bubble.className = 'lounge-bubble'; bubble.tabIndex = 0;

  if (!mine && !cont) {
    const n = document.createElement('strong'); n.className = 'lounge-sender';
    const senderName = m.senderName || 'Student';
    const senderLevel = getStudentLevel(m.senderMatric);
    n.textContent = senderLevel ? `${senderName} · ${senderLevel}` : senderName;
    n.style.color = `hsl(${hue(String(m.senderMatric || m.senderName || 'Student'))},55%,34%)`;
    bubble.append(n);
  }
  if (m.replyTo) {
    const q = document.createElement('div'); q.className = 'lounge-reply-quote';
    const qn = document.createElement('strong'); qn.textContent = m.replyTo.senderName || 'Student';
    const qt = document.createElement('span'); qt.textContent = m.replyTo.deleted ? 'Message deleted' : m.replyTo.text;
    q.append(qn, qt);
    const rid = m.replyTo.id || m.replyTo._id || m.replyToId;
    if (rid) q.addEventListener('click', e => { e.stopPropagation(); jumpTo(rid); });
    bubble.append(q);
  }
  const body = document.createElement('div'); body.className = 'lounge-message-body';
  if (m.deleted) { body.classList.add('lounge-deleted'); body.textContent = 'This message was deleted.'; } else body.textContent = m.text;
  bubble.append(body);
  const meta = document.createElement('div'); meta.className = 'lounge-meta';
  const t = document.createElement('time'); t.dateTime = m.createdAt; t.textContent = time(m.createdAt); meta.append(t);
  bubble.append(meta);
  col.append(bubble);

  if (!m.deleted) {
    const actions = document.createElement('div'); actions.className = 'lounge-message-actions';
    const r = document.createElement('button'); r.textContent = 'Reply'; r.type = 'button';
    r.onclick = e => { e.stopPropagation(); a.classList.remove('show-actions'); reply(m); };
    actions.append(r);
    if (mine || localStorage.getItem('currentUserRole') === 'admin') {
      const d = document.createElement('button'); d.textContent = 'Delete for everyone'; d.type = 'button'; d.className = 'danger';
      d.onclick = e => { e.stopPropagation(); if (confirm('Delete this message for everyone?')) socket.emit('chat:delete', { messageId: m.id }); };
      actions.append(d);
    }
    col.append(actions);
    const toggle = () => { const on = !a.classList.contains('show-actions'); closeActions(a); a.classList.toggle('show-actions', on); };
    bubble.addEventListener('click', toggle);
    bubble.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  }
  a.append(col);
  return a;
}
function lastMessage() { const k = box().querySelectorAll('.lounge-message'); return k[k.length - 1] || null; }
function appendMessage(m) {
  const b = box(), last = lastMessage(), day = dayKey(m.createdAt);
  if (!last || last.dataset.day !== day) {
    const s = document.createElement('div'); s.className = 'chat-day'; s.textContent = dayLabel(m.createdAt); b.append(s);
    b.append(render(m, false));
  } else {
    b.append(render(m, last.dataset.sender === String(m.senderMatric || m.senderName || '')));
  }
}
function upsert(m) {
  const b = box(), old = b.querySelector(`[data-id="${CSS.escape(String(m.id))}"]`);
  if (old) { old.replaceWith(render(m, old.dataset.cont === '1')); return; }
  b.querySelector('.lounge-empty')?.remove();
  const stick = nearBottom() || isMine(m);
  appendMessage(m);
  if (stick) toBottom(); else unseen++;
  updateJump();
}

/* ---------- socket ---------- */
function connect() {
  const t = token();
  if (!window.io || !t) { status('Login required'); return; }
  if (socket && socketToken === t) { if (!socket.connected) socket.connect(); return; }
  if (socket) socket.disconnect();
  socketToken = t; status('Connecting…');
  socket = window.io(API, { auth: { token: t } });
  socket.on('connect', () => status('Connected', true));
  socket.on('disconnect', () => { status('Reconnecting…'); $('loungeOnlineCount').textContent = 'Offline'; });
  socket.on('connect_error', e => status((e && e.message) || 'Connection failed'));
  socket.on('chat:history', items => {
    const b = box(); b.replaceChildren(); unseen = 0;
    if (!items.length) { const e = document.createElement('div'); e.className = 'lounge-empty'; e.textContent = 'No messages yet. Say hello 👋'; b.append(e); }
    items.forEach(appendMessage);
    toBottom(); updateJump();
  });
  socket.on('chat:new', upsert);
  socket.on('chat:deleted', upsert);
  socket.on('presence:count', n => { $('loungeOnlineCount').textContent = `${n} online`; });
  socket.on('chat:error', e => alert((e && e.message) || 'Chat action failed.'));
}

/* ---------- layout: full-height chat, keyboard-safe on phones ---------- */
function sizeChat() {
  const app = $('chatApp'), nav = document.querySelector('.navbar');
  if (!app || !nav) return;
  const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
  const wasNear = nearBottom();
  app.style.setProperty('--chat-h', Math.max(280, Math.round(vh - nav.offsetHeight)) + 'px');
  if (wasNear) toBottom();
}
function syncSection() {
  const sec = $('departmental-lounge'); if (!sec) return;
  const open = sec.classList.contains('active');
  document.body.classList.toggle('chat-open', open);
  if (open) { sizeChat(); connect(); requestAnimationFrame(() => { toBottom(); updateJump(); }); }
}

/* ---------- init ---------- */
function init() {
  if (started || !$('loungeComposer')) return; started = true;
  const input = $('loungeMessageInput');
  const grow = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; };

  document.querySelector('[data-section="departmental-lounge"]')?.addEventListener('click', () => { setTimeout(syncSection, 0); connect(); });
  new MutationObserver(syncSection).observe($('departmental-lounge'), { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', sizeChat);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', sizeChat);

  $('loungeComposer').addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || !socket || !socket.connected) return;
    socket.emit('chat:send', { text, replyToId: replyTo ? replyTo.id : null });
    input.value = ''; grow(); reply(null); $('loungeEmojiTray').hidden = true; input.focus();
  });
  input.addEventListener('input', grow);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer:fine)').matches) { e.preventDefault(); $('loungeComposer').requestSubmit(); }
  });
  $('loungeCancelReply').onclick = () => reply(null);

  const tray = $('loungeEmojiTray');
  $('loungeEmojiButton').onclick = e => { e.stopPropagation(); tray.hidden = !tray.hidden; };
  tray.querySelectorAll('button').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const s = input.selectionStart ?? input.value.length, en = input.selectionEnd ?? s;
    input.value = input.value.slice(0, s) + b.textContent + input.value.slice(en);
    const p = s + b.textContent.length; input.focus(); input.setSelectionRange(p, p); grow();
  });
  document.addEventListener('click', e => {
    if (!tray.hidden && !tray.contains(e.target)) tray.hidden = true;
    if (!e.target.closest('.lounge-message')) closeActions();
  });

  box().addEventListener('scroll', updateJump, { passive: true });
  $('loungeJump').onclick = () => { toBottom(); unseen = 0; updateJump(); };
  syncSection();
}
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
