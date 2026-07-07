import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Rocket, User, Mail, Lock, Eye, EyeOff, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GoogleSignIn from '../components/GoogleSignIn';

const API_BASE = import.meta.env.VITE_API_URL || '';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'verify'
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();

  const registerAccount = async (code) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        password,
        ...(code ? { otp_code: code } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Registration failed.');
    login(data.user, data.token);
    navigate('/dashboard', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPw) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPw) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    setInfo('');
    try {
      // Try to verify the email with a code first
      const res = await fetch(`${API_BASE}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      });
      if (res.ok) {
        setStep('verify');
        setInfo(`We emailed a 6-digit code to ${email.trim()}. Enter it below to verify your email.`);
      } else {
        // Email service unavailable (quota/config) — fall back to direct signup
        await registerAccount(null);
      }
    } catch (err) {
      // Network or registration error — try direct signup as last resort
      try {
        await registerAccount(null);
      } catch (err2) {
        setError(err2.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = otpCode.replace(/\D/g, '');
    if (code.length !== 6) { setError('Enter the 6-digit code from your email.'); return; }
    setLoading(true);
    setError('');
    try {
      await registerAccount(code);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not resend the code.');
      setInfo('New code sent. Check your inbox (and spam folder).');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ['', 'Weak', 'Good', 'Strong'];
  const strengthColor = ['', '#dc2626', '#d97706', '#059669'];

  if (authLoading) {
    return (
      <div className="auth-page">
        <div className="route-loader">
          <span className="auth-spinner" />
          <span>Checking your session...</span>
        </div>
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-brand">
          <Rocket size={26} className="auth-brand-icon" />
          <span className="auth-brand-name">AriseJobs</span>
        </Link>

        <div className="auth-header">
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Start your job search journey with <strong>Arise</strong> - free forever</p>
        </div>

        <GoogleSignIn
          onSuccess={(userData, token) => { login(userData, token); navigate('/dashboard', { replace: true }); }}
          onError={(msg) => setError(msg)}
        />

        <div className="auth-divider"><span>or sign up with email</span></div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {info && <div className="auth-info">{info}</div>}

        {step === 'verify' ? (
        <form onSubmit={handleVerify} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Verification code</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="auth-input"
                placeholder="6-digit code"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>
          </div>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : <><Sparkles size={16} /> Verify & Create Account</>}
          </button>
          <p className="auth-switch" style={{ marginTop: 10 }}>
            <button type="button" className="auth-secondary-btn" onClick={resendCode} disabled={loading}>Resend code</button>
            {' · '}
            <button type="button" className="auth-secondary-btn" onClick={() => { setStep('form'); setInfo(''); setError(''); setOtpCode(''); }} disabled={loading}>Change details</button>
          </p>
        </form>
        ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Full name</label>
            <div className="auth-input-wrap">
              <User size={16} className="auth-input-icon" />
              <input
                type="text"
                className="auth-input"
                placeholder="Your full name"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>
          </div>

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
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                type={showPw ? 'text' : 'password'}
                className="auth-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {password && (
              <div className="pw-strength">
                <div className="pw-bar">
                  {[1, 2, 3].map(l => (
                    <div key={l} className="pw-segment" style={{ background: strength >= l ? strengthColor[strength] : 'var(--s3)' }} />
                  ))}
                </div>
                <span style={{ color: strengthColor[strength], fontSize: '0.72rem' }}>{strengthLabel[strength]}</span>
              </div>
            )}
          </div>

          <div className="auth-field">
            <label className="auth-label">Re-enter password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                type={showPw ? 'text' : 'password'}
                className="auth-input"
                placeholder="Type your password again"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
              />
            </div>
            {confirmPw && password !== confirmPw && (
              <span style={{ color: 'var(--red)', fontSize: '0.72rem' }}>Passwords do not match</span>
            )}
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : <><Sparkles size={16} /> Create Account</>}
          </button>
        </form>
        )}

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>

        <p className="auth-terms">
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Signup;
