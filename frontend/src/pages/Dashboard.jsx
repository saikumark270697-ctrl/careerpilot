import React, { useState } from 'react';
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { UploadCloud, Search, MapPin, Briefcase, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const Dashboard = () => {
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [location, setLocation] = useState('remote');
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
    if (interval >= 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval >= 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval >= 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval >= 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval >= 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
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
        if (data.message && data.message.includes("manual review")) {
          setAppliedJobs(prev => ({ ...prev, [jobId]: 'manual' }));
        } else {
          setAppliedJobs(prev => ({ ...prev, [jobId]: 'success' }));
        }
      } else {
        alert('Auto-apply encountered an issue (e.g. CAPTCHA or missing fields). Routing to manual apply.');
        setAppliedJobs(prev => ({ ...prev, [jobId]: 'manual' }));
      }
    } catch (err) {
      console.error('Auto-apply error:', err);
      alert('Auto-apply failed. Routing to manual apply.');
      setAppliedJobs(prev => ({ ...prev, [jobId]: 'manual' }));
    } finally {
      setApplyingJobs(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsProcessing(true);
      setError('');
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await fetch(`${API_BASE}/api/resume/upload`, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (response.ok) {
          setResumeText(data.text);
        } else {
          alert(data.detail || 'Failed to process file');
        }
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        alert('Error uploading file. Make sure backend server is running.');
      } finally {
        setIsProcessing(false);
      }
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
        body: JSON.stringify({ resume_text: resumeText, target_role: targetRole, location: location }),
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
    } catch (analyzeError) {
      console.error('Match error:', analyzeError);
      setError('Could not reach the backend. Make sure the server is running on port 8000.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="hero-copy">
        <h1 className="heading-1">
          Your <span className="logo">Career Copilot</span>
        </h1>
        <p className="hero-subtitle">
          Upload your resume, specify your target role, and let our AI evaluate your ATS score while fetching the perfect live job matches.
        </p>
      </div>
      
      <div className="dashboard-grid">
        {/* Left Column: Inputs & Score */}
        <div className="panel-stack">
          <div className="card glass-panel">
            <h2 className="heading-2"><UploadCloud className="title-icon" size={24} /> Resume & Preferences</h2>
            
            <div className="form-field">
              <label>Target Role (Optional)</label>
              <div className="input-shell">
                <Briefcase size={18} />
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
              <label>Location</label>
              <div className="input-shell">
                <MapPin size={18} />
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="e.g. Remote, New York" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="upload-row">
              <label className="btn-primary upload-btn">
                <UploadCloud size={18} />
                {isProcessing ? 'Processing...' : 'Upload File'}
                <input 
                  type="file" 
                  accept=".txt,.pdf,.docx" 
                  style={{ display: 'none' }} 
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                />
              </label>
              <span>or paste text below</span>
            </div>
            
            <textarea 
              className="glass-input" 
              placeholder="Paste your resume text here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            ></textarea>

            <button 
              className="btn-primary" 
              onClick={handleAnalyze}
              disabled={isProcessing || !resumeText}
            >
              <Search size={20} />
              {isProcessing ? 'Analyzing...' : 'Analyze & Find Jobs'}
            </button>
          </div>

          {atsScore !== null && (
            <div className="card glass-panel animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <h2 className="heading-2"><CheckCircle2 className="title-icon" size={24} /> ATS Analysis</h2>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
                <div style={{ width: '120px', height: '120px', flexShrink: 0 }}>
                  <svg style={{ height: 0, width: 0 }}>
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#a78bfa" />
                        <stop offset="100%" stopColor="#f472b6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <CircularProgressbar 
                    value={atsScore} 
                    text={`${atsScore}%`} 
                    strokeWidth={8}
                  />
                </div>
                <div>
                  <h3 className="body-strong">Overall Compatibility</h3>
                  <p className="body-muted">
                    This score reflects how well your resume matches {targetRole ? `the ${targetRole} role` : 'industry standards'} based on keywords, structure, and formatting.
                  </p>
                </div>
              </div>

              {feedback && feedback.length > 0 && (
                <div>
                  <h4 className="body-strong">Actionable Feedback</h4>
                  <ul className="feedback-list">
                    {feedback.map((item, i) => (
                      <li key={i} className="feedback-item">
                        <AlertCircle className="feedback-icon" size={18} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Live Jobs */}
        <div className="card glass-panel jobs-panel">
          <h2 className="heading-2"><Briefcase className="title-icon" size={24} /> Live Job Matches</h2>
          
          {searchQuery && (
            <div className="results-summary">
              <p>
                Results for: <strong className="logo">{searchQuery}</strong>
              </p>
              <span className="match-badge match-badge-outline">
                {jobs.length} Jobs Found
              </span>
            </div>
          )}
          
          {error && (
            <div className="error-banner">
              <AlertCircle size={20} />
              <p>{error}</p>
            </div>
          )}
          
          {jobs.length === 0 && !error && !isProcessing ? (
            <div className="empty-state">
              <Briefcase size={48} />
              <p className="body-strong">No jobs to display yet.</p>
              <p>Upload your resume and click Analyze to fetch live listings.</p>
            </div>
          ) : isProcessing ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Searching live databases...</p>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
            </div>
          ) : (
            <div className="jobs-grid animate-fade-in" style={{ animationDelay: '0.4s' }}>
              {jobs.map((job, index) => (
                <div key={job.id} className="job-card" style={{ animation: `fadeIn 0.5s ease-out ${0.1 * index}s backwards` }}>
                  <div className="job-header" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <h3 className="job-title">
                        {job.url ? (
                          <a href={job.url} target="_blank" rel="noopener noreferrer">
                            {job.title}
                          </a>
                        ) : (
                          job.title
                        )}
                      </h3>
                      <div className="job-company">
                        {job.company}
                        {job.platform && (
                          <span className="match-badge platform-badge">
                            {job.platform}
                          </span>
                        )}
                        {job.posted_at && (
                          <span className="posted-date">
                            - {timeAgo(job.posted_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="match-badge">{(job.match_score * 100).toFixed(0)}%</div>
                  </div>
                  
                  {job.location && (
                    <div className="job-location">
                      <MapPin size={14} />
                      {job.location}
                    </div>
                  )}
                  
                  <div className="job-footer">
                    {job.url ? (
                      appliedJobs[job.id] === 'success' ? (
                        <button className="apply-btn" style={{ background: '#10b981', color: 'white' }} disabled>
                          <CheckCircle2 size={16} style={{ marginRight: '6px' }} />
                          Successfully Applied
                        </button>
                      ) : appliedJobs[job.id] === 'manual' ? (
                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="apply-btn" style={{ background: '#f59e0b', color: 'white', textDecoration: 'none', display: 'flex', justifyContent: 'center' }}>
                          <AlertCircle size={16} style={{ marginRight: '6px' }} />
                          Apply Manually
                        </a>
                      ) : applyingJobs[job.id] ? (
                        <button className="apply-btn" disabled>
                          <div style={{ width: '16px', height: '16px', marginRight: '6px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 1s linear infinite' }}></div>
                          Applying with AI...
                        </button>
                      ) : (
                        <button 
                          className="apply-btn" 
                          onClick={() => handleAutoApply(job.id, job.url)}
                          style={{ background: 'var(--primary)', color: 'white' }}
                        >
                          Auto-Apply with AI <ExternalLink size={14} style={{ marginLeft: '4px', verticalAlign: '-2px' }} />
                        </button>
                      )
                    ) : (
                      <button className="apply-btn" disabled>Apply link unavailable</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
