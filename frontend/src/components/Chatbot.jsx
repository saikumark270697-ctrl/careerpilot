import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle, X, Send, Copy, Check, RotateCcw,
  ChevronDown, Zap, Bot, User
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Markdown Renderer ────────────────────────────────────────────────────────

const renderInline = (text, baseKey = 0) => {
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  let last = 0;
  let match;
  let k = baseKey;

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
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="md-codeblock">
      <div className="md-codeblock-header">
        <span className="md-codeblock-lang">{lang || 'code'}</span>
        <button className="md-codeblock-copy" onClick={copy}>
          {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
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
      const newline = inner.indexOf('\n');
      const lang = newline !== -1 ? inner.slice(0, newline).trim() : '';
      const code = newline !== -1 ? inner.slice(newline + 1).replace(/```$/, '').trimEnd() : inner.replace(/```$/, '').trimEnd();
      blocks.push(<CodeBlock key={`cb-${si}`} lang={lang} code={code} />);
      return;
    }

    const lines = seg.split('\n');
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trim = line.trim();

      // Horizontal rule
      if (/^---+$/.test(trim)) {
        blocks.push(<hr key={`hr-${si}-${i}`} className="md-hr" />);
        i++; continue;
      }

      // Headers
      if (trim.startsWith('### ')) {
        blocks.push(<h4 key={`h3-${si}-${i}`} className="md-h3">{renderInline(trim.slice(4), i * 100)}</h4>);
        i++; continue;
      }
      if (trim.startsWith('## ')) {
        blocks.push(<h3 key={`h2-${si}-${i}`} className="md-h2">{renderInline(trim.slice(3), i * 100)}</h3>);
        i++; continue;
      }
      if (trim.startsWith('# ')) {
        blocks.push(<h2 key={`h1-${si}-${i}`} className="md-h1">{renderInline(trim.slice(2), i * 100)}</h2>);
        i++; continue;
      }

      // Unordered list
      if (/^[-*]\s/.test(trim)) {
        const items = [];
        while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
          items.push(lines[i].trim().slice(2));
          i++;
        }
        blocks.push(
          <ul key={`ul-${si}-${i}`} className="md-ul">
            {items.map((it, j) => <li key={j}>{renderInline(it, j * 50)}</li>)}
          </ul>
        );
        continue;
      }

      // Ordered list
      if (/^\d+\.\s/.test(trim)) {
        const items = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^\d+\.\s/, ''));
          i++;
        }
        blocks.push(
          <ol key={`ol-${si}-${i}`} className="md-ol">
            {items.map((it, j) => <li key={j}>{renderInline(it, j * 50)}</li>)}
          </ol>
        );
        continue;
      }

      // Empty line = spacing
      if (!trim) {
        blocks.push(<div key={`sp-${si}-${i}`} className="md-spacer" />);
        i++; continue;
      }

      // Regular paragraph
      blocks.push(<p key={`p-${si}-${i}`} className="md-p">{renderInline(trim, i * 100)}</p>);
      i++;
    }
  });

  return <div className="markdown-body">{blocks}</div>;
};

// ─── Quick Action Config ──────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { emoji: '📋', label: 'Review Resume', prompt: 'Please review my resume thoroughly. Point out specific issues with formatting, missing keywords, weak bullet points, and what I must fix to improve my ATS score.' },
  { emoji: '🎯', label: 'Fix for ATS', prompt: 'How do I optimize my resume specifically for ATS? Give me the exact keywords I\'m missing and specific rewrites for my bullet points.' },
  { emoji: '💼', label: 'Interview Prep', prompt: 'Based on my resume and job matches, generate 10 interview questions I\'m likely to face — split into behavioral, technical, and situational. Include ideal answer frameworks.' },
  { emoji: '💻', label: 'Coding Help', prompt: 'I need help with coding interview questions. Start with common data structures and algorithms problems relevant to my role. Walk me through the approach, complexity, and solution.' },
  { emoji: '✉️', label: 'Cover Letter', prompt: 'Write a compelling, personalized cover letter for the top matched job using my resume. Make it ATS-friendly and human-readable.' },
  { emoji: '🔍', label: 'Job Strategy', prompt: 'Based on my resume, ATS score, and current job matches, what is my best job application strategy? Which jobs should I prioritize and why?' },
  { emoji: '💰', label: 'Salary Guide', prompt: 'Based on my skills and target role, what salary should I expect? How do I negotiate effectively?' },
  { emoji: '🚀', label: 'Skill Gaps', prompt: 'What are the most important skills I am missing for my target role? Create a 30-day learning plan to close these gaps.' },
];

// ─── Main Chatbot Component ───────────────────────────────────────────────────

const WELCOME_MESSAGE = (atsScore, jobCount) =>
  `👋 Hi! I'm **CareerBot**, your AI-powered career assistant.\n\n` +
  (atsScore != null
    ? `I can see your resume has an ATS score of **${atsScore}/100** and you have **${jobCount || 0} job matches**.\n\n`
    : `Upload your resume first to unlock personalized advice, or ask me anything career-related.\n\n`) +
  `**I can help you with:**\n- 📋 Resume review & ATS optimization\n- 💼 Interview prep & mock questions\n- 💻 Coding test assistance\n- ✉️ Cover letter writing\n- 🔍 Job search strategy\n\nWhat would you like to work on?`;

const Chatbot = ({ resumeText, atsScore, jobs }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState(() => [
    { role: 'assistant', content: WELCOME_MESSAGE(atsScore, jobs?.length) },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [showActions, setShowActions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const prevAtsScore = useRef(atsScore);
  const prevJobCount = useRef(jobs?.length);

  // Auto-update welcome message when resume is uploaded
  useEffect(() => {
    if (atsScore !== prevAtsScore.current || jobs?.length !== prevJobCount.current) {
      prevAtsScore.current = atsScore;
      prevJobCount.current = jobs?.length;
      if (atsScore != null && messages.length === 1) {
        setMessages([{ role: 'assistant', content: WELCOME_MESSAGE(atsScore, jobs?.length) }]);
      }
    }
  }, [atsScore, jobs?.length]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const sendMessage = useCallback(async (text) => {
    const userText = (text || input).trim();
    if (!userText || isLoading) return;

    setInput('');
    setShowActions(false);
    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setIsLoading(true);

    const jobsContext = jobs?.slice(0, 8)
      .map(j => `• ${j.title} @ ${j.company} (${j.location || 'Remote'}) — ${Math.round((j.match_score || 0) * 100)}% match`)
      .join('\n') || '';

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          resume_text: resumeText || '',
          ats_score: atsScore ?? null,
          jobs_context: jobsContext,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `❌ **Connection error.** Make sure the backend is running on port 8000.\n\nError: \`${err.message}\`` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, resumeText, atsScore, jobs]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyMessage = (content, idx) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: WELCOME_MESSAGE(atsScore, jobs?.length) }]);
    setShowActions(true);
  };

  const unreadCount = isOpen ? 0 : messages.filter(m => m.role === 'assistant').length - 1;

  return (
    <>
      {/* ── Chat Panel ── */}
      {isOpen && (
        <div className={`chatbot-panel ${isMinimized ? 'minimized' : ''}`}>

          {/* Header */}
          <div className="chat-header" onClick={() => isMinimized && setIsMinimized(false)}>
            <div className="chat-header-left">
              <div className="chat-bot-avatar">
                <Bot size={18} />
                <span className="chat-bot-dot" />
              </div>
              <div className="chat-header-info">
                <span className="chat-header-name">CareerBot</span>
                <span className="chat-header-sub">
                  <Zap size={10} /> Groq · Llama 3.3 · Ultra-fast
                </span>
              </div>
            </div>
            <div className="chat-header-actions" onClick={e => e.stopPropagation()}>
              <button className="chat-icon-btn" onClick={clearChat} title="Clear chat">
                <RotateCcw size={15} />
              </button>
              <button className="chat-icon-btn" onClick={() => setIsMinimized(v => !v)} title={isMinimized ? 'Expand' : 'Minimize'}>
                <ChevronDown size={16} style={{ transform: isMinimized ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              <button className="chat-icon-btn chat-close-btn" onClick={() => setIsOpen(false)} title="Close">
                <X size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Quick Actions */}
              {showActions && (
                <div className="quick-actions-bar">
                  <div className="quick-actions-scroll">
                    {QUICK_ACTIONS.map(a => (
                      <button
                        key={a.label}
                        className="qa-chip"
                        onClick={() => sendMessage(a.prompt)}
                        disabled={isLoading}
                      >
                        <span>{a.emoji}</span> {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="chat-messages-area">
                {messages.map((msg, i) => (
                  <div key={i} className={`chat-msg-row ${msg.role}`}>
                    {msg.role === 'assistant' && (
                      <div className="msg-avatar-bot"><Bot size={14} /></div>
                    )}
                    <div className={`msg-bubble ${msg.role}`}>
                      <MarkdownMessage content={msg.content} />
                      {msg.role === 'assistant' && (
                        <button
                          className="msg-copy"
                          onClick={() => copyMessage(msg.content, i)}
                          title="Copy response"
                        >
                          {copiedIdx === i ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="msg-avatar-user"><User size={14} /></div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="chat-msg-row assistant">
                    <div className="msg-avatar-bot"><Bot size={14} /></div>
                    <div className="msg-bubble assistant typing-bubble">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="chat-input-row">
                <textarea
                  ref={inputRef}
                  className="chat-textarea"
                  placeholder="Ask about resume, interview prep, coding, jobs…"
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={isLoading}
                />
                <button
                  className="chat-send-btn"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  title="Send (Enter)"
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="chat-hint-text">Enter to send · Shift+Enter for new line</p>
            </>
          )}
        </div>
      )}

      {/* ── Floating Trigger Button ── */}
      <button
        className={`chatbot-fab ${isOpen ? 'fab-open' : ''}`}
        onClick={() => { setIsOpen(v => !v); setIsMinimized(false); }}
        title="Career AI Assistant"
        aria-label="Open Career Assistant"
      >
        <div className="fab-icon">
          {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
        </div>
        {!isOpen && <span className="fab-label">Career AI</span>}
        {!isOpen && unreadCount > 0 && (
          <span className="fab-badge">{unreadCount}</span>
        )}
      </button>
    </>
  );
};

export default Chatbot;
