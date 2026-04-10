import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import GlitchText from '../components/GlitchText';

function formatError(msg) {
  if (msg.includes('network') || msg.includes('ERR_NAME') || msg.includes('Failed to fetch'))
    return '⚠ Network error. Check your internet connection and try again.';
  if (msg.includes('email-already-in-use'))
    return 'This email is already registered. Try logging in instead.';
  if (msg.includes('weak-password'))
    return 'Password is too weak. Use at least 6 characters.';
  if (msg.includes('invalid-email'))
    return 'Please enter a valid email address.';
  if (msg.includes('too-many-requests'))
    return 'Too many attempts. Please wait a moment and try again.';
  return msg.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim() || 'Something went wrong. Please try again.';
}

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const { signup, loginWithGoogle, resendVerification, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signup(email, password);
      setVerificationSent(true);
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

  const handleResend = async () => {
    setLoading(true);
    try {
      await resendVerification();
      setError('');
    } catch (err) {
      setError(formatError(err.message));
    }
    setLoading(false);
  };

  // Verification sent screen
  if (verificationSent) {
    return (
      <div className="auth-page page-enter">
        <div className="form-container" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📧</div>
          <GlitchText text="VERIFY EMAIL" tag="h2" className="form-title" />
          <p className="form-subtitle" style={{ marginBottom: '1.5rem' }}>
            A verification email has been sent to
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontSize: '0.9rem', marginBottom: '1.5rem', wordBreak: 'break-all' }}>
            {email}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '2rem' }}>
            Please check your inbox (and spam folder) and click the verification link, then come back and login.
          </p>

          {error && <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <button className="btn btn-block" onClick={handleResend} disabled={loading} style={{ marginBottom: '0.75rem' }}>
            {loading ? 'Sending...' : '↻ Resend Verification Email'}
          </button>

          <Link to="/login">
            <button className="btn btn-primary btn-block">
              → Go to Login
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page page-enter">
      <div className="form-container">
        <GlitchText text="REGISTER" tag="h2" className="form-title" />
        <p className="form-subtitle">Join the hackathon. Become a hacker.</p>

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
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? (
              <span className="btn-loading">
                <span className="btn-spinner" /> Creating Account...
              </span>
            ) : '> Create Account'}
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
          Already have an account? <Link to="/login">Login here</Link>
        </div>
      </div>
    </div>
  );
}
