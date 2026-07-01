import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Mail, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address.'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Please enter a valid email address.'); return; }
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div className="auth-card">
        <Link to="/" className="auth-brand">
          <Rocket size={26} className="auth-brand-icon" />
          <span className="auth-brand-name">Career Copilot</span>
        </Link>

        {sent ? (
          <div className="fp-success">
            <div className="fp-success-icon">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="fp-success-title">Check your inbox</h2>
            <p className="fp-success-msg">
              If an account exists for <strong>{email}</strong>, you'll receive a password reset link within a few minutes. Check your spam folder if you don't see it.
            </p>
            <Link to="/login" className="auth-submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, textDecoration: 'none' }}>
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <div className="auth-header">
              <h1 className="auth-title">Reset password</h1>
              <p className="auth-subtitle">Enter your email and we'll send you a reset link.</p>
            </div>

            {error && (
              <div className="auth-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label className="auth-label">Email address</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    type="email"
                    className="auth-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? <span className="auth-spinner" /> : <><ArrowRight size={17} /> Send Reset Link</>}
              </button>
            </form>

            <p className="auth-switch" style={{ marginTop: 20 }}>
              <Link to="/login" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ArrowLeft size={13} /> Back to Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
