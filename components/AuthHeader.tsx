/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User } from '../firebase';

interface AuthHeaderProps {
  user: User | null;
  authLoading: boolean;
  isCloudSyncing: boolean;
  syncStatus: 'synced' | 'local' | 'syncing' | 'error';
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  savedItemsCount: number;
  customIngredientsCount: number;
}

export function AuthHeader({
  user,
  authLoading,
  isCloudSyncing,
  syncStatus,
  onLogin,
  onLogout,
  savedItemsCount,
  customIngredientsCount,
}: AuthHeaderProps) {
  const [loggingIn, setLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setLoggingIn(true);
      setErrorMsg(null);
      await onLogin();
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMsg(err?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="auth-header-bar">
      <div className="auth-status-info">
        {user ? (
          <div className="user-profile-badge">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="user-avatar-img"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="user-avatar-placeholder">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="user-details-column">
              <span className="user-name-label">
                {user.displayName || user.email?.split('@')[0] || 'Alchemist Forge Master'}
              </span>
              <span className="user-sync-subtext">
                {isCloudSyncing ? (
                  <span className="sync-pulse">🔄 Syncing with Cloud...</span>
                ) : syncStatus === 'synced' ? (
                  <span className="sync-ok">☁️ Cloud Synced ({savedItemsCount} items, {customIngredientsCount} custom ings)</span>
                ) : (
                  <span>☁️ Cloud Connected</span>
                )}
              </span>
            </div>
          </div>
        ) : (
          <div className="guest-badge-info">
            <span className="guest-icon">📦</span>
            <div className="guest-text-col">
              <span className="guest-title">Guest Workshop</span>
              <span className="guest-subtitle">Sign in with Google to save creations & custom recipes to the cloud</span>
            </div>
          </div>
        )}
      </div>

      <div className="auth-actions-group">
        {errorMsg && <span className="auth-error-chip">{errorMsg}</span>}

        {authLoading ? (
          <div className="auth-loading-spinner">Loading...</div>
        ) : user ? (
          <button
            id="sign-out-btn"
            onClick={onLogout}
            className="auth-signout-btn"
            title="Sign out of your account"
          >
            Sign Out
          </button>
        ) : (
          <button
            id="google-login-btn"
            onClick={handleLogin}
            disabled={loggingIn}
            className="auth-login-btn"
            title="Sign in with your Google account to sync creations"
          >
            {loggingIn ? (
              <>
                <span className="btn-spinner"></span>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <svg className="google-icon-svg" viewBox="0 0 24 24" width="18" height="18">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
