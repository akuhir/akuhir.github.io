// ============================================================
//  AKUM H.I.R 2024 — Class Chat Room (Supabase Real-Time)
// ============================================================
//
//  SETUP STEPS:
//  1. Go to https://supabase.com → your project → SQL Editor
//  2. Run this SQL to create the messages table:
//
//     create table messages (
//       id uuid default gen_random_uuid() primary key,
//       sender text not null,
//       content text not null,
//       created_at timestamptz default now()
//     );
//
//     -- Allow anyone (logged-in portal users) to read & insert
//     alter table messages enable row level security;
//     create policy "read all" on messages for select using (true);
//     create policy "insert own" on messages for insert with check (true);
//
//  3. Go to Settings → API in your Supabase dashboard
//  4. Replace the two values below with your own:
//
const SUPABASE_URL = 'https://aahazlulwpcorwpvqdab.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FH8OyPqmcNddSZ5RiM-9Yw_piCqaZHq';
//
// ============================================================

(function () {
    let supabaseClient = null;
    let chatSubscription = null;
    let currentUser = null;
    let lastDate = null;

    function initChat() {
        currentUser = localStorage.getItem('currentUserName') || localStorage.getItem('currentUser');
        if (!currentUser) return;

        if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
            document.getElementById('chatMessages').innerHTML =
                '<div class="chat-loading" style="color:#e74c3c;">⚠️ Please add your Supabase URL and Key in chat.js to activate chat.</div>';
            return;
        }

        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        setupChatUI();
        loadMessages();
        subscribeToMessages();
    }

    function setupChatUI() {
        const sendBtn = document.getElementById('chatSendBtn');
        const input = document.getElementById('chatInput');

        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    async function loadMessages() {
        const container = document.getElementById('chatMessages');
        container.innerHTML = '<div class="chat-loading">Loading messages...</div>';

        const { data, error } = await supabaseClient
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(100);

        if (error) {
            container.innerHTML = '<div class="chat-loading" style="color:#e74c3c;">Failed to load messages. Check your Supabase config.</div>';
            console.error('Chat load error:', error);
            return;
        }

        container.innerHTML = '';
        lastDate = null;

        if (data.length === 0) {
            container.innerHTML = '<div class="chat-loading">No messages yet. Say hello! 👋</div>';
            return;
        }

        data.forEach(msg => appendMessage(msg));
        scrollToBottom();
    }

    function subscribeToMessages() {
        chatSubscription = supabaseClient
            .channel('messages-channel')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                const container = document.getElementById('chatMessages');
                // Remove "no messages" placeholder if present
                const placeholder = container.querySelector('.chat-loading');
                if (placeholder) placeholder.remove();

                appendMessage(payload.new);
                scrollToBottom();
            })
            .subscribe();
    }

    async function sendMessage() {
        const input = document.getElementById('chatInput');
        const sendBtn = document.getElementById('chatSendBtn');
        const content = input.value.trim();

        if (!content || !supabaseClient) return;

        sendBtn.disabled = true;
        input.disabled = true;

        const { error } = await supabaseClient
            .from('messages')
            .insert({ sender: currentUser, content });

        if (error) {
            console.error('Send error:', error);
            alert('Failed to send message. Please try again.');
        } else {
            input.value = '';
        }

        sendBtn.disabled = false;
        input.disabled = false;
        input.focus();
    }

    function getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    function getAvatarColor(name) {
        const colors = ['#004b87', '#8b0000', '#27ae60', '#8e44ad', '#d35400', '#16a085', '#2c3e50', '#c0392b'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    }

    function appendMessage(msg) {
        const container = document.getElementById('chatMessages');
        const isMine = msg.sender === currentUser;

        const msgDate = new Date(msg.created_at).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric'
        });

        // Date divider
        if (msgDate !== lastDate) {
            const divider = document.createElement('div');
            divider.className = 'chat-date-divider';
            divider.textContent = msgDate;
            container.appendChild(divider);
            lastDate = msgDate;
        }

        const time = new Date(msg.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit'
        });

        const avatarColor = getAvatarColor(msg.sender);

        const row = document.createElement('div');
        row.className = `chat-row ${isMine ? 'mine' : 'theirs'}`;
        row.innerHTML = `
            <div class="chat-avatar" style="background:${avatarColor}; font-size:1.2em; display:flex; align-items:center; justify-content:center;">👤</div>
            <div class="chat-bubble-wrap">
                <div class="chat-sender">${escapeHtml(msg.sender)}</div>
                <div class="chat-bubble">${escapeHtml(msg.content)}</div>
                <div class="chat-time">${time}</div>
            </div>
        `;

        container.appendChild(row);
    }

    function scrollToBottom() {
        const container = document.getElementById('chatMessages');
        container.scrollTop = container.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize when chat section is opened
    document.addEventListener('DOMContentLoaded', () => {
        // Hook into the portal's nav clicks
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                const section = link.getAttribute('data-section');
                if (section === 'chat' && !supabaseClient) {
                    setTimeout(initChat, 100);
                }
            });
        });
    });
})();
