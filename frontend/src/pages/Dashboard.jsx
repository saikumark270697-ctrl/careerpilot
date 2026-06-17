import React, { useState } from 'react';
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { UploadCloud, Search, MapPin, Briefcase, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

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
        alert('Auto-apply encountered an issue: ' + (data.detail || 'Failed'));
      }
    } catch (err) {
      console.error('Auto-apply error:', err);
      alert('Failed to run auto-apply agent.');
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
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '1rem', letterSpacing: '-1px' }}>
          Your <span className="logo">Career Copilot</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', maxWidth: '600px', margin: '0 auto' }}>
          Upload your resume, specify your target role, and let our AI evaluate your ATS score while fetching the perfect live job matches.
        </p>
      </div>
      
      <div className="dashboard-grid">
        {/* Left Column: Inputs & Score */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card glass-panel">
            <h2><UploadCloud className="logo" size={24} /> Resume & Preferences</h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Target Role (Optional)</label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  className="glass-input" 
                  style={{ paddingLeft: '3rem', marginBottom: '0' }}
                  placeholder="e.g. Frontend Engineer" 
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Location</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  className="glass-input" 
                  style={{ paddingLeft: '3rem', marginBottom: '0' }}
                  placeholder="e.g. Remote, New York" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label className="btn-primary" style={{ cursor: 'pointer', padding: '0.5rem 1rem', display: 'inline-flex', width: 'auto', fontSize: '0.875rem', borderRadius: '8px' }}>
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
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>or paste text below</span>
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
              style={{ padding: '1rem', fontSize: '1.125rem' }}
            >
              <Search size={20} />
              {isProcessing ? 'Analyzing...' : 'Analyze & Find Jobs'}
            </button>
          </div>

          {atsScore !== null && (
            <div className="card glass-panel animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <h2><CheckCircle2 className="logo" size={24} /> ATS Analysis</h2>
              
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
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Overall Compatibility</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.5' }}>
                    This score reflects how well your resume matches {targetRole ? `the ${targetRole} role` : 'industry standards'} based on keywords, structure, and formatting.
                  </p>
                </div>
              </div>

              {feedback && feedback.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: '1rem', color: '#e2e8f0' }}>Actionable Feedback</h4>
                  <ul className="feedback-list">
                    {feedback.map((item, i) => (
                      <li key={i} className="feedback-item">
                        <AlertCircle size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Live Jobs */}
        <div className="card glass-panel" style={{ minHeight: '600px' }}>
          <h2><Briefcase className="logo" size={24} /> Live Job Matches</h2>
          
          {searchQuery && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                Results for: <strong className="logo">{searchQuery}</strong>
              </p>
              <span className="match-badge" style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }}>
                {jobs.length} Jobs Found
              </span>
            </div>
          )}
          
          {error && (
            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle size={20} />
              <p>{error}</p>
            </div>
          )}
          
          {jobs.length === 0 && !error && !isProcessing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Briefcase size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p style={{ fontSize: '1.125rem' }}>No jobs to display yet.</p>
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Upload your resume and click Analyze to fetch live listings.</p>
            </div>
          ) : isProcessing ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', textAlign: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite', marginBottom: '1rem' }}></div>
              <p style={{ color: 'var(--primary)', fontWeight: '500', animation: 'pulse 2s infinite' }}>Searching live databases...</p>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
            </div>
          ) : (
            <div className="jobs-grid animate-fade-in" style={{ animationDelay: '0.4s' }}>
              {jobs.map((job, index) => (
                <div key={job.id} className="job-card" style={{ animation: `fadeIn 0.5s ease-out ${0.1 * index}s backwards` }}>
                  <div className="job-header" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <h3 className="job-title">{job.title}</h3>
                      <div className="job-company" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {job.company}
                        {job.platform && (
                          <span className="match-badge" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                            {job.platform}
                          </span>
                        )}
                        {job.posted_at && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            • {timeAgo(job.posted_at)}
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

