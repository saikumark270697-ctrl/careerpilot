import React, { useState, useRef } from 'react';
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { UploadCloud, Search, MapPin, Briefcase, ExternalLink, AlertCircle, CheckCircle2, X as XIcon, Plus, Rocket, Zap, Bot, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Chatbot from '../components/Chatbot';
import { useAuth } from '../context/AuthContext';

const LOCATION_PRESETS = [
  'Remote', 'Hyderabad', 'Bangalore', 'Delhi', 'Mumbai',
  'Chennai', 'Pune', 'Kolkata', 'Noida', 'Gurgaon',
  'USA', 'UK', 'Canada', 'Singapore', 'Australia',
];

const LocationPicker = ({ locations, onChange }) => {
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef(null);

  const add = (loc) => {
    const clean = loc.trim();
    if (clean && !locations.includes(clean)) onChange([...locations, clean]);
    setInputVal('');
    inputRef.current?.focus();
  };

  const remove = (loc) => onChange(locations.filter(l => l !== loc));

  const handleKey = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && inputVal.trim()) {
      e.preventDefault();
      add(inputVal);
    } else if (e.key === 'Backspace' && !inputVal && locations.length) {
      remove(locations[locations.length - 1]);
    }
  };

  const suggestions = LOCATION_PRESETS.filter(
    p => !locations.includes(p) && p.toLowerCase().includes(inputVal.toLowerCase())
  );

  return (
    <div className="loc-picker">
      <div className="loc-tags-wrap" onClick={() => inputRef.current?.focus()}>
        <MapPin size={16} className="loc-icon" />
        {locations.map(loc => (
          <span key={loc} className="loc-tag">
            {loc}
            <button className="loc-tag-remove" onClick={e => { e.stopPropagation(); remove(loc); }}><XIcon size={11} /></button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="loc-tag-input"
          placeholder={locations.length === 0 ? 'Add locations…' : ''}
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKey}
        />
      </div>
      <div className="loc-presets">
        {suggestions.slice(0, 8).map(p => (
          <button key={p} className="loc-preset-chip" onClick={() => add(p)}>
            <Plus size={10} /> {p}
          </button>
        ))}
      </div>
    </div>
  );
};

const API_BASE = import.meta.env.VITE_API_URL || '';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const uploadRef = useRef(null);
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [locations, setLocations] = useState(['Remote']);
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [atsScore, setAtsScore] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [applyingJobs, setApplyingJobs] = useState({});
  const [appliedJobs, setAppliedJobs] = useState({});

  const timeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    let interval = seconds / 31536000;
    if (interval >= 1) return Math.floor(interval) + 'y ago';
    interval = seconds / 2592000;
    if (interval >= 1) return Math.floor(interval) + 'mo ago';
    interval = seconds / 86400;
    if (interval >= 1) return Math.floor(interval) + 'd ago';
    interval = seconds / 3600;
    if (interval >= 1) return Math.floor(interval) + 'h ago';
    interval = seconds / 60;
    if (interval >= 1) return Math.floor(interval) + 'm ago';
    return 'just now';
  };

  const handleAutoApply = async (jobId, jobUrl) => {
    if (!jobUrl || !resumeText) return;
    setApplyingJobs(prev => ({ ...prev, [jobId]: true }));
    try {
      const response = await fetch(`${API_BASE}/api/match/auto-apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_url: jobUrl, resume_text: resumeText }),
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setAppliedJobs(prev => ({ ...prev, [jobId]: data.message?.includes('manual') ? 'manual' : 'success' }));
      } else {
        setAppliedJobs(prev => ({ ...prev, [jobId]: 'manual' }));
      }
    } catch {
      setAppliedJobs(prev => ({ ...prev, [jobId]: 'manual' }));
    } finally {
      setApplyingJobs(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessing(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${API_BASE}/api/resume/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (response.ok) setResumeText(data.text);
      else alert(data.detail || 'Failed to process file');
    } catch {
      alert('Error uploading file. Make sure the backend is running.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyze = async () => {
    setIsProcessing(true);
    setError('');
    setJobs([]);
    setAtsScore(null);
    setFeedback([]);
    try {
      const response = await fetch(`${API_BASE}/api/match/find`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_text: resumeText, target_role: targetRole, location: locations.join(', ') || 'Remote' }),
      });
      const data = await response.json();
      if (response.ok) {
        setJobs(data.jobs.map((job, index) => ({ ...job, id: job.id ?? index })));
        setSearchQuery(data.search_query);
        setAtsScore(data.ats_score);
        setFeedback(data.feedback);
      } else {
        setError(data.detail || 'Failed to find job matches.');
      }
    } catch {
      setError('Could not reach the backend. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <Chatbot
        resumeText={resumeText}
        atsScore={atsScore}
        jobs={jobs}
        user={user}
        onSignIn={(mode) => navigate(mode === 'signup' ? '/signup' : '/login')}
      />

      {/* ── Hero ─────────────────────────────────────── */}
      <div className="hero-section">
        <div className="hero-badge">
          <Zap size={12} /> Powered by Groq · Llama 3.3 · Ultra-fast AI
        </div>
        <h1 className="heading-1">
          Your <span className="hero-grad">Career Copilot</span>
        </h1>
        <p className="hero-subtitle">
          Upload your resume, get your ATS score, find live job matches, and let{' '}
          <strong>SRI</strong> — your AI career assistant — guide you to your next role.
        </p>
        <div className="hero-cta-row">
          <button
            className="hero-cta-primary"
            onClick={() => uploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <UploadCloud size={16} /> Analyze My Resume
          </button>
          <Link to="/faq" className="hero-cta-secondary">
            How it works →
          </Link>
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-n">50K+</span>
            <span className="hero-stat-label">Jobs Daily</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-n">ATS</span>
            <span className="hero-stat-label">Optimized</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-n">AI</span>
            <span className="hero-stat-label">Powered</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-n">Free</span>
            <span className="hero-stat-label">To Start</span>
          </div>
        </div>
      </div>

      {/* ── Main Grid ─────────────────────────────────── */}
      <div className="dashboard-grid" ref={uploadRef}>
        {/* Left: Inputs & Score */}
        <div className="panel-stack">
          <div className="card glass-panel">
            <h2 className="heading-2"><UploadCloud className="title-icon" size={22} /> Resume & Preferences</h2>

            <div className="form-field">
              <label className="body-text-bold">Target Role (Optional)</label>
              <div className="input-shell">
                <Briefcase size={16} />
                <input
                  type="text"
                  className="glass-input"
                  placeholder="e.g. Frontend Engineer"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                />
              </div>
            </div>

            <div className="form-field">
              <label className="body-text-bold">
                Locations <span style={{ color: 'var(--t3)', fontWeight: 400, fontSize: '0.78rem' }}>(add multiple)</span>
              </label>
              <LocationPicker locations={locations} onChange={setLocations} />
            </div>

            <div className="upload-row">
              <label className="btn-primary upload-btn">
                <UploadCloud size={16} />
                {isProcessing ? 'Processing…' : 'Upload File'}
                <input
                  type="file"
                  accept=".txt,.pdf,.docx"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                />
              </label>
              <span className="body-text">or paste text below</span>
            </div>

            <textarea
              className="glass-input"
              placeholder="Paste your resume text here…"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />

            <button
              className="btn-primary"
              onClick={handleAnalyze}
              disabled={isProcessing || !resumeText}
            >
              <Search size={18} />
              {isProcessing ? 'Analyzing…' : 'Analyze & Find Jobs'}
            </button>
          </div>

          {atsScore !== null && (
            <div className="card glass-panel animate-fade-in" style={{ animationDelay: '0.15s' }}>
              <h2 className="heading-2"><CheckCircle2 className="title-icon" size={22} /> ATS Analysis</h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', marginBottom: '1.75rem' }}>
                <div style={{ width: '110px', height: '110px', flexShrink: 0 }}>
                  <svg style={{ height: 0, width: 0, position: 'absolute' }}>
                    <defs>
                      <linearGradient id="atsg" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#4f46e5" />
                        <stop offset="100%" stopColor="#7c3aed" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <CircularProgressbar value={atsScore} text={`${atsScore}%`} strokeWidth={9} />
                </div>
                <div>
                  <h3 className="body-text-bold" style={{ marginBottom: 6, fontSize: 13 }}>ATS Compatibility Score</h3>
                  <p className="body-text" style={{ color: 'var(--t2)', lineHeight: 1.65 }}>
                    How well your resume matches{' '}
                    {targetRole ? `the ${targetRole} role` : 'industry standards'} based on keywords, structure, and formatting.
                  </p>
                </div>
              </div>

              {feedback && feedback.length > 0 && (
                <div>
                  <h4 className="body-text-bold" style={{ marginBottom: '10px', fontSize: 12 }}>Actionable Improvements</h4>
                  <ul className="feedback-list">
                    {feedback.map((item, i) => (
                      <li key={i} className="feedback-item">
                        <AlertCircle className="feedback-icon" size={16} />
                        <span className="body-text">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Live Jobs */}
        <div className="card glass-panel jobs-panel">
          <h2 className="heading-2"><Briefcase className="title-icon" size={22} /> Live Job Matches</h2>

          {searchQuery && (
            <div className="results-summary">
              <p className="body-text">
                Results for: <strong style={{ color: 'var(--p)' }}>{searchQuery}</strong>
              </p>
              <span className="match-badge match-badge-outline">{jobs.length} Found</span>
            </div>
          )}

          {error && (
            <div className="error-banner">
              <AlertCircle size={18} />
              <p className="body-text-bold">{error}</p>
            </div>
          )}

          {jobs.length === 0 && !error && !isProcessing ? (
            <div className="empty-state">
              <Briefcase size={44} />
              <p className="body-text-bold">No jobs to display yet.</p>
              <p className="body-text">Upload your resume and click Analyze to fetch live listings.</p>
            </div>
          ) : isProcessing ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <p className="body-text-bold" style={{ color: 'var(--primary)' }}>Searching live job databases…</p>
            </div>
          ) : (
            <div className="jobs-grid animate-fade-in">
              {jobs.map((job, index) => (
                <div key={job.id} className="job-card" style={{ animation: `fadeIn 0.4s ease-out ${0.06 * index}s backwards` }}>
                  <div className="job-header">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="job-title">
                        {job.url ? (
                          <a href={job.url} target="_blank" rel="noopener noreferrer">{job.title}</a>
                        ) : job.title}
                      </h3>
                      <div className="job-company">
                        {job.company}
                        {job.platform && <span className="match-badge platform-badge">{job.platform}</span>}
                        {job.posted_at && <span className="posted-date">· {timeAgo(job.posted_at)}</span>}
                      </div>
                    </div>
                    <div className="match-badge" style={{ flexShrink: 0 }}>{(job.match_score * 100).toFixed(0)}%</div>
                  </div>

                  {job.location && (
                    <div className="job-location">
                      <MapPin size={13} />{job.location}
                    </div>
                  )}

                  <div className="job-footer">
                    {!job.url ? (
                      <button className="apply-btn" disabled>Apply link unavailable</button>
                    ) : appliedJobs[job.id] === 'success' ? (
                      <button className="apply-btn" style={{ background: '#ecfaf4', border: '1px solid #c4ecd9', color: 'var(--green)' }} disabled>
                        <CheckCircle2 size={14} /> Applied Successfully
                      </button>
                    ) : appliedJobs[job.id] === 'manual' ? (
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="apply-btn" style={{ background: '#fdf7ec', border: '1px solid #f5e3bd', color: 'var(--amber)', textDecoration: 'none' }}>
                        <AlertCircle size={14} /> Apply Manually
                      </a>
                    ) : applyingJobs[job.id] ? (
                      <button className="apply-btn" disabled>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,.25)', borderTopColor: 'white', animation: 'spin 1s linear infinite' }} />
                        Applying with AI…
                      </button>
                    ) : (
                      <button className="apply-btn" onClick={() => handleAutoApply(job.id, job.url)} style={{ background: 'var(--g)', color: '#fff', border: 'none' }}>
                        Auto-Apply with AI <ExternalLink size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── How It Works ──────────────────────────────── */}
      <div className="how-section">
        <div className="section-tag"><Zap size={12} /> Simple & Powerful</div>
        <h2 className="section-title">How Career Copilot works</h2>
        <p className="section-sub">From resume upload to job offer — we guide every step of your journey.</p>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">01</div>
            <span className="step-emoji">📄</span>
            <h3>Upload Your Resume</h3>
            <p>Upload PDF, DOCX, or paste text. AI extracts your skills, experience, and achievements instantly. Supports all formats.</p>
          </div>
          <div className="step-card">
            <div className="step-num">02</div>
            <span className="step-emoji">🧠</span>
            <h3>AI Analysis & Matching</h3>
            <p>Get your ATS compatibility score with actionable feedback. Live job matches from LinkedIn, Naukri, and 50+ platforms in seconds.</p>
          </div>
          <div className="step-card">
            <div className="step-num">03</div>
            <span className="step-emoji">🚀</span>
            <h3>Apply with Confidence</h3>
            <p>Auto-apply with AI, prep for interviews with SRI, get custom cover letters, and negotiate your best salary offer.</p>
          </div>
        </div>
      </div>

      {/* ── Features Grid ─────────────────────────────── */}
      <div className="features-section">
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h4>Ultra-Fast AI</h4>
            <p>Groq LPU delivers responses 10-20× faster than standard GPU-based AI services.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h4>ATS Optimized</h4>
            <p>Know exactly which keywords to add and how to rewrite bullet points for higher scores.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌍</div>
            <h4>Global Job Search</h4>
            <p>Live jobs from LinkedIn, Naukri, Indeed, and more — searched across multiple locations simultaneously.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h4>Private & Secure</h4>
            <p>Your resume is processed in-memory. We never sell your data or share it without consent.</p>
          </div>
        </div>
      </div>

      {/* ── CTA ──────────────────────────────────────── */}
      {!user && (
        <div className="cta-section">
          <h2 className="cta-title">Ready to land your dream job?</h2>
          <p className="cta-sub">
            Join thousands of job seekers who found their next role with Career Copilot — it's free to start.
          </p>
          <div className="cta-btns">
            <Link to="/signup" className="cta-btn-primary">
              <Rocket size={16} /> Get Started Free
            </Link>
            <Link to="/faq" className="cta-btn-outline">
              Learn more →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
