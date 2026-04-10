import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import GlitchText from '../components/GlitchText';

function formatError(msg) {
  if (msg.includes('network') || msg.includes('ERR_NAME') || msg.includes('Failed to fetch'))
    return '⚠ Network error. Check your internet connection and try again.';
  if (msg.includes('user-not-found') || msg.includes('invalid-credential'))
    return 'Invalid email or password. Please try again.';
  if (msg.includes('wrong-password'))
    return 'Incorrect password. Try again or reset your password.';
  if (msg.includes('too-many-requests'))
    return 'Too many failed attempts. Please wait a moment and try again.';
  if (msg.includes('invalid-email'))
    return 'Please enter a valid email address.';
  return msg.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim() || 'Something went wrong. Please try again.';
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const { login, loginWithGoogle, resetPassword, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const cred = await login(email, password);
      // Wait for profile to load explicitly to prevent redirect to /onboarding
      await refreshProfile(cred.user.uid);
      navigate('/dashboard');
    } catch (err) {
      setError(formatError(err.message));
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const cred = await loginWithGoogle();
      // Wait for profile to load explicitly to prevent redirect to /onboarding
      await refreshProfile(cred.user.uid);
      navigate('/dashboard');
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setLoading(false);
        return;
      }
      setError(formatError(err.message));
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!resetEmail.trim()) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch (err) {
      setError(formatError(err.message));
    }
    setLoading(false);
  };

  // Forgot password modal
  if (showForgot) {
    return (
      <div className="auth-page page-enter">
        <div className="form-container">
          <GlitchText text="RESET PASSWORD" tag="h2" className="form-title" />
          <p className="form-subtitle">Enter your email to receive a reset link</p>

          {error && <div className="form-error" style={{ textAlign: 'center', marginBottom: '1rem' }}>{error}</div>}

          {resetSent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
              <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)', marginBottom: '1rem' }}>
                Password reset email sent!
              </p>
              <p className="form-subtitle">
                Check your inbox (and spam folder) for the reset link.
              </p>
              <button className="btn btn-primary btn-block" style={{ marginTop: '1.5rem' }} onClick={() => { setShowForgot(false); setResetSent(false); }}>
                ← Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="your@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? (
                  <span className="btn-loading">
                    <span className="btn-spinner" /> Sending...
                  </span>
                ) : '> Send Reset Link'}
              </button>
              <button type="button" className="btn btn-block" style={{ marginTop: '0.75rem' }} onClick={() => { setShowForgot(false); setError(''); }}>
                ← Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page page-enter">
      <div className="form-container">
        <GlitchText text="LOGIN" tag="h2" className="form-title" />
        <p className="form-subtitle">Access your hacker dashboard</p>

        {error && <div className="form-error" style={{ textAlign: 'center', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="hacker@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
            <button type="button" onClick={() => { setShowForgot(true); setResetEmail(email); setError(''); }} style={{
              background: 'none', border: 'none', color: 'var(--primary)', fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', padding: 0
            }}>
              Forgot Password?
            </button>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? (
              <span className="btn-loading">
                <span className="btn-spinner" /> Authenticating...
              </span>
            ) : '> Login'}
          </button>
        </form>

        <div className="form-divider">OR</div>

        <button className="btn btn-google btn-block" onClick={handleGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="auth-link">
          Don't have an account? <Link to="/signup">Register here</Link>
        </div>
      </div>
    </div>
  );
}
