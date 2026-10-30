'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface ChatCategory {
  icon: 'monitor' | 'brush' | 'chart';
  title: string;
  desc: string;
  prompt: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function BotAvatar({ logoUrl, initials }: { logoUrl?: string; initials: string }) {
  return logoUrl ? (
    <div className="msg-mini-logo"><Image src={logoUrl} alt="" width={25} height={25} unoptimized /></div>
  ) : (
    <div className="msg-mini-circle">{initials}</div>
  );
}

interface Props {
  clientId: string;
  businessName: string;
  headerName?: string;
  logoUrl?: string;
  theme?: 'dark' | 'light';
  welcomeMessage?: string;
  heroBg?: string;
  heroTagline?: string;
  heroTitle?: string;
  heroHighlight?: string;
  heroSubtitle?: string;
  categories?: ChatCategory[];
  inputPlaceholder?: string;
  waNumber?: string;
}

function CategoryIcon({ type }: { type: string }) {
  if (type === 'monitor') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
  if (type === 'brush') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" /><path d="M7.07 14.94C5.79 16.54 4 19 4 20c0 .5.5.5 1 .5 2 0 4-2 5-3.07" /><path d="M9.06 11.9l4.03 4.03" />
    </svg>
  );
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }

.chat-root {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  font-family: var(--font-inter), var(--font-tajawal), -apple-system, sans-serif;
}

.chat-root.dark {
  --bg: #0f0f14;
  --surface: #181820;
  --border: #252533;
  --text: #f0eee8;
  --text-soft: #9a9898;
  --text-muted: #50504e;
  --gold: #c9a84c;
  --gold-dim: rgba(201,168,76,0.22);
  --bubble-bot-bg: #1c1c28;
  --bubble-bot-border: #28283a;
  --bubble-bot-text: #e6e4de;
  background: var(--bg);
  color: var(--text);
}

.chat-root.light {
  --bg: #f0f2f5;
  --surface: #ffffff;
  --border: #e0e0e8;
  --text: #1a1a2e;
  --text-soft: #666;
  --text-muted: #aaa;
  --gold: #c9a84c;
  --gold-dim: rgba(201,168,76,0.22);
  --bubble-bot-bg: #ffffff;
  --bubble-bot-border: #e0e0e8;
  --bubble-bot-text: #1a1a2e;
  background: var(--bg);
  color: var(--text);
}

/* ── HEADER ── */
.chat-header {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 60px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.header-logo-wrap {
  display: flex; align-items: center;
  margin-right: 14px; flex-shrink: 0;
}
.header-logo { height: 26px; width: auto; max-width: 96px; object-fit: contain; }
.header-initials {
  width: 36px; height: 36px; border-radius: 8px;
  background: linear-gradient(135deg, #c9a84c, #a07830);
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 14px; color: #fff;
}

.header-sep { width: 1px; height: 30px; background: var(--border); margin-right: 14px; flex-shrink: 0; }

.header-info { flex: 1; min-width: 0; }
.header-name {
  font-size: 13px; font-weight: 700; color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.header-status { display: flex; align-items: center; gap: 5px; margin-top: 2px; font-size: 11px; color: #3cb87a; }
.status-dot {
  width: 6px; height: 6px; background: #3cb87a; border-radius: 50%;
  animation: pulse 2s infinite;
}
@keyframes pulse { 0%,100%{opacity:1}50%{opacity:.3} }

.header-powered { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
.powered-label { font-size: 8px; font-weight: 600; color: var(--text-muted); letter-spacing: 1px; }
.powered-brand { font-size: 11px; font-weight: 700; color: var(--gold); letter-spacing: .5px; }

/* ── MESSAGES AREA ── */
.chat-messages {
  flex: 1; overflow-y: auto; display: flex; flex-direction: column; scroll-behavior: smooth;
}
.chat-messages::-webkit-scrollbar { width: 3px; }
.chat-messages::-webkit-scrollbar-track { background: transparent; }
.chat-messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

/* ── WELCOME VIEW ── */
.welcome-view { display: flex; flex-direction: column; }

/* ── HERO ── */
.hero-section {
  position: relative; min-height: 200px;
  padding: 32px 24px 28px;
  display: flex; align-items: center; overflow: hidden; flex-shrink: 0;
}
.hero-bg {
  position: absolute; inset: 0;
  background-size: cover; background-position: center right;
  opacity: .75;
}
.hero-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to right, #0f0f14 0%, rgba(15,15,20,.92) 22%, rgba(15,15,20,.65) 50%, rgba(15,15,20,.15) 100%);
}
.hero-content { position: relative; z-index: 1; max-width: 72%; }
.hero-tagline {
  display: flex; align-items: center; gap: 8px;
  font-size: 9.5px; font-weight: 700; color: var(--gold);
  letter-spacing: 1.8px; text-transform: uppercase; margin-bottom: 12px;
}
.tagline-dash { font-size: 16px; line-height: 1; }
.hero-title { font-size: 24px; font-weight: 800; line-height: 1.15; color: #fff; margin-bottom: 10px; }
.hero-highlight { color: var(--gold); }
.hero-sub { font-size: 12px; color: rgba(255,255,255,.5); line-height: 1.6; }

/* ── WELCOME BOT MSG ── */
.welcome-msg-row {
  display: flex; align-items: flex-end; gap: 8px;
  padding: 16px 16px 0;
}
.msg-mini-logo {
  width: 28px; height: 28px; border-radius: 7px;
  background: var(--surface); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; flex-shrink: 0;
}
.msg-mini-logo img { width: 90%; height: 90%; object-fit: contain; }
.mini-initials { font-size: 9px; font-weight: 800; color: var(--gold); }
.msg-mini-circle {
  width: 28px; height: 28px; border-radius: 50%;
  background: linear-gradient(135deg, #c9a84c, #a07830);
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 800; color: #fff; flex-shrink: 0;
}
.welcome-bubble {
  max-width: calc(100% - 60px);
  background: var(--bubble-bot-bg); border: 1px solid var(--bubble-bot-border);
  border-radius: 18px; border-bottom-left-radius: 4px;
  padding: 10px 14px; font-size: 13.5px; line-height: 1.6; color: var(--bubble-bot-text);
}

/* ── CATEGORIES ── */
.categories-section { padding: 14px 16px 0; }
.categories-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.category-card {
  background: rgba(255,255,255,.025);
  border: 1px solid var(--gold-dim);
  border-radius: 14px; padding: 14px 12px;
  cursor: pointer; text-align: left;
  display: flex; flex-direction: row; align-items: center; gap: 12px;
  transition: border-color .15s, background .15s;
  font-family: var(--font-inter), sans-serif;
}
.category-card:hover, .category-card:focus {
  border-color: var(--gold); background: rgba(201,168,76,.06); outline: none;
}
.category-card.full-width { grid-column: 1 / -1; }
.card-icon {
  width: 38px; height: 38px; border-radius: 10px;
  background: rgba(201,168,76,.12);
  display: flex; align-items: center; justify-content: center;
  color: var(--gold); flex-shrink: 0;
}
.card-text { flex: 1; min-width: 0; }
.card-arrow { font-size: 18px; color: var(--gold); opacity: .5; line-height: 1; flex-shrink: 0; }
.card-title { font-size: 13px; font-weight: 700; color: var(--text); line-height: 1.2; margin-bottom: 3px; }
.card-desc { font-size: 11px; color: var(--text-soft); line-height: 1.4; }

/* ── SECURITY FOOTER ── */
.security-footer {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 20px; margin-top: 8px;
}
.sec-line { flex: 1; height: 1px; background: var(--gold-dim); }
.sec-content {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  flex-shrink: 0;
}
.sec-main {
  display: flex; align-items: center; gap: 5px;
  font-size: 10px; color: var(--text-muted); white-space: nowrap;
}
.sec-sub { font-size: 9.5px; color: var(--text-muted); opacity: .7; }

/* ── MESSAGES LIST ── */
.messages-list { padding: 16px; display: flex; flex-direction: column; gap: 12px; flex: 1; }
.msg-row { display: flex; align-items: flex-end; gap: 8px; animation: fadeUp .2s ease; }
@keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
.msg-row.user { flex-direction: row-reverse; }

.bubble {
  max-width: 78%; padding: 10px 14px; border-radius: 18px;
  font-size: 14px; line-height: 1.65; white-space: pre-wrap; word-break: break-word;
}
.bubble.bot {
  background: var(--bubble-bot-bg); border: 1px solid var(--bubble-bot-border);
  border-bottom-left-radius: 4px; color: var(--bubble-bot-text);
}
.bubble.user {
  background: linear-gradient(135deg, #c9a84c, #a07830);
  color: #fff; border-bottom-right-radius: 4px;
  text-align: right; direction: rtl;
}

/* ── WA BUTTON ── */
.wa-btn {
  display: inline-flex; align-items: center; gap: 8px;
  background: #25d366; color: #fff; border-radius: 25px;
  padding: 10px 18px; font-size: 13px; font-weight: 700;
  text-decoration: none; margin-top: 8px; direction: rtl;
}

/* ── TYPING ── */
.typing { display: flex; gap: 5px; align-items: center; padding: 4px 2px; }
.typing span {
  width: 7px; height: 7px; background: var(--gold); border-radius: 50%;
  animation: bounce .9s infinite;
}
.typing span:nth-child(2){animation-delay:.15s}
.typing span:nth-child(3){animation-delay:.3s}
@keyframes bounce {
  0%,80%,100%{transform:scale(.6);opacity:.5}
  40%{transform:scale(1);opacity:1}
}

/* ── INPUT AREA ── */
.chat-input-area {
  display: flex; align-items: flex-end; gap: 8px;
  padding: 10px 14px;
  background: var(--surface); border-top: 1px solid var(--border); flex-shrink: 0;
}
.clip-btn {
  width: 40px; height: 40px; border-radius: 50%; border: none;
  background: transparent; color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: color .15s;
}
.clip-btn:hover { color: var(--gold); }
.chat-textarea {
  flex: 1;
  background: rgba(255,255,255,.04); border: 1.5px solid var(--border); border-radius: 22px;
  padding: 10px 16px; color: var(--text);
  font-family: var(--font-tajawal), var(--font-inter), sans-serif;
  font-size: 14px; resize: none; min-height: 44px; max-height: 120px;
  outline: none; line-height: 1.5; transition: border-color .15s;
}
.chat-root.light .chat-textarea { background: var(--bg); }
.chat-textarea::placeholder { color: var(--text-muted); }
.chat-textarea:focus { border-color: rgba(201,168,76,.5); }
.send-btn {
  width: 44px; height: 44px; border-radius: 50%; border: none;
  background: linear-gradient(135deg, #c9a84c, #a07830); color: #fff;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: opacity .15s, transform .1s;
  box-shadow: 0 2px 10px rgba(201,168,76,.3);
}
.send-btn:hover:not(:disabled){opacity:.85}
.send-btn:active:not(:disabled){transform:scale(.93)}
.send-btn:disabled{opacity:.3;cursor:default;box-shadow:none}
`;

export default function ChatPage({
  clientId,
  businessName,
  headerName,
  logoUrl,
  theme = 'dark',
  welcomeMessage,
  heroBg,
  heroTagline,
  heroTitle,
  heroHighlight,
  heroSubtitle,
  categories,
  inputPlaceholder,
  waNumber,
}: Props) {
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

    setMessages([...newMessages, { role: 'assistant', content: '' }]);

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
      setMessages([...newMessages, { role: 'assistant', content: 'عذراً، هناك انقطاع مؤقت في الخدمة. يرجى المحاولة خلال لحظات.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  function renderWelcome(text: string) {
    return text.split(/(\{\{GOLD:[^}]+\}\})/).map((part, i) => {
      const m = part.match(/\{\{GOLD:([^}]+)\}\}/);
      if (m) return <span key={i} style={{ color: 'var(--gold)', fontWeight: 700 }}>{m[1]}</span>;
      return <span key={i}>{part}</span>;
    });
  }

  function parseMarkdown(text: string): React.ReactNode[] {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\n)/g);
    return parts.map((p, i) => {
      if (p === '\n') return <br key={i} />;
      if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
      if (p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>;
      return p;
    });
  }

  function renderContent(content: string) {
    const waMatch = content.match(/\{\{WA_LINK_TEXT:([\s\S]*?)\}\}/);
    if (waMatch) {
      const before = content.slice(0, content.indexOf('{{WA_LINK_TEXT:'));
      const waText = encodeURIComponent(waMatch[1].trim());
      return (
        <>
          {before && <span>{parseMarkdown(before)}</span>}
          <a href={`https://wa.me/${waNumber ?? '971585806534'}?text=${waText}`} target="_blank" rel="noopener noreferrer" className="wa-btn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.524 5.845L0 24l6.345-1.5A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.373l-.36-.213-3.727.881.934-3.618-.235-.372A9.818 9.818 0 1112 21.818z"/>
            </svg>
            تواصل عبر واتساب
          </a>
        </>
      );
    }
    return <span>{parseMarkdown(content)}</span>;
  }

  const initials = businessName.slice(0, 2).toUpperCase();
  const displayName = headerName || businessName;
  const isDark = theme !== 'light';

  return (
    <div className={`chat-root ${isDark ? 'dark' : 'light'}`}>
      <style>{CSS}</style>

      {/* HEADER */}
      <header className="chat-header">
        <div className="header-logo-wrap">
          {logoUrl
            ? <Image src={logoUrl} alt={businessName} width={96} height={26} className="header-logo" unoptimized />
            : <div className="header-initials">{initials}</div>
          }
        </div>
        <div className="header-sep" />
        <div className="header-info">
          <div className="header-name">{displayName}</div>
          <div className="header-status"><span className="status-dot" />Online</div>
        </div>
        <div className="header-powered">
          <span className="powered-label">POWERED BY</span>
          <span className="powered-brand">DREXONYX</span>
        </div>
      </header>

      {/* MESSAGES / WELCOME AREA */}
      <div className="chat-messages">
        {!started ? (
          <div className="welcome-view">
            {/* Hero */}
            <div className="hero-section">
              {heroBg && <div className="hero-bg" style={{ backgroundImage: `url('${heroBg}')` }} />}
              <div className="hero-overlay" />
              <div className="hero-content">
                {heroTagline && (
                  <div className="hero-tagline">
                    <span className="tagline-dash">—</span>
                    {heroTagline}
                  </div>
                )}
                {(heroTitle || heroHighlight) && (
                  <h1 className="hero-title">
                    {heroTitle}
                    {heroHighlight && <span className="hero-highlight"> {heroHighlight}</span>}
                  </h1>
                )}
                {heroSubtitle && <p className="hero-sub">{heroSubtitle}</p>}
              </div>
            </div>

            {/* Welcome bot message */}
            {welcomeMessage && (
              <div className="welcome-msg-row">
                <BotAvatar logoUrl={logoUrl} initials={initials} />
                <div className="welcome-bubble">{renderWelcome(welcomeMessage)}</div>
              </div>
            )}

            {/* Category cards */}
            {categories && categories.length > 0 && (
              <div className="categories-section">
                <div className="categories-grid">
                  {categories.map((cat, i) => (
                    <button
                      key={i}
                      className={`category-card${categories.length % 2 !== 0 && i === categories.length - 1 ? ' full-width' : ''}`}
                      onClick={() => sendMessage(cat.prompt)}
                    >
                      <div className="card-icon"><CategoryIcon type={cat.icon} /></div>
                      <div className="card-text">
                        <div className="card-title">{cat.title}</div>
                        <div className="card-desc">{cat.desc}</div>
                      </div>
                      <span className="card-arrow">›</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Security footer */}
            <div className="security-footer">
              <div className="sec-line" />
              <div className="sec-content">
                <div className="sec-main">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>Your information is secure and confidential.</span>
                </div>
                <div className="sec-sub">We support businesses of all sizes.</div>
              </div>
              <div className="sec-line" />
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg, i) => (
              <div key={i} className={`msg-row ${msg.role}`}>
                {msg.role === 'assistant' && <BotAvatar logoUrl={logoUrl} initials={initials} />}
                <div className={`bubble ${msg.role === 'assistant' ? 'bot' : 'user'}`} dir={msg.role === 'assistant' ? 'auto' : 'rtl'}>
                  {msg.role === 'assistant' && !msg.content && loading ? (
                    <div className="typing"><span /><span /><span /></div>
                  ) : (
                    renderContent(msg.content)
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* INPUT AREA */}
      <div className="chat-input-area">
        <button className="clip-btn" aria-label="Attach file">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <textarea
          ref={inputRef}
          className="chat-textarea"
          placeholder={inputPlaceholder || 'Type a message...'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className="send-btn"
          disabled={!input.trim() || loading}
          onClick={() => sendMessage(input)}
          aria-label="Send"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="18" height="18" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
