(() => {
'use strict';
const API=String(window.AKUHIR_API_BASE_URL||'').replace(/\//,'');
const token=()=>localStorage.getItem('token')||localStorage.getItem('accessToken')||localStorage.getItem('authToken')||'';
const $=id=>document.getElementById(id);let socket=null,replyTo=null,started=false;
const time=v=>new Date(v).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
function status(v,ok=false){$('loungeConnection').textContent=v;$('loungeConnection').classList.toggle('connected',ok)}
function reply(m){replyTo=m;$('loungeReplyPreview').hidden=!m;if(m){$('loungeReplyName').textContent=m.senderName;$('loungeReplyText').textContent=m.deleted?'Message deleted':m.text}}
function render(m){
 const me=String(localStorage.getItem('currentUser')||'').toUpperCase(),mine=String(m.senderMatric||'').toUpperCase()===me;
 const a=document.createElement('article');a.className='lounge-message'+(mine?' mine':'');a.dataset.id=m.id;
 const h=document.createElement('div');h.className='lounge-message-head';const n=document.createElement('strong');n.textContent=m.senderName||'Student';const t=document.createElement('time');t.dateTime=m.createdAt;t.textContent=time(m.createdAt);h.append(n,t);a.append(h);
 if(m.replyTo){const q=document.createElement('div');q.className='lounge-reply-quote';const qn=document.createElement('strong');qn.textContent=m.replyTo.senderName||'Student';const qt=document.createElement('span');qt.textContent=m.replyTo.deleted?'Message deleted':m.replyTo.text;q.append(qn,qt);a.append(q)}
 const b=document.createElement('div');b.className='lounge-message-body';if(m.deleted){b.classList.add('lounge-deleted');b.textContent='This message was deleted.'}else b.textContent=m.text;a.append(b);
 if(!m.deleted){const actions=document.createElement('div');actions.className='lounge-message-actions';const r=document.createElement('button');r.textContent='Reply';r.type='button';r.onclick=()=>reply(m);actions.append(r);
 if(mine||localStorage.getItem('currentUserRole')==='admin'){const d=document.createElement('button');d.textContent='Delete for everyone';d.type='button';d.onclick=()=>{if(confirm('Delete this message for everyone?'))socket.emit('chat:delete',{messageId:m.id})};actions.append(d)}a.append(actions)}
 return a;
}
function upsert(m){const box=$('loungeMessages'),old=box.querySelector(`[data-id="${CSS.escape(m.id)}"]`);if(old)old.replaceWith(render(m));else{box.querySelector('.lounge-empty')?.remove();box.append(render(m));box.scrollTop=box.scrollHeight}}
function connect(){if(!window.io||!token()){status('Login required');return}status('Connecting…');socket=window.io(API,{auth:{token:token()}});
 socket.on('connect',()=>status('Connected',true));socket.on('disconnect',()=>status('Reconnecting…'));socket.on('connect_error',e=>status(e.message||'Connection failed'));
 socket.on('chat:history',items=>{const box=$('loungeMessages');box.replaceChildren();if(!items.length){const e=document.createElement('div');e.className='lounge-empty';e.textContent='No messages yet. Start the conversation.';box.append(e)}items.forEach(m=>box.append(render(m)));box.scrollTop=box.scrollHeight});
 socket.on('chat:new',upsert);socket.on('chat:deleted',upsert);socket.on('presence:count',n=>$('loungeOnlineCount').textContent=`${n} online`);socket.on('chat:error',e=>alert(e?.message||'Chat action failed.'));
}
function init(){if(started||!$('loungeComposer'))return;started=true;document.querySelector('[data-section="departmental-lounge"]')?.addEventListener('click',()=>{if(!socket||!socket.connected)connect()});
 $('loungeComposer').addEventListener('submit',e=>{e.preventDefault();const input=$('loungeMessageInput'),text=input.value.trim();if(!text||!socket?.connected)return;socket.emit('chat:send',{text,replyToId:replyTo?.id||null});input.value='';reply(null)});
 $('loungeCancelReply').onclick=()=>reply(null);$('loungeEmojiButton').onclick=()=>$('loungeEmojiTray').hidden=!$('loungeEmojiTray').hidden;$('loungeEmojiTray').querySelectorAll('button').forEach(b=>b.onclick=()=>{$('loungeMessageInput').value+=$( 'loungeMessageInput').value?` ${b.textContent}`:b.textContent;$('loungeMessageInput').focus()});
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();