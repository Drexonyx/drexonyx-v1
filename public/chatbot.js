(function () {
  const params = new URLSearchParams(document.currentScript?.src.split('?')[1] || '');
  const clientId = params.get('client') || 'demo';
  const apiBase = (params.get('api') || 'https://www.drexonyx.com').replace(/\/$/, '');

  const GOLD = '#D4AF37';
  const DARK = '#0c0c14';

  const style = document.createElement('style');
  style.textContent = `
    #drx-chat-btn {
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      width: 56px; height: 56px; border-radius: 50%;
      background: ${GOLD}; border: none; cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      transition: transform .2s;
    }
    #drx-chat-btn:hover { transform: scale(1.1); }
    #drx-chat-box {
      position: fixed; bottom: 90px; right: 16px; z-index: 99999;
      width: min(380px, calc(100vw - 32px)); max-height: min(560px, 70vh);
      background: ${DARK}; border: 1px solid ${GOLD};
      border-radius: 16px; display: none; flex-direction: column;
      font-family: system-ui, sans-serif; overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }
    #drx-chat-box.open { display: flex; }
    #drx-chat-header {
      padding: 12px 16px; background: ${GOLD}; color: ${DARK};
      font-weight: 700; font-size: 14px; display: flex;
      align-items: center; justify-content: space-between;
    }
    #drx-chat-messages {
      flex: 1; overflow-y: auto; padding: 14px; display: flex;
      flex-direction: column; gap: 10px;
    }
    .drx-msg {
      max-width: 85%; padding: 10px 14px; border-radius: 12px;
      font-size: 14px; line-height: 1.6; word-break: break-word;
    }
    .drx-msg.bot {
      background: #1e1e2e; color: #eee; align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    .drx-msg.user {
      background: ${GOLD}; color: ${DARK}; align-self: flex-end;
      border-bottom-right-radius: 4px; font-weight: 500;
    }
    #drx-chat-input-row {
      display: flex; border-top: 1px solid #333; padding: 8px;
    }
    #drx-chat-input {
      flex: 1; background: #1e1e2e; color: #eee; border: none;
      border-radius: 8px; padding: 8px 12px; font-size: 13px;
      outline: none; resize: none;
    }
    #drx-chat-send {
      background: ${GOLD}; color: ${DARK}; border: none;
      border-radius: 8px; padding: 8px 14px; cursor: pointer;
      font-weight: 700; margin-left: 6px; font-size: 13px;
    }
    #drx-typing { color: #888; font-size: 12px; padding: 0 12px 8px; display: none; }
  `;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.id = 'drx-chat-btn';
  btn.title = 'Chat with us';
  btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      fill="${DARK}" stroke="${DARK}" stroke-width="1"/>
  </svg>`;

  const box = document.createElement('div');
  box.id = 'drx-chat-box';
  box.innerHTML = `
    <div id="drx-chat-header">
      <span>💬 Chat with us</span>
      <span id="drx-close" style="cursor:pointer;font-size:18px">×</span>
    </div>
    <div id="drx-chat-messages"></div>
    <div id="drx-typing">typing…</div>
    <div id="drx-chat-input-row">
      <textarea id="drx-chat-input" placeholder="Type a message…" rows="1"></textarea>
      <button id="drx-chat-send">Send</button>
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(box);

  const messages = [];
  const msgsEl = box.querySelector('#drx-chat-messages');
  const input = box.querySelector('#drx-chat-input');
  const sendBtn = box.querySelector('#drx-chat-send');
  const typingEl = box.querySelector('#drx-typing');

  function addMsg(role, text) {
    const el = document.createElement('div');
    el.className = `drx-msg ${role === 'user' ? 'user' : 'bot'}`;
    el.textContent = text;
    msgsEl.appendChild(el);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function greet() {
    addMsg('bot', 'مرحباً! 👋 كيف أقدر أساعدك اليوم؟\nHello! How can I help you today?');
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    messages.push({ role: 'user', content: text });
    addMsg('user', text);
    typingEl.style.display = 'block';
    sendBtn.disabled = true;

    try {
      const res = await fetch(`${apiBase}/api/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, clientId }),
        redirect: 'error',
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const reply = data.reply || 'Sorry, something went wrong.';
      messages.push({ role: 'assistant', content: reply });
      addMsg('bot', reply);
    } catch {
      addMsg('bot', 'Connection error. Please try again.');
    } finally {
      typingEl.style.display = 'none';
      sendBtn.disabled = false;
      input.focus();
    }
  }

  btn.addEventListener('click', () => {
    box.classList.toggle('open');
    if (box.classList.contains('open') && msgsEl.children.length === 0) greet();
  });

  box.querySelector('#drx-close').addEventListener('click', () => box.classList.remove('open'));

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
})();
