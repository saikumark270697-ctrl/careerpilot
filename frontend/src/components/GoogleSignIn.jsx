import React, { useEffect, useRef, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '578917335981-c4v4h04usvhd1t1m1l2hbvvklh8b00re.apps.googleusercontent.com';

let gsiScriptPromise = null;
const loadGsiScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiScriptPromise) {
    gsiScriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = resolve;
      s.onerror = () => { gsiScriptPromise = null; reject(new Error('Failed to load Google Sign-In')); };
      document.head.appendChild(s);
    });
  }
  return gsiScriptPromise;
};

/**
 * Renders the official Google Sign-In button.
 * onSuccess(user, token) — called after our backend verifies the Google token.
 * onError(message) — called on any failure.
 */
const GoogleSignIn = ({ onSuccess, onError }) => {
  const btnRef = useRef(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadGsiScript()
      .then(() => {
        if (cancelled || !btnRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            setVerifying(true);
            try {
              const res = await fetch(`${API_BASE}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.detail || 'Google sign-in failed.');
              onSuccess(data.user, data.token);
            } catch (err) {
              onError(err.message || 'Google sign-in failed. Please try again.');
            } finally {
              setVerifying(false);
            }
          },
        });
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: btnRef.current.offsetWidth || 356,
          logo_alignment: 'center',
        });
      })
      .catch(() => onError('Could not load Google Sign-In. Check your connection.'));

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="google-signin-wrap">
      <div ref={btnRef} className="google-signin-btn" />
      {verifying && <p className="google-signin-verifying">Signing you in…</p>}
    </div>
  );
};

export default GoogleSignIn;
