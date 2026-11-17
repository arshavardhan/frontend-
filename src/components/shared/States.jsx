import React from 'react';
import { AlertCircle, Inbox } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function LoadingState({ label = 'Loading…', lines = 0 }) {
  if (lines)
    return (
      <div role="status" aria-label={label} style={{ display: 'grid', gap: 10 }}>
        {Array.from({ length: lines }, (_, i) => <div key={i} className="tk-skeleton" style={{ height: 46 }} />)}
      </div>
    );
  return (
    <div className="tk-state" role="status">
      <span className="tk-spinner" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, children, icon: Icon = Inbox }) {
  return (
    <div className="tk-state">
      <Icon size={22} />
      {title && <strong>{title}</strong>}
      {children && <span>{children}</span>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="tk-state tk-state--error" role="alert">
      <AlertCircle size={22} />
      <span>{message || 'Something went wrong.'}</span>
      {onRetry && <button className="tk-linkbtn" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function AccountRequired({ feature }) {
  const { logout } = useApp();
  return (
    <div className="level-locked-prompt-box">
      <h3>Sign in to use {feature}</h3>
      <p>Use a verified Teklozy account to access this feature and save your progress.</p>
      <button className="btn-level-primary" onClick={logout}>Go to sign in</button>
    </div>
  );
}
