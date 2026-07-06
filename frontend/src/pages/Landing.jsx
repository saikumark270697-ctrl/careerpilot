import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Zap, Rocket, UploadCloud, Target, Briefcase, Bot, MapPin, Shield,
  CheckCircle2, ChevronDown, ArrowRight, Sparkles, FileText, Send,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: <Target size={20} />, title: 'ATS Score & Feedback', desc: 'Instant compatibility score with concrete, line-level fixes — know exactly why your resume gets filtered out.' },
  { icon: <Briefcase size={20} />, title: 'Live Job Matches', desc: 'Real openings pulled from LinkedIn, Naukri, Indeed and 50+ boards the moment you analyze — no stale listings.' },
  { icon: <Send size={20} />, title: 'AI Auto-Apply', desc: 'One click and the AI fills the application for you. You stay in control of what gets submitted.' },
  { icon: <Bot size={20} />, title: 'SRI — Career Chatbot', desc: 'Interview prep, cover letters, salary negotiation — an assistant that has actually read your resume.' },
  { icon: <MapPin size={20} />, title: 'Multi-Location Search', desc: 'Search Remote + Hyderabad + USA in one pass. Tag as many locations as your search needs.' },
  { icon: <Shield size={20} />, title: 'Private by Default', desc: 'Your resume is processed in-memory and never sold or shared. Delete your data anytime.' },
];

const COMPARISON = [
  { feature: 'ATS resume score', us: true, checkers: true, appliers: false, trackers: true },
  { feature: 'Live job matching', us: true, checkers: false, appliers: true, trackers: true },
  { feature: 'AI auto-apply', us: true, checkers: false, appliers: true, trackers: false },
  { feature: 'AI career chatbot', us: true, checkers: false, appliers: false, trackers: false },
  { feature: 'All-in-one workflow', us: true, checkers: false, appliers: false, trackers: false },
  { feature: 'Free to start', us: true, checkers: true, appliers: false, trackers: true },
];

const FAQ_TEASER = [
  { q: 'Is RoleFlight really free?', a: 'Yes — upload your resume, get your ATS score, and browse live job matches completely free. No credit card required to start.' },
  { q: 'How does the ATS score work?', a: 'We analyze your resume the way applicant tracking systems do — keywords, structure, and formatting — then score it against your target role and tell you exactly what to fix.' },
  { q: 'Does auto-apply spam job boards?', a: 'No. You choose each job you want to apply to; the AI just does the tedious form-filling. Quality applications, not spray-and-pray.' },
];

const Check = ({ yes }) => yes
  ? <CheckCircle2 size={17} className="cmp-yes" aria-label="Yes" />
  : <span className="cmp-no" aria-label="No">—</span>;

const Landing = () => {
  const { user, loading } = useAuth();
  const [openFaq, setOpenFaq] = useState(0);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="animate-fade-in">
      {/* ── Hero ─────────────────────────────────────── */}
      <div className="hero-section">
        <div className="hero-badge">
          <Zap size={12} /> AI-powered job search · Groq + Llama 3.3
        </div>
        <h1 className="heading-1">
          Land interviews, <span className="hero-grad">not rejections</span>
        </h1>
        <p className="hero-subtitle">
          Upload your resume once. Get your ATS score, live job matches from 50+ boards,
          AI auto-apply, and a career assistant that guides every step — all in one place.
        </p>
        <div className="hero-cta-row">
          <Link to="/signup" className="hero-cta-primary">
            <UploadCloud size={16} /> Analyze my resume — free
          </Link>
          <a href="#how-it-works" className="hero-cta-secondary">
            See how it works →
          </a>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><span className="hero-stat-n">50K+</span><span className="hero-stat-label">Jobs Daily</span></div>
          <div className="hero-stat"><span className="hero-stat-n">50+</span><span className="hero-stat-label">Job Boards</span></div>
          <div className="hero-stat"><span className="hero-stat-n">1-Click</span><span className="hero-stat-label">Auto-Apply</span></div>
          <div className="hero-stat"><span className="hero-stat-n">Free</span><span className="hero-stat-label">To Start</span></div>
        </div>

        {/* Product preview mock */}
        <div className="hero-preview">
          <div className="preview-window">
            <div className="preview-titlebar">
              <span className="preview-dot" /><span className="preview-dot" /><span className="preview-dot" />
              <span className="preview-url">roleflight — dashboard</span>
            </div>
            <div className="preview-body">
              <div className="preview-score">
                <div className="preview-ring">
                  <svg viewBox="0 0 100 100" aria-hidden="true">
                    <circle cx="50" cy="50" r="42" className="preview-ring-track" />
                    <circle cx="50" cy="50" r="42" className="preview-ring-fill" />
                  </svg>
                  <span className="preview-ring-label">86%</span>
                </div>
                <div>
                  <div className="preview-score-title">ATS Compatibility</div>
                  <div className="preview-score-sub">Strong match for Frontend Engineer</div>
                  <div className="preview-tips">
                    <span className="preview-tip"><Sparkles size={11} /> Add “React 18” keyword</span>
                    <span className="preview-tip"><Sparkles size={11} /> Quantify impact in 2 bullets</span>
                  </div>
                </div>
              </div>
              <div className="preview-jobs">
                {[
                  { t: 'Senior Frontend Engineer', c: 'TechCorp · Remote', m: '94%' },
                  { t: 'React Developer', c: 'Finlabs · Hyderabad', m: '89%' },
                  { t: 'Full-Stack Engineer', c: 'CloudBase · Bangalore', m: '85%' },
                ].map(j => (
                  <div key={j.t} className="preview-job">
                    <div>
                      <div className="preview-job-t">{j.t}</div>
                      <div className="preview-job-c">{j.c}</div>
                    </div>
                    <span className="preview-match">{j.m}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Features ─────────────────────────────────── */}
      <div className="landing-section">
        <div className="section-head">
          <div className="section-tag"><Sparkles size={12} /> Everything in one place</div>
          <h2 className="section-title">One profile. The whole job search.</h2>
          <p className="section-sub">Competitors sell these as four separate subscriptions. You get the full pipeline in one free tool.</p>
        </div>
        <div className="landing-features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="lf-card">
              <div className="lf-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ─────────────────────────────── */}
      <div className="how-section" id="how-it-works">
        <div className="section-tag"><Zap size={12} /> Three steps</div>
        <h2 className="section-title">From resume to interview</h2>
        <p className="section-sub">No 40-field forms. No manual job hunting. Upload and go.</p>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">01</div>
            <span className="step-emoji">📄</span>
            <h3>Upload your resume</h3>
            <p>PDF, DOCX, or plain text. The AI extracts your skills, experience, and achievements in seconds.</p>
          </div>
          <div className="step-card">
            <div className="step-num">02</div>
            <span className="step-emoji">🧠</span>
            <h3>Get scored & matched</h3>
            <p>See your ATS compatibility score with actionable fixes, plus live job matches ranked by fit — not by ad spend.</p>
          </div>
          <div className="step-card">
            <div className="step-num">03</div>
            <span className="step-emoji">🚀</span>
            <h3>Apply with AI</h3>
            <p>Auto-apply to the jobs you pick, prep interviews with SRI, and walk in knowing you're the strongest match.</p>
          </div>
        </div>
      </div>

      {/* ── Comparison ───────────────────────────────── */}
      <div className="landing-section">
        <div className="section-head">
          <div className="section-tag"><Target size={12} /> Why RoleFlight</div>
          <h2 className="section-title">Point tools solve half the problem</h2>
          <p className="section-sub">Resume checkers don't find you jobs. Auto-appliers don't fix your resume. We do the whole pipeline.</p>
        </div>
        <div className="cmp-scroll">
          <table className="cmp-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th className="cmp-us-col"><Rocket size={13} /> RoleFlight</th>
                <th>Resume checkers</th>
                <th>Auto-apply bots</th>
                <th>Job trackers</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(row => (
                <tr key={row.feature}>
                  <td>{row.feature}</td>
                  <td className="cmp-us-col"><Check yes={row.us} /></td>
                  <td><Check yes={row.checkers} /></td>
                  <td><Check yes={row.appliers} /></td>
                  <td><Check yes={row.trackers} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="cmp-note">Typical capabilities of single-purpose tools in each category, July 2026.</p>
      </div>

      {/* ── FAQ teaser ───────────────────────────────── */}
      <div className="landing-section">
        <div className="section-head">
          <div className="section-tag"><FileText size={12} /> Good questions</div>
          <h2 className="section-title">Before you ask</h2>
        </div>
        <div className="faq-list landing-faq">
          {FAQ_TEASER.map((item, i) => (
            <div key={item.q} className={`faq-item ${openFaq === i ? 'faq-open' : ''}`}>
              <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                <span className="faq-q-text">{item.q}</span>
                <ChevronDown size={17} className="faq-chevron" />
              </button>
              {openFaq === i && (
                <div className="faq-answer landing-faq-answer">
                  <p>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="landing-faq-more">
          <Link to="/faq" className="faq-more-link">All questions answered <ArrowRight size={14} /></Link>
        </div>
      </div>

      {/* ── Final CTA ────────────────────────────────── */}
      <div className="cta-section">
        <h2 className="cta-title">Your next role is already posted.</h2>
        <p className="cta-sub">
          It's on one of the 50+ boards we search. Upload your resume and find it in the next two minutes — free.
        </p>
        <div className="cta-btns">
          <Link to="/signup" className="cta-btn-primary">
            <Rocket size={16} /> Get started free
          </Link>
          <Link to="/login" className="cta-btn-outline">
            I have an account →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Landing;
