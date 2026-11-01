'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { WA_LINK_TEXT_RE, parseLeadFields, isLeadValid } from '@/lib/chatbot/ssb-lead-parser';

interface ChatCategory {
  icon: 'monitor' | 'brush' | 'chart' | 'utensils' | 'store' | 'scissors' | 'medical' | 'building' | 'grid';
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

interface HeroFeature {
  icon: 'bolt' | 'clock' | 'shield';
  text: string;
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
  heroFeatures?: HeroFeature[];
  heroStyle?: 'poster';
  heroCta?: string;
  categories?: ChatCategory[];
  inputPlaceholder?: string;
  waNumber?: string;
  lang?: 'ar' | 'en';
  langSwitchHref?: string;
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
  if (type === 'utensils') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><line x1="7" y1="2" x2="7" y2="11" /><path d="M16 2v4a3 3 0 0 0 6 0V2" /><line x1="19" y1="6" x2="19" y2="22" /><line x1="7" y1="11" x2="7" y2="22" />
    </svg>
  );
  if (type === 'store') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
  if (type === 'scissors') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
  if (type === 'medical') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
  if (type === 'building') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="18" /><path d="M9 22V12h6v10" /><line x1="2" y1="3" x2="22" y2="3" /><line x1="9" y1="7" x2="9" y2="7.01" /><line x1="15" y1="7" x2="15" y2="7.01" /><line x1="9" y1="11" x2="9" y2="11.01" /><line x1="15" y1="11" x2="15" y2="11.01" />
    </svg>
  );
  if (type === 'grid') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
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
  --bg: #0A1225;
  --surface: #0F1C32;
  --surface-raised: #1B2B46;
  --border: rgba(255,255,255,0.09);
  --text: #FFFFFF;
  --text-soft: #D6DCEC;
  --text-muted: #8895B3;
  --gold: #c9a84c;
  --gold-dim: rgba(201,168,76,0.25);
  --accent: #2563EB;
  --accent-bright: #4F8AFF;
  --accent-dim: rgba(37,99,235,0.18);
  --input-bg: #1A2540;
  --bubble-bot-bg: #1A2540;
  --bubble-bot-border: rgba(255,255,255,0.09);
  --bubble-bot-text: #FFFFFF;
  background: var(--bg);
  color: var(--text);
}

.chat-root.light {
  --bg: #f0f2f5;
  --surface: #ffffff;
  --surface-raised: #f8f9fc;
  --border: #e0e0e8;
  --text: #1a1a2e;
  --text-soft: #666;
  --text-muted: #aaa;
  --gold: #c9a84c;
  --gold-dim: rgba(201,168,76,0.22);
  --accent: #2563EB;
  --accent-bright: #1D4ED8;
  --accent-dim: rgba(37,99,235,0.10);
  --input-bg: #f8f9fc;
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
  background: linear-gradient(135deg, #1D4ED8, #2563EB);
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
.powered-brand { font-size: 11px; font-weight: 700; color: var(--accent-bright); letter-spacing: .5px; }

/* ── MESSAGES AREA ── */
.chat-messages {
  flex: 1; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; scroll-behavior: smooth;
  background: var(--surface);
}
.chat-messages::-webkit-scrollbar { width: 3px; }
.chat-messages::-webkit-scrollbar-track { background: transparent; }
.chat-messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

/* ── WELCOME VIEW ── */
.welcome-view { display: flex; flex-direction: column; padding-bottom: 80px; }

/* ── HERO ── */
.hero-section {
  position: relative; min-height: 460px;
  overflow: hidden; flex-shrink: 0;
}
@media (max-width: 600px) { .hero-section { min-height: 260px; } }
.hero-bg {
  position: absolute; inset: 0;
  background-size: cover; background-position: center 30%;
  opacity: .72;
}
.hero-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(108deg, rgba(10,18,37,.97) 0%, rgba(10,18,37,.92) 38%, rgba(10,18,37,.70) 62%, rgba(10,18,37,.50) 100%);
}
.hero-glow {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse 55% 80% at 82% 50%, rgba(37,99,235,.22) 0%, transparent 68%);
}
.hero-inner {
  position: relative; z-index: 1;
  display: flex; flex-direction: row; align-items: center;
  padding: 36px 24px 32px; gap: 20px; min-height: inherit;
}
@media (max-width: 600px) { .hero-inner { flex-direction: column; } }
.hero-left { flex: 0 0 52%; display: flex; flex-direction: column; }
@media (max-width: 600px) { .hero-left { flex: 1; width: 100%; } }
.hero-logo-hero { height: 26px; width: auto; max-width: 96px; object-fit: contain; margin-bottom: 14px; }
.hero-tagline {
  display: inline-flex; align-items: center; gap: 6px; align-self: flex-start;
  font-size: 9px; font-weight: 700; color: var(--gold);
  letter-spacing: 1.8px; text-transform: uppercase; margin-bottom: 14px;
  background: var(--gold-dim); border: 1px solid rgba(201,168,76,.35);
  border-radius: 20px; padding: 4px 10px;
}
.hero-title {
  display: flex; flex-direction: column;
  font-size: 34px; font-weight: 900; line-height: 1.1; margin-bottom: 12px;
}
@media (max-width: 600px) { .hero-title { font-size: 26px; } }
.hero-line-1 { color: #FFFFFF; text-wrap: balance; }
.hero-line-2 { color: #4F8AFF; text-wrap: balance; }
.hero-sub { font-size: 12px; color: var(--text-soft); line-height: 1.6; margin-bottom: 16px; }
.hero-features { display: flex; flex-direction: column; gap: 9px; }
.hero-feat { display: flex; align-items: center; gap: 9px; font-size: 11.5px; color: var(--text-soft); font-weight: 500; }
.hero-feat-icon {
  width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0;
  background: var(--gold-dim); border: 1px solid rgba(201,168,76,.25);
  display: flex; align-items: center; justify-content: center; color: var(--gold);
}
/* RIGHT — product panel */
.hero-right { flex: 0 0 44%; display: flex; align-items: center; justify-content: center; }
@media (max-width: 600px) {
  .hero-right { flex: none; width: 100%; margin-top: 16px; }
  .pp-nav { display: none; }
  .pp-body { min-height: auto; }
  .pp-cats { grid-template-columns: repeat(4, 1fr); }
}

/* ── HERO POSTER VARIANT — show reference marketing image directly ── */
.hero-section.poster {
  padding: 0;
  background: none;
  min-height: unset;
  position: relative;
}
.hero-poster-img {
  width: 100%;
  height: auto;
  display: block;
  max-width: 100%;
}
.product-panel {
  width: 100%; max-width: 276px; border-radius: 16px;
  background: rgba(8,15,35,.82); backdrop-filter: blur(16px);
  border: 1px solid rgba(79,138,255,.30);
  box-shadow: 0 0 40px rgba(37,99,235,.25), 0 4px 24px rgba(0,0,0,.55);
  overflow: hidden;
}
.pp-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 11px; border-bottom: 1px solid rgba(79,138,255,.18);
  background: rgba(15,28,50,.92);
}
.pp-header-left { display: flex; align-items: center; gap: 7px; }
.pp-logo { height: 17px; width: auto; max-width: 60px; object-fit: contain; }
.pp-name { font-size: 10px; font-weight: 700; color: #fff; }
.pp-status { display: flex; align-items: center; gap: 3px; font-size: 8.5px; color: #3cb87a; margin-top: 1px; }
.pp-status-dot { width: 5px; height: 5px; background: #3cb87a; border-radius: 50%; }
.pp-powered { font-size: 7px; color: rgba(79,138,255,.85); font-weight: 600; letter-spacing: .4px; white-space: nowrap; }
.pp-body { display: flex; min-height: 170px; }
.pp-nav {
  width: 72px; flex-shrink: 0; padding: 7px 0;
  border-right: 1px solid rgba(79,138,255,.15);
  background: rgba(8,12,28,.5);
}
.pp-nav-item {
  padding: 5px 7px; font-size: 8.5px; color: rgba(255,255,255,.55);
  display: flex; align-items: center; gap: 4px; direction: rtl;
}
.pp-nav-item.active { color: #4F8AFF; background: rgba(79,138,255,.12); }
.pp-nav-dot { width: 3.5px; height: 3.5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.pp-chat { flex: 1; padding: 8px; display: flex; flex-direction: column; gap: 6px; overflow: hidden; }
.pp-bot-row { display: flex; align-items: flex-start; gap: 5px; }
.pp-bot-avatar {
  width: 19px; height: 19px; border-radius: 5px; flex-shrink: 0;
  background: rgba(37,99,235,.28); border: 1px solid rgba(79,138,255,.38);
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.pp-bot-bubble {
  background: rgba(27,43,70,.88); border: 1px solid rgba(255,255,255,.09);
  border-radius: 8px; border-top-left-radius: 2px;
  padding: 5px 7px; font-size: 8.5px; color: #D6DCEC; line-height: 1.5;
  direction: rtl;
}
.pp-cats { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.pp-cat {
  background: rgba(255,255,255,.055); border: 1px solid rgba(255,255,255,.11);
  border-radius: 6px; padding: 5px 5px; font-size: 8px; color: #D6DCEC;
  display: flex; align-items: center; gap: 3px; direction: rtl;
}
.pp-cat-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--accent-bright); flex-shrink: 0; }
.pp-input-row {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 9px; border-top: 1px solid rgba(79,138,255,.15);
  background: rgba(15,28,50,.92); direction: rtl;
}
.pp-input-placeholder {
  flex: 1; font-size: 8.5px; color: rgba(255,255,255,.35); padding: 3px 0;
}
.pp-send {
  width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
  background: var(--accent); display: flex; align-items: center; justify-content: center;
}

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
.mini-initials { font-size: 9px; font-weight: 800; color: var(--accent-bright); }
.msg-mini-circle {
  width: 28px; height: 28px; border-radius: 50%;
  background: linear-gradient(135deg, #1D4ED8, #2563EB);
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 800; color: #fff; flex-shrink: 0;
}
.welcome-bubble {
  max-width: calc(100% - 60px);
  background: var(--bubble-bot-bg); border: 1px solid var(--bubble-bot-border);
  border-radius: 18px; border-bottom-left-radius: 4px;
  padding: 10px 14px; font-size: 13.5px; line-height: 1.6; color: var(--bubble-bot-text);
  box-shadow: 0 1px 5px rgba(0,0,0,.22);
}

/* ── CATEGORIES ── */
.categories-section { padding: 14px 16px 0; overflow: hidden; }
.categories-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; }
@media (min-width: 480px) { .categories-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.category-card {
  background: rgba(255,255,255,.055);
  border: 1px solid rgba(255,255,255,0.13);
  border-radius: 14px; padding: 14px 12px;
  cursor: pointer; text-align: left;
  display: flex; flex-direction: row; align-items: center; gap: 12px;
  transition: border-color .15s, background .15s, box-shadow .15s;
  font-family: var(--font-inter), sans-serif;
  box-shadow: 0 1px 4px rgba(0,0,0,.18);
}
.category-card:hover, .category-card:focus {
  border-color: var(--accent); background: var(--accent-dim); outline: none;
}
.category-card.full-width { grid-column: 1 / -1; }
.card-icon {
  width: 38px; height: 38px; border-radius: 10px;
  background: var(--accent-dim);
  display: flex; align-items: center; justify-content: center;
  color: var(--accent-bright); flex-shrink: 0;
}
.card-text { flex: 1; min-width: 0; }
.card-arrow { font-size: 18px; color: var(--text-muted); opacity: .7; line-height: 1; flex-shrink: 0; }
.card-title { font-size: 13px; font-weight: 700; color: var(--text); line-height: 1.3; margin-bottom: 3px; overflow-wrap: break-word; word-break: break-word; }
.card-desc { font-size: 11px; color: var(--text-soft); line-height: 1.5; overflow-wrap: break-word; word-break: break-word; }

/* ── SECURITY FOOTER ── */
.security-footer {
  padding: 16px 16px 12px;
  margin-top: 8px;
  border-top: 1px solid var(--border);
}
.sec-privacy {
  display: flex; align-items: flex-start; gap: 8px;
  margin-bottom: 12px;
}
.sec-privacy-icon { flex-shrink: 0; color: var(--text-muted); margin-top: 1px; }
.sec-privacy-text { display: flex; flex-direction: column; gap: 2px; }
.sec-privacy-main { font-size: 11px; font-weight: 600; color: var(--text-muted); direction: rtl; }
.sec-privacy-sub { font-size: 10px; color: var(--text-muted); opacity: .7; direction: rtl; }
.sec-features {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
}
.sec-feature {
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  background: rgba(255,255,255,.03); border: 1px solid var(--border);
  border-radius: 10px; padding: 10px 6px;
}
.sec-feature-icon { color: var(--accent-bright); }
.sec-feature-label { font-size: 9.5px; color: var(--text-muted); text-align: center; direction: rtl; line-height: 1.4; }

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
  box-shadow: 0 1px 5px rgba(0,0,0,.22);
}
.bubble.user {
  background: linear-gradient(135deg, #1D4ED8, #2563EB);
  color: #fff; border-bottom-right-radius: 4px;
  text-align: right; direction: rtl;
}

/* ── WA BUTTON ── */
.wa-btn {
  display: inline-flex; align-items: center; gap: 12px;
  background: linear-gradient(135deg, #25d366 0%, #128c7e 100%);
  color: #fff; border-radius: 14px;
  padding: 12px 20px; text-decoration: none; margin-top: 10px;
  box-shadow: 0 3px 14px rgba(37,211,102,.35); transition: box-shadow .2s, transform .15s;
}
.wa-btn:hover { box-shadow: 0 5px 20px rgba(37,211,102,.5); transform: translateY(-1px); }
.wa-btn-text { display: flex; flex-direction: column; gap: 1px; }
.wa-btn-primary { font-size: 14px; font-weight: 700; direction: rtl; }
.wa-btn-secondary { font-size: 11px; font-weight: 400; font-style: italic; opacity: .82; }

/* ── CRM SUBMIT STATES ── */
.crm-submitting {
  display: inline-flex; align-items: center; gap: 8px;
  color: var(--text-soft); font-size: 13px; margin-top: 8px; direction: rtl;
}
.crm-spinner {
  width: 16px; height: 16px; border: 2px solid var(--border);
  border-top-color: var(--accent-bright); border-radius: 50%;
  animation: spin .8s linear infinite; flex-shrink: 0;
}
@keyframes spin { to{transform:rotate(360deg)} }
.crm-retry-btn {
  display: inline-flex; align-items: center; gap: 8px;
  background: transparent; border: 1.5px solid var(--accent);
  color: var(--accent-bright); border-radius: 25px;
  padding: 10px 18px; font-size: 13px; font-weight: 700;
  cursor: pointer; margin-top: 8px; direction: rtl; font-family: inherit;
  transition: background .15s;
}
.crm-retry-btn:hover { background: var(--accent-dim); }
.crm-error-msg { font-size: 12px; color: var(--text-soft); margin-top: 8px; direction: rtl; line-height: 1.5; }

/* ── TYPING ── */
.typing { display: flex; gap: 5px; align-items: center; padding: 4px 2px; }
.typing span {
  width: 7px; height: 7px; background: var(--accent-bright); border-radius: 50%;
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
.chat-textarea {
  flex: 1;
  background: var(--input-bg, #292F45); border: 1.5px solid var(--border); border-radius: 22px;
  padding: 10px 16px; color: var(--text);
  font-family: var(--font-tajawal), var(--font-inter), sans-serif;
  font-size: 14px; resize: none; min-height: 44px; max-height: 120px;
  outline: none; line-height: 1.5; transition: border-color .15s;
}
.chat-root.light .chat-textarea { background: var(--bg); }
.chat-textarea::placeholder { color: var(--text-muted); }
.chat-textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37,99,235,.15); }
.send-btn {
  width: 44px; height: 44px; border-radius: 50%; border: none;
  background: var(--accent); color: #fff;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: opacity .15s, transform .1s;
  box-shadow: 0 2px 10px rgba(37,99,235,.40);
}
.send-btn:hover:not(:disabled){opacity:.85}
.send-btn:active:not(:disabled){transform:scale(.93)}
.send-btn:disabled{opacity:.3;cursor:default;box-shadow:none}

/* ── LANGUAGE SWITCH ── */
.lang-switch-btn {
  margin-right: auto; flex-shrink: 0;
  padding: 4px 10px; border-radius: 6px;
  border: 1px solid var(--border); background: transparent;
  color: var(--text-muted); font-size: 11px; font-weight: 700;
  letter-spacing: .04em; text-decoration: none;
  transition: color .15s, border-color .15s;
}
.lang-switch-btn:hover { color: var(--text); border-color: var(--accent); }
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
  heroFeatures,
  heroStyle,
  heroCta,
  categories,
  inputPlaceholder,
  waNumber,
  lang = 'ar',
  langSwitchHref,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [crmError, setCrmError] = useState(false);
  const [crmSubmitting, setCrmSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const leadSubmitAttempted = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Trigger CRM submission when bot outputs {{WA_LINK_TEXT:...}}
  useEffect(() => {
    if (leadSubmitAttempted.current || !waNumber) return;
    const lastBot = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastBot || !lastBot.content) return;
    const waMatch = lastBot.content.match(WA_LINK_TEXT_RE);
    if (waMatch) {
      submitLeadFromWaText(waMatch[1].trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

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
      setMessages([...newMessages, { role: 'assistant', content: lang === 'en' ? 'Sorry, a temporary service interruption occurred. Please try again in a moment.' : 'عذراً، هناك انقطاع مؤقت في الخدمة. يرجى المحاولة خلال لحظات.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  async function submitLeadFromWaText(waText: string) {
    if (leadSubmitAttempted.current) return;
    leadSubmitAttempted.current = true;
    setCrmSubmitting(true);
    setCrmError(false);

    const fields = parseLeadFields(waText);
    if (!isLeadValid(fields)) {
      console.error('[CRM] lead parse failed — missing businessName or contactWhatsapp', {
        waTextSnippet: waText.slice(0, 300),
        parsed: fields,
      });
      setCrmSubmitting(false);
      setCrmError(true);
      leadSubmitAttempted.current = false;
      return;
    }

    try {
      const payload: Record<string, string> = {
        businessName: fields.businessName!,
        contactWhatsapp: fields.contactWhatsapp!,
        sourceBot: clientId,
        sourceUrl: typeof window !== 'undefined' ? window.location.pathname : '/',
      };
      if (fields.businessType) payload.businessType = fields.businessType;
      if (fields.platform) payload.platform = fields.platform;
      if (fields.workingHours) payload.workingHours = fields.workingHours;
      if (fields.services) payload.services = fields.services;

      const res = await fetch('/api/ssb/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setLeadSubmitted(true);
      } else {
        setCrmError(true);
        leadSubmitAttempted.current = false;
      }
    } catch {
      setCrmError(true);
      leadSubmitAttempted.current = false;
    } finally {
      setCrmSubmitting(false);
    }
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
    const waMatch = content.match(WA_LINK_TEXT_RE);
    if (waMatch) {
      const before = content.slice(0, content.indexOf('{{WA_LINK_TEXT:'));
      // If no waNumber is configured for this client, hide the button entirely — never
      // fall back to another business's number.
      if (!waNumber) {
        return <span>{before ? parseMarkdown(before) : null}</span>;
      }
      const rawWaText = waMatch[1].trim();
      const waText = encodeURIComponent(rawWaText);
      const waIcon = (
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true" style={{ flexShrink: 0 }}>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.524 5.845L0 24l6.345-1.5A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.373l-.36-.213-3.727.881.934-3.618-.235-.372A9.818 9.818 0 1112 21.818z"/>
        </svg>
      );
      return (
        <>
          {before && <span>{parseMarkdown(before)}</span>}

          {/* Saving lead to CRM */}
          {crmSubmitting && (
            <div className="crm-submitting">
              <div className="crm-spinner" />
              <span>{lang === 'en' ? 'Saving your details...' : 'جاري حفظ بياناتك...'}</span>
            </div>
          )}

          {/* CRM saved — show WA handoff button */}
          {leadSubmitted && (
            <a href={`https://wa.me/${waNumber}?text=${waText}`} target="_blank" rel="noopener noreferrer" className="wa-btn">
              {waIcon}
              <span className="wa-btn-text">
                <span className="wa-btn-primary">{lang === 'en' ? 'Connect with MDA Team' : 'تواصل مع فريق MDA'}</span>
                <span className="wa-btn-secondary">{lang === 'en' ? 'via WhatsApp' : 'Continue with MDA Team'}</span>
              </span>
            </a>
          )}

          {/* CRM failed — show retry; do not claim success */}
          {crmError && !crmSubmitting && (
            <>
              <p className="crm-error-msg">{lang === 'en' ? 'An error occurred saving your details. Please try again.' : 'حدث خطأ في حفظ بياناتك. يرجى المحاولة مجدداً.'}</p>
              <button
                className="crm-retry-btn"
                onClick={() => {
                  setCrmError(false);
                  leadSubmitAttempted.current = false;
                  submitLeadFromWaText(rawWaText);
                }}
              >
                {lang === 'en' ? '↻ Retry' : '↻ إعادة المحاولة'}
              </button>
            </>
          )}
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
        {langSwitchHref && (
          <a href={langSwitchHref} className="lang-switch-btn" aria-label={lang === 'en' ? 'العربية' : 'English'}>
            {lang === 'en' ? 'AR' : 'EN'}
          </a>
        )}
      </header>

      {/* MESSAGES / WELCOME AREA */}
      <div className="chat-messages">
        {!started ? (
          <div className="welcome-view">
            {/* Hero — poster variant: display reference marketing image directly */}
            {heroStyle === 'poster' && (
              <div className="hero-section poster">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/mda-hero-poster.png"
                  alt={businessName}
                  className="hero-poster-img"
                />
              </div>
            )}

            {/* Hero — original dark variant */}
            {heroStyle !== 'poster' && (heroBg || heroTagline || heroTitle || heroHighlight || heroSubtitle) && (
              <div className="hero-section">
                {heroBg && <div className="hero-bg" style={{ backgroundImage: `url('${heroBg}')` }} />}
                <div className="hero-overlay" />
                <div className="hero-glow" />
                <div className="hero-inner">
                  {/* LEFT — branding */}
                  <div className="hero-left">
                    {logoUrl && (
                      <Image src={logoUrl} alt={businessName} width={96} height={26} className="hero-logo-hero" unoptimized />
                    )}
                    {heroTagline && <div className="hero-tagline">{heroTagline}</div>}
                    {(heroTitle || heroHighlight) && (
                      <h1 className="hero-title">
                        {heroTitle && <span className="hero-line-1">{heroTitle}</span>}
                        {heroHighlight && <span className="hero-line-2">{heroHighlight}</span>}
                      </h1>
                    )}
                    {heroSubtitle && <p className="hero-sub">{heroSubtitle}</p>}
                    {heroFeatures && heroFeatures.length > 0 && (
                      <div className="hero-features">
                        {heroFeatures.map((feat, i) => (
                          <div key={i} className="hero-feat">
                            <div className="hero-feat-icon">
                              {feat.icon === 'bolt' && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                              )}
                              {feat.icon === 'clock' && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                              )}
                              {feat.icon === 'shield' && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                              )}
                            </div>
                            <span>{feat.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* RIGHT — product panel (desktop only) */}
                  <div className="hero-right">
                    <div className="product-panel">
                      <div className="pp-header">
                        <div className="pp-header-left">
                          {logoUrl && (
                            <Image src={logoUrl} alt="" width={60} height={17} className="pp-logo" unoptimized />
                          )}
                          <div>
                            <div className="pp-name">{displayName}</div>
                            <div className="pp-status"><span className="pp-status-dot" />Online</div>
                          </div>
                        </div>
                        <div className="pp-powered">POWERED BY DREXONYX</div>
                      </div>
                      <div className="pp-body">
                        <div className="pp-nav">
                          {categories && categories.slice(0, 5).map((cat, i) => (
                            <div key={i} className={`pp-nav-item${i === 0 ? ' active' : ''}`}>
                              <span className="pp-nav-dot" />
                              {cat.title.split(' ')[0]}
                            </div>
                          ))}
                        </div>
                        <div className="pp-chat">
                          <div className="pp-bot-row">
                            <div className="pp-bot-avatar">
                              {logoUrl && <Image src={logoUrl} alt="" width={19} height={19} unoptimized />}
                            </div>
                            <div className="pp-bot-bubble">{lang === 'en' ? 'Hello! Choose your business type 👋' : 'مرحباً! اختر نوع نشاطك 👋'}</div>
                          </div>
                          {categories && categories.length > 0 && (
                            <div className="pp-cats">
                              {categories.slice(0, 4).map((cat, i) => (
                                <div key={i} className="pp-cat">
                                  <span className="pp-cat-dot" />
                                  {cat.title.split(' ')[0]}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="pp-input-row">
                        <div className="pp-input-placeholder">{lang === 'en' ? 'Type your question...' : 'اكتب سؤالك...'}</div>
                        <div className="pp-send">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
              <div className="sec-privacy">
                <svg className="sec-privacy-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <div className="sec-privacy-text">
                  <span className="sec-privacy-main">{lang === 'en' ? 'Your information is secure & private' : 'معلوماتك آمنة وسرية'}</span>
                  <span className="sec-privacy-sub">{lang === 'en' ? 'Supporting businesses of all sizes in the UAE.' : 'تدعم جميع أحجام الأعمال في الإمارات.'}</span>
                </div>
              </div>
              <div className="sec-features">
                <div className="sec-feature">
                  <svg className="sec-feature-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.42 2 2 0 0 1 3.64 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6.06 6.06l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span className="sec-feature-label">{lang === 'en' ? '24/7 Support' : 'دعم متواصل'}</span>
                </div>
                <div className="sec-feature">
                  <svg className="sec-feature-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span className="sec-feature-label">{lang === 'en' ? 'Fast Setup' : 'سرعة في التنفيذ'}</span>
                </div>
                <div className="sec-feature">
                  <svg className="sec-feature-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span className="sec-feature-label">{lang === 'en' ? 'Custom Solutions' : 'حلول مخصصة'}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg, i) => (
              <div key={i} className={`msg-row ${msg.role}`}>
                {msg.role === 'assistant' && <BotAvatar logoUrl={logoUrl} initials={initials} />}
                <div className={`bubble ${msg.role === 'assistant' ? 'bot' : 'user'}`} dir={msg.role === 'assistant' ? 'auto' : (lang === 'en' ? 'ltr' : 'rtl')}>
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
