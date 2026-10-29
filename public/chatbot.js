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
      position: fixed; bottom: 90px; right: 12px; z-index: 99999;
      width: min(420px, calc(100vw - 24px)); height: min(600px, 78vh);
      background: ${DARK}; border: 1px solid ${GOLD};
      border-radius: 20px; display: none; flex-direction: column;
      font-family: system-ui, sans-serif; overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,0.6);
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
    .drx-wa-btn {
      display: inline-flex; align-items: center; gap: 8px;
      margin-top: 10px; padding: 10px 16px;
      background: #25D366; color: #fff; border-radius: 10px;
      font-weight: 700; font-size: 13px; text-decoration: none;
      cursor: pointer;
    }
    .drx-wa-btn:hover { background: #1ebe5d; }
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

    const waMatch = text.match(/\{\{WA_LINK_TEXT:([\s\S]*?)\}\}/);
    if (waMatch) {
      const waText = waMatch[1].trim();
      const before = text.slice(0, waMatch.index).trim();
      const after = text.slice(waMatch.index + waMatch[0].length).trim();
      if (before) {
        const pre = document.createElement('span');
        pre.style.whiteSpace = 'pre-wrap';
        pre.textContent = before;
        el.appendChild(pre);
        el.appendChild(document.createElement('br'));
      }
      const waLink = document.createElement('a');
      waLink.href = 'https://wa.me/971521770988?text=' + encodeURIComponent(waText);
      waLink.target = '_blank';
      waLink.rel = 'noopener noreferrer';
      waLink.className = 'drx-wa-btn';
      waLink.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>أرسل تفاصيلك عبر واتساب';
      el.appendChild(waLink);
      if (after) {
        el.appendChild(document.createElement('br'));
        const post = document.createElement('span');
        post.style.whiteSpace = 'pre-wrap';
        post.textContent = after;
        el.appendChild(post);
      }
    } else {
      el.style.whiteSpace = 'pre-wrap';
      el.textContent = text;
    }

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
