import React from 'react';
import { Sparkles, CheckCircle2, TrendingUp } from 'lucide-react';

// Decorative right-hand panel for the auth pages. Pure CSS/SVG, no external
// images, so it loads instantly and always matches the brand.
const AuthShowcase = () => (
  <aside className="auth-showcase" aria-hidden="true">
    <div className="showcase-glow" />
    <div className="showcase-content">
      <h2 className="showcase-title">Your next role is closer than you think</h2>
      <p className="showcase-sub">
        Join job seekers who upload a resume in the morning and interview by the weekend.
      </p>

      <div className="showcase-card showcase-score-card">
        <div className="showcase-ring">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" className="preview-ring-track" />
            <circle cx="50" cy="50" r="42" className="preview-ring-fill" />
          </svg>
          <span className="showcase-ring-label">86%</span>
        </div>
        <div>
          <div className="showcase-card-title">ATS Score</div>
          <div className="showcase-card-sub">Strong match for your target role</div>
        </div>
      </div>

      <div className="showcase-card showcase-job-card">
        <div>
          <div className="showcase-card-title">Senior Frontend Engineer</div>
          <div className="showcase-card-sub">TechCorp · Remote · Posted today</div>
        </div>
        <span className="showcase-match"><TrendingUp size={12} /> 94%</span>
      </div>

      <div className="showcase-card showcase-applied-card">
        <CheckCircle2 size={18} className="showcase-check" />
        <div>
          <div className="showcase-card-title">Application submitted</div>
          <div className="showcase-card-sub">Arise filled the form for you in 40 seconds</div>
        </div>
      </div>

      <div className="showcase-quote">
        <Sparkles size={14} />
        <span>Time to arise. Find better jobs, faster.</span>
      </div>
    </div>
  </aside>
);

export default AuthShowcase;
