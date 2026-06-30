import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  MessageCircle, X, Send, Copy, Check, RotateCcw,
  ChevronDown, Zap, Bot, User, Lock, LogIn
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ─── Markdown Renderer ────────────────────────────────────────────────────────

const renderInline = (text, baseKey = 0) => {
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  let last = 0, match, k = baseKey;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(<span key={k++}>{text.slice(last, match.index)}</span>);
    if (match[2] !== undefined) parts.push(<strong key={k++}>{match[2]}</strong>);
    else if (match[3] !== undefined) parts.push(<em key={k++}>{match[3]}</em>);
    else if (match[4] !== undefined) parts.push(<code key={k++} className="md-code">{match[4]}</code>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(<span key={k++}>{text.slice(last)}</span>);
  return parts.length ? parts : text;
};

const CodeBlock = ({ lang, code }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="md-codeblock">
      <div className="md-codeblock-header">
        <span className="md-codeblock-lang">{lang || 'code'}</span>
        <button className="md-codeblock-copy" onClick={copy}>
          {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
};

const MarkdownMessage = ({ content }) => {
  const blocks = [];
  const segments = content.split(/(```[\s\S]*?```)/g);
  segments.forEach((seg, si) => {
    if (seg.startsWith('```')) {
      const inner = seg.slice(3);
      const nl = inner.indexOf('\n');
      const lang = nl !== -1 ? inner.slice(0, nl).trim() : '';
      const code = nl !== -1 ? inner.slice(nl + 1).replace(/```$/, '').trimEnd() : inner.replace(/```$/, '').trimEnd();
      blocks.push(<CodeBlock key={`cb-${si}`} lang={lang} code={code} />);
      return;
    }
    const lines = seg.split('\n');
    let i = 0;
    while (i < lines.length) {
      const line = lines[i], trim = line.trim();
      if (/^---+$/.test(trim)) { blocks.push(<hr key={`hr-${si}-${i}`} className="md-hr" />); i++; continue; }
      if (trim.startsWith('### ')) { blocks.push(<h4 key={`h3-${si}-${i}`} className="md-h3">{renderInline(trim.slice(4), i*100)}</h4>); i++; continue; }
      if (trim.startsWith('## ')) { blocks.push(<h3 key={`h2-${si}-${i}`} className="md-h2">{renderInline(trim.slice(3), i*100)}</h3>); i++; continue; }
      if (trim.startsWith('# ')) { blocks.push(<h2 key={`h1-${si}-${i}`} className="md-h1">{renderInline(trim.slice(2), i*100)}</h2>); i++; continue; }
      if (/^[-*]\s/.test(trim)) {
        const items = [];
        while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) { items.push(lines[i].trim().slice(2)); i++; }
        blocks.push(<ul key={`ul-${si}-${i}`} className="md-ul">{items.map((it, j) => <li key={j}>{renderInline(it, j*50)}</li>)}</ul>);
        continue;
      }
      if (/^\d+\.\s/.test(trim)) {
        const items = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+\.\s/, '')); i++; }
        blocks.push(<ol key={`ol-${si}-${i}`} className="md-ol">{items.map((it, j) => <li key={j}>{renderInline(it, j*50)}</li>)}</ol>);
        continue;
      }
      if (!trim) { blocks.push(<div key={`sp-${si}-${i}`} className="md-spacer" />); i++; continue; }
      blocks.push(<p key={`p-${si}-${i}`} className="md-p">{renderInline(trim, i*100)}</p>);
      i++;
    }
  });
  return <div className="markdown-body">{blocks}</div>;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { emoji: '📋', label: 'Review Resume', prompt: 'Please review my resume thoroughly. Point out specific ATS issues, weak bullet points, and missing keywords with exact rewrites.' },
  { emoji: '🎯', label: 'Fix for ATS', prompt: 'Optimize my resume specifically for ATS. Give me exact keywords I\'m missing and specific rewrites for my bullet points to improve my score.' },
  { emoji: '💼', label: 'Interview Prep', prompt: 'Based on my resume and job matches, generate 10 interview questions — behavioral, technical, and situational — with ideal answer frameworks using STAR method.' },
  { emoji: '💻', label: 'Coding Help', prompt: 'Help me with coding interview questions. Start with common DSA problems relevant to my role. Walk through approach, time/space complexity, and working solution.' },
  { emoji: '✉️', label: 'Cover Letter', prompt: 'Write a compelling, personalized, ATS-friendly cover letter for the top matched job using my resume.' },
  { emoji: '🔍', label: 'Job Strategy', prompt: 'Based on my resume and current job matches, what is my best application strategy? Which jobs should I prioritize and why?' },
  { emoji: '💰', label: 'Salary Guide', prompt: 'Based on my skills and target role, what salary should I expect and how do I negotiate effectively?' },
  { emoji: '🚀', label: 'Skill Gaps', prompt: 'What are the most critical skills I\'m missing for my target role? Create a 30-day learning plan to close these gaps.' },
];

const FREE_LIMIT = 3; // messages before prompting sign-up

const welcomeMsg = (user, atsScore, jobCount) => {
  if (user) {
    return `👋 Welcome back, **${user.name}**!\n\n` +
      (atsScore != null
        ? `Your resume has an ATS score of **${atsScore}/100** and **${jobCount || 0} job matches** ready.\n\n`
        : '') +
      `**What can I help you with today?**\n- 📋 Resume review & ATS optimization\n- 💼 Interview prep & mock questions\n- 💻 Coding test assistance\n- ✉️ Cover letters\n- 🔍 Job search strategy`;
  }
  return `👋 Hi! I'm **SRI**, your AI career assistant.\n\nI can help you find jobs, improve your resume, prep for interviews, and more.\n\n**Try asking me:**\n- "Review my resume"\n- "What jobs suit me?"\n- "Give me interview tips"\n\n🔒 **Sign in** for personalized advice with full resume analysis & unlimited chat.`;
};

// ─── Main Chatbot Component ───────────────────────────────────────────────────

const ChatbotInner = ({ resumeText, atsScore, jobs, user, onSignIn }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: welcomeMsg(user, atsScore, jobs?.length) }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [showActions, setShowActions] = useState(true);
  const [userMsgCount, setUserMsgCount] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const prevUserRef = useRef(user?.id);

  useEffect(() => {
    if (user?.id !== prevUserRef.current) {
      prevUserRef.current = user?.id;
      setMessages([{ role: 'assistant', content: welcomeMsg(user, atsScore, jobs?.length) }]);
      setUserMsgCount(0);
      setShowActions(true);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) inputRef.current?.focus();
  }, [isOpen, isMinimized]);

  const appendSignUpNudge = () => ({
    role: 'assistant',
    content: `🔒 **Want more personalized help?**\n\nSign in to unlock:\n- Full resume analysis with your uploaded resume\n- Personalized interview questions for your target role\n- Unlimited conversations\n- ATS score tracking\n\n[**Sign In**](#signin) or [**Create Account**](#signup) — it's free!`,
    isNudge: true,
  });

  const sendMessage = useCallback(async (text) => {
    const userText = (text || input).trim();
    if (!userText || isLoading) return;

    setInput('');
    setShowActions(false);

    const newCount = userMsgCount + 1;
    setUserMsgCount(newCount);

    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setIsLoading(true);

    const jobsContext = jobs?.slice(0, 8)
      .map(j => `• ${j.title} @ ${j.company} (${j.location || 'Remote'}) — ${Math.round((j.match_score || 0) * 100)}% match`)
      .join('\n') || '';

    try {
      const token = localStorage.getItem('sri_token');
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          resume_text: user ? (resumeText || '') : '',
          ats_score: user ? (atsScore ?? null) : null,
          jobs_context: user ? jobsContext : '',
          is_guest: !user,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const updated = [...newMessages, { role: 'assistant', content: data.reply }];
      setMessages(updated);

      // After FREE_LIMIT messages for guests, show nudge
      if (!user && newCount === FREE_LIMIT) {
        setTimeout(() => setMessages(prev => [...prev, appendSignUpNudge()]), 600);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ **Connection error.** Make sure the backend is running.\n\nError: \`${err.message}\`` }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, resumeText, atsScore, jobs, user, userMsgCount]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const copyMessage = (content, idx) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: welcomeMsg(user, atsScore, jobs?.length) }]);
    setShowActions(true);
    setUserMsgCount(0);
  };

  const isInputDisabled = !user && userMsgCount >= FREE_LIMIT + 1;

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div className={`sri-panel ${isMinimized ? 'sri-minimized' : ''}`}>
          {/* Header */}
          <div className="sri-header" onClick={() => isMinimized && setIsMinimized(false)}>
            <div className="sri-header-left">
              <div className="sri-avatar">
                <Bot size={16} />
                <span className="sri-status-dot" />
              </div>
              <div>
                <div className="sri-name">SRI <span className="sri-badge">AI</span></div>
                <div className="sri-sub"><Zap size={9} /> Groq · Llama 3.3 · Ultra-fast</div>
              </div>
            </div>
            <div className="sri-header-actions" onClick={e => e.stopPropagation()}>
              <button className="sri-icon-btn" onClick={clearChat} title="Clear chat"><RotateCcw size={14} /></button>
              <button className="sri-icon-btn" onClick={() => setIsMinimized(v => !v)} title={isMinimized ? 'Expand' : 'Minimize'}>
                <ChevronDown size={15} style={{ transform: isMinimized ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              <button className="sri-icon-btn sri-close-btn" onClick={() => setIsOpen(false)} title="Close"><X size={15} /></button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Guest banner */}
              {!user && (
                <div className="sri-guest-banner">
                  <Lock size={12} />
                  <span>Sign in for personalized, unlimited advice</span>
                  <button onClick={onSignIn} className="sri-banner-btn"><LogIn size={11} /> Sign In</button>
                </div>
              )}

              {/* Quick actions */}
              {showActions && (
                <div className="sri-quick-bar">
                  <div className="sri-quick-scroll">
                    {QUICK_ACTIONS.map(a => (
                      <button key={a.label} className="sri-chip" onClick={() => sendMessage(a.prompt)} disabled={isLoading || isInputDisabled}>
                        {a.emoji} {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="sri-messages">
                {messages.map((msg, i) => (
                  <div key={i} className={`sri-msg-row ${msg.role}`}>
                    {msg.role === 'assistant' && <div className="sri-msg-bot-av"><Bot size={13} /></div>}
                    <div className={`sri-bubble ${msg.role} ${msg.isNudge ? 'nudge-bubble' : ''}`}>
                      {msg.isNudge ? (
                        <div className="nudge-content">
                          <MarkdownMessage content={msg.content} />
                          <div className="nudge-actions">
                            <button onClick={onSignIn} className="nudge-btn nudge-primary"><LogIn size={13} /> Sign In</button>
                            <button onClick={() => onSignIn('signup')} className="nudge-btn nudge-secondary">Create Account</button>
                          </div>
                        </div>
                      ) : (
                        <MarkdownMessage content={msg.content} />
                      )}
                      {msg.role === 'assistant' && !msg.isNudge && (
                        <button className="sri-copy-btn" onClick={() => copyMessage(msg.content, i)} title="Copy">
                          {copiedIdx === i ? <Check size={10} /> : <Copy size={10} />}
                        </button>
                      )}
                    </div>
                    {msg.role === 'user' && <div className="sri-msg-user-av"><User size={13} /></div>}
                  </div>
                ))}
                {isLoading && (
                  <div className="sri-msg-row assistant">
                    <div className="sri-msg-bot-av"><Bot size={13} /></div>
                    <div className="sri-bubble assistant sri-typing">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {isInputDisabled ? (
                <div className="sri-locked-input">
                  <Lock size={16} />
                  <span>Sign in to continue chatting</span>
                  <button onClick={onSignIn} className="sri-login-btn"><LogIn size={14} /> Sign In</button>
                </div>
              ) : (
                <>
                  <div className="sri-input-row">
                    <textarea
                      ref={inputRef}
                      className="sri-input"
                      placeholder={user ? "Ask about resume, jobs, interview prep, coding…" : "Ask me anything career-related…"}
                      value={input}
                      onChange={e => {
                        setInput(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px';
                      }}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      disabled={isLoading}
                    />
                    <button className="sri-send" onClick={() => sendMessage()} disabled={!input.trim() || isLoading} title="Send">
                      <Send size={15} />
                    </button>
                  </div>
                  <p className="sri-hint">Enter to send · Shift+Enter for new line{!user ? ` · ${Math.max(0, FREE_LIMIT - userMsgCount)} free messages left` : ''}</p>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        className={`sri-fab ${isOpen ? 'sri-fab-open' : ''}`}
        onClick={() => { setIsOpen(v => !v); setIsMinimized(false); }}
        aria-label="Open SRI Career Assistant"
      >
        <div className="sri-fab-icon">{isOpen ? <X size={21} /> : <MessageCircle size={21} />}</div>
        {!isOpen && <span className="sri-fab-text">Ask SRI</span>}
      </button>
    </>
  );
};

// Render via portal so position:fixed always works regardless of parent transforms
const Chatbot = (props) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return ReactDOM.createPortal(<ChatbotInner {...props} />, document.body);
};

export default Chatbot;
