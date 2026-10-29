'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  clientId: string;
  businessName: string;
  logoUrl?: string;
  theme?: 'dark' | 'light';
}

export default function ChatPage({ clientId, businessName, logoUrl, theme = 'dark' }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setStarted(true);

    const botMsg: Message = { role: 'assistant', content: '' };
    setMessages([...newMessages, botMsg]);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, clientId }),
      });

      if (!res.ok || !res.body) throw new Error('error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages([...newMessages, { role: 'assistant', content: full }]);
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'عذراً، حدث خطأ. حاول مرة أخرى.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function renderContent(content: string) {
    const waMatch = content.match(/\{\{WA_LINK_TEXT:([\s\S]*?)\}\}/);
    if (waMatch) {
      const before = content.slice(0, content.indexOf('{{WA_LINK_TEXT:'));
      const waText = encodeURIComponent(waMatch[1].trim());
      return (
        <>
          {before && <span>{before}</span>}
          <a
            href={`https://wa.me/971585806534?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="wa-btn"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.524 5.845L0 24l6.345-1.5A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.373l-.36-.213-3.727.881.934-3.618-.235-.372A9.818 9.818 0 1112 21.818z"/>
            </svg>
            تواصل عبر واتساب
          </a>
        </>
      );
    }
    return <span>{content}</span>;
  }

  const initials = businessName.slice(0, 2).toUpperCase();
  const isLight = theme === 'light';

  return (
    <div className={`chat-root ${isLight ? 'light' : 'dark'}`}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }

        .chat-root {
          display: flex;
          flex-direction: column;
          height: 100dvh;
          font-family: 'Tajawal', -apple-system, sans-serif;
        }

        /* ── Dark theme ─────────────────────────────────────── */
        .chat-root.dark {
          --bg: #0f0f14;
          --surface: #16161e;
          --border: #2a2a38;
          --text: #f0eee8;
          --text-muted: #666;
          --bubble-bot-bg: #1e1e2a;
          --bubble-bot-border: #2a2a3a;
          --bubble-bot-text: #e8e6e0;
          --input-bg: #0f0f14;
          --input-border: #2a2a38;
          --input-text: #f0eee8;
          --input-placeholder: #555;
          --scrollbar: #333;
          --avatar-bg: linear-gradient(135deg, #c9a84c, #7a5c1e);
          --powered-color: #555;
        }

        /* ── Light theme ─────────────────────────────────────── */
        .chat-root.light {
          --bg: #f4f5f8;
          --surface: #ffffff;
          --border: #e0e2e9;
          --text: #1a1a2e;
          --text-muted: #999;
          --bubble-bot-bg: #ffffff;
          --bubble-bot-border: #e4e6ed;
          --bubble-bot-text: #1a1a2e;
          --input-bg: #ffffff;
          --input-border: #dcdfe8;
          --input-text: #1a1a2e;
          --input-placeholder: #aaa;
          --scrollbar: #ccc;
          --avatar-bg: linear-gradient(135deg, #c9a84c, #7a5c1e);
          --powered-color: #bbb;
        }

        .chat-root {
          background: var(--bg);
          color: var(--text);
        }

        /* Header */
        .chat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .chat-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--avatar-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          color: #fff;
          flex-shrink: 0;
          overflow: hidden;
        }
        .chat-avatar img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 0;
        }
        .chat-header-info { flex: 1; min-width: 0; }
        .chat-biz-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chat-status {
          font-size: 12px;
          color: #4caf8a;
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 1px;
        }
        .status-dot {
          width: 7px; height: 7px;
          background: #4caf8a;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .chat-powered {
          font-size: 11px;
          color: var(--powered-color);
          white-space: nowrap;
        }
        .chat-powered span { color: #c9a84c; font-weight: 600; }

        /* Messages */
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          scroll-behavior: smooth;
        }
        .chat-messages::-webkit-scrollbar { width: 4px; }
        .chat-messages::-webkit-scrollbar-track { background: transparent; }
        .chat-messages::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 2px; }

        /* Welcome */
        .welcome-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          gap: 10px;
          padding: 40px 20px;
          text-align: center;
          color: var(--text-muted);
        }
        .welcome-icon {
          width: 60px; height: 60px;
          border-radius: 50%;
          background: #c9a84c18;
          border: 1px solid #c9a84c44;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          margin-bottom: 4px;
          overflow: hidden;
        }
        .welcome-icon img {
          width: 80%;
          height: 80%;
          object-fit: contain;
        }
        .welcome-title { font-size: 17px; font-weight: 700; color: #c9a84c; }
        .welcome-sub { font-size: 14px; line-height: 1.7; max-width: 280px; color: var(--text-muted); }

        /* Bubbles */
        .msg-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
          animation: fadeUp .2s ease;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msg-row.user { flex-direction: row-reverse; }
        .msg-mini-avatar {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: var(--avatar-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
          margin-bottom: 2px;
          overflow: hidden;
        }
        .msg-mini-avatar img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .bubble {
          max-width: 78%;
          padding: 10px 14px;
          border-radius: 18px;
          font-size: 14.5px;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .bubble.bot {
          background: var(--bubble-bot-bg);
          border: 1px solid var(--bubble-bot-border);
          border-bottom-right-radius: 4px;
          color: var(--bubble-bot-text);
          text-align: right;
          direction: rtl;
          box-shadow: 0 1px 3px rgba(0,0,0,.06);
        }
        .bubble.user {
          background: linear-gradient(135deg, #c9a84c, #a07830);
          color: #fff;
          border-bottom-left-radius: 4px;
          text-align: right;
          direction: rtl;
        }

        /* WhatsApp button */
        .wa-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #25d366;
          color: #fff;
          border-radius: 25px;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          margin-top: 8px;
          cursor: pointer;
          direction: rtl;
        }

        /* Typing */
        .typing { display: flex; gap: 5px; align-items: center; padding: 4px 2px; }
        .typing span {
          width: 7px; height: 7px;
          background: #c9a84c;
          border-radius: 50%;
          animation: bounce .9s infinite;
        }
        .typing span:nth-child(2) { animation-delay: .15s; }
        .typing span:nth-child(3) { animation-delay: .3s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: .5; }
          40% { transform: scale(1); opacity: 1; }
        }

        /* Input area */
        .chat-input-area {
          padding: 12px 14px;
          background: var(--surface);
          border-top: 1px solid var(--border);
          display: flex;
          gap: 10px;
          align-items: flex-end;
          flex-shrink: 0;
        }
        .chat-textarea {
          flex: 1;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: 22px;
          padding: 10px 16px;
          color: var(--input-text);
          font-family: 'Tajawal', sans-serif;
          font-size: 14.5px;
          resize: none;
          min-height: 44px;
          max-height: 120px;
          outline: none;
          text-align: right;
          direction: rtl;
          line-height: 1.5;
          transition: border-color .15s;
        }
        .chat-textarea::placeholder { color: var(--input-placeholder); }
        .chat-textarea:focus { border-color: #c9a84c66; }
        .send-btn {
          width: 44px; height: 44px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #c9a84c, #a07830);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: opacity .15s, transform .1s;
        }
        .send-btn:hover { opacity: .85; }
        .send-btn:active { transform: scale(.93); }
        .send-btn:disabled { opacity: .4; cursor: default; }
      `}</style>

      {/* Header */}
      <div className="chat-header">
        <div className="chat-avatar">
          {logoUrl
            ? <img src={logoUrl} alt={businessName} />
            : initials
          }
        </div>
        <div className="chat-header-info">
          <div className="chat-biz-name">{businessName}</div>
          <div className="chat-status">
            <div className="status-dot" />
            متاح الآن
          </div>
        </div>
        <div className="chat-powered">powered by <span>DREXONYX</span></div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {!started && messages.length === 0 ? (
          <div className="welcome-wrap">
            <div className="welcome-icon">
              {logoUrl
                ? <img src={logoUrl} alt={businessName} />
                : '💬'
              }
            </div>
            <div className="welcome-title">أهلاً بك!</div>
            <div className="welcome-sub">
              كيف يمكنني مساعدتك اليوم؟<br />اكتب سؤالك وسأرد فوراً.
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`msg-row ${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="msg-mini-avatar">
                  {logoUrl
                    ? <img src={logoUrl} alt="" />
                    : initials
                  }
                </div>
              )}
              <div className={`bubble ${msg.role === 'assistant' ? 'bot' : 'user'}`}>
                {msg.role === 'assistant' && !msg.content && loading ? (
                  <div className="typing">
                    <span /><span /><span />
                  </div>
                ) : (
                  renderContent(msg.content)
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <button
          className="send-btn"
          disabled={!input.trim() || loading}
          onClick={() => sendMessage(input)}
          aria-label="إرسال"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="18" height="18">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
        <textarea
          ref={inputRef}
          className="chat-textarea"
          placeholder="اكتب رسالتك..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          dir="rtl"
        />
      </div>
    </div>
  );
}
