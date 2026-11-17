import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { auth, errorMessage } from '../lib/api';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, GraduationCap, User,
  Code2, ChartNoAxesColumnIncreasing, BriefcaseBusiness, ChevronRight
} from 'lucide-react';

export default function AuthPage() {
  const { currentRoute, navigate, signIn, loginAsGuest, apiStatus } = useApp();
  const resetToken = currentRoute.path === 'reset-password' ? currentRoute.query.token || '' : '';

  const [mode, setMode] = useState(resetToken ? 'reset' : 'signin'); // 'signin' | 'signup' | 'reset'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState({ text: '', type: '' });
  const [needsVerification, setNeedsVerification] = useState(false);

  const show = (text, type) => setFeedbackMessage({ text, type });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    show('', '');
    setNeedsVerification(false);
    const trimmedEmail = email.trim().toLowerCase();
    if (mode === 'signin' && trimmedEmail === 'guest@teklozy.demo' && password === 'TeklozyGuest@2026') {
      loginAsGuest();
      setIsSubmitting(false);
      return;
    }
    try {
      if (mode === 'reset') {
        await auth.resetPassword(resetToken, password);
        setMode('signin');
        setPassword('');
        navigate('signin', {}, true);
        show('Password updated. Sign in with your new password.', 'success');
      } else if (mode === 'signup') {
        await auth.signUp(name.trim(), trimmedEmail, password);
        setMode('signin');
        setPassword('');
        show(`Account created. We sent a verification link to ${trimmedEmail}; open it, then sign in.`, 'success');
      } else {
        await signIn(trimmedEmail, password);
      }
    } catch (err) {
      if (err?.code === 'EMAIL_NOT_VERIFIED') setNeedsVerification(true);
      show(errorMessage(err), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      show('Enter your email address above first.', 'error');
      return;
    }
    try {
      await auth.requestPasswordReset(email.trim().toLowerCase());
      show('If an account exists for that email, a password reset link is on its way.', 'success');
    } catch (err) {
      show(errorMessage(err), 'error');
    }
  };

  const handleResend = async () => {
    try {
      await auth.resendVerification(email.trim().toLowerCase());
      show('Verification email sent again. Check your inbox.', 'success');
    } catch (err) {
      show(errorMessage(err), 'error');
    }
  };

  const heading = {
    signin: ['WELCOME BACK', 'Sign in to Teklozy', 'Enter your credentials to resume your 10-level career path.'],
    signup: ['CREATE ACCOUNT', 'Join the Tech Journey', 'Start your tech journey and build your portfolio from day one.'],
    reset: ['RESET PASSWORD', 'Choose a new password', 'Use at least 12 characters. Other signed-in devices will be signed out.'],
  }[mode];

  return (
    <div className="auth-split-layout">
      {/* Left Brand & Story Panel */}
      <section className="auth-story-panel">
        <div className="auth-story-bg-img" aria-hidden="true" />
        <div className="auth-story-gradient-overlay" aria-hidden="true" />

        <div className="auth-story-content">
          {/* Top Header Logo */}
          <div className="auth-story-brand-header">
            <img src="/teklozy-logo-on-dark.png" alt="Teklozy" className="auth-white-logo" />
            <span className="brand-badge-tag">Venture Career Studio</span>
          </div>

          {/* Stepper Pill */}
          <div className="auth-steps-pill" aria-label="Career path sequence">
            <span>Learn</span>
            <ChevronRight size={12} />
            <span>Build</span>
            <ChevronRight size={12} />
            <span>Showcase</span>
            <ChevronRight size={12} />
            <span className="step-highlight">Get Hired</span>
          </div>

          {/* Main Hero Copy */}
          <div className="auth-hero-copy">
            <span className="auth-eyebrow">YOUR NEXT CHAPTER IN TECH</span>
            <h1 className="auth-title">
              Build Your Tech Career with <span className="blue-gradient-text">Teklozy</span>
            </h1>
            <p className="auth-subtitle">
              A structured, hands-on platform to master in-demand skills, build verified production projects, and connect directly with hiring teams.
            </p>
          </div>

          {/* Feature Grid Pills */}
          <div className="auth-feature-pills-grid">
            <div className="feature-pill-card">
              <div className="feature-pill-icon"><GraduationCap size={18} /></div>
              <div className="feature-pill-text">
                <strong>Learn</strong>
                <small>In-Demand Skills</small>
              </div>
            </div>

            <div className="feature-pill-card">
              <div className="feature-pill-icon"><Code2 size={18} /></div>
              <div className="feature-pill-text">
                <strong>Build</strong>
                <small>Real Projects</small>
              </div>
            </div>

            <div className="feature-pill-card">
              <div className="feature-pill-icon"><ChartNoAxesColumnIncreasing size={18} /></div>
              <div className="feature-pill-text">
                <strong>Track</strong>
                <small>Your Growth</small>
              </div>
            </div>

            <div className="feature-pill-card">
              <div className="feature-pill-icon"><BriefcaseBusiness size={18} /></div>
              <div className="feature-pill-text">
                <strong>Get Hired</strong>
                <small>with Confidence</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Right Form Card Panel */}
      <section className="auth-form-panel">
        <div className="auth-form-card-container">
          {/* Card Header */}
          <div className="auth-card-top">
            <img src="/teklozy-logo-original.png" alt="Teklozy" className="auth-card-logo" />
            <span className="card-kicker">{heading[0]}</span>
            <h2 className="card-heading">{heading[1]}</h2>
            <p className="card-subheading">{heading[2]}</p>
            {apiStatus === 'offline' && (
              <div className="form-feedback-alert error" role="alert">
                <span>The Teklozy server is not reachable. Start the backend and reload this page.</span>
              </div>
            )}
          </div>

          {/* Main Form */}
          <form className="auth-inputs-form" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="form-field-group">
                <label htmlFor="auth-name-input">Full name</label>
                <div className="form-input-shell">
                  <User size={16} className="input-affix-icon" />
                  <input
                    id="auth-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    maxLength={80}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}
            {mode !== 'reset' && (
            <div className="form-field-group">
              <label htmlFor="auth-email-input">Email address</label>
              <div className="form-input-shell">
                <Mail size={16} className="input-affix-icon" />
                <input
                  id="auth-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            )}

            <div className="form-field-group">
              <div className="label-with-link-row">
                <label htmlFor="auth-pass-input">{mode === 'reset' ? 'New password' : 'Password'}</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    className="inline-link-btn"
                    onClick={handleForgotPassword}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="form-input-shell">
                <Lock size={16} className="input-affix-icon" />
                <input
                  id="auth-pass-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signin' ? 'Enter your password' : 'At least 12 characters'}
                  required
                  minLength={mode === 'signin' ? undefined : 12}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {feedbackMessage.text && (
              <div className={`form-feedback-alert ${feedbackMessage.type}`} role="alert">
                <span>{feedbackMessage.text}</span>
                {needsVerification && (
                  <button type="button" className="inline-link-btn" onClick={handleResend}>
                    Resend verification email
                  </button>
                )}
              </div>
            )}

            <button type="submit" className="btn-primary-action" disabled={isSubmitting}>
              {isSubmitting
                ? 'Please wait...'
                : { signin: 'Sign In to Dashboard', signup: 'Create Free Account', reset: 'Save New Password' }[mode]}
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Dedicated 1-Click Guest Preview Access Banner */}
          <div className="guest-preview-box">
            <div className="guest-preview-header">
              <span className="guest-status-dot" />
              <strong>Instant Guest Preview</strong>
            </div>
            <p className="guest-preview-desc">
              Explore all 10 milestones, interactive lessons, quizzes and AI paths with a pre-configured learner account.
            </p>
            <div className="guest-creds-strip">
              <span><code>guest@teklozy.demo</code></span>
              <span className="cred-dot">•</span>
              <span><code>TeklozyGuest@2026</code></span>
            </div>
            <button type="button" className="btn-guest-enter" onClick={loginAsGuest}>
              <span>Enter Guest Workspace</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Bottom Switcher */}
          <div className="card-mode-switch-footer">
            {mode === 'signin' ? (
              <p>
                Don't have an account?{' '}
                <button type="button" className="switch-mode-btn" onClick={() => { setMode('signup'); setFeedbackMessage({ text: '', type: '' }); }}>
                  Create one now
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button type="button" className="switch-mode-btn" onClick={() => { setMode('signin'); setFeedbackMessage({ text: '', type: '' }); navigate('signin', {}, true); }}>
                  Sign in
                </button>
              </p>
            )}
            <div className="backend-health-tag">
              <span className={`status-indicator-dot ${apiStatus === 'connected' ? 'is-connected' : 'is-offline'}`} />
              <span>{apiStatus === 'connected' ? 'Backend API Active' : apiStatus === 'offline' ? 'Backend offline' : 'Checking backend…'}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
