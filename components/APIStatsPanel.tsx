import React, { useEffect, useState } from 'react';
import { getCacheStats, clearSynthesisCache, subscribeToCacheChanges } from '../lib/synthesis-cache';
import { rateLimiter } from '../lib/rate-limiter';
import { synthesisQueue } from '../lib/synthesis-queue';

export function APIStatsPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState(() => ({
    cache: getCacheStats(),
    rateLimit: rateLimiter.getStatus(),
    queue: synthesisQueue.getStatus(),
  }));

  const refreshStats = () => {
    setStats({
      cache: getCacheStats(),
      rateLimit: rateLimiter.getStatus(),
      queue: synthesisQueue.getStatus(),
    });
  };

  useEffect(() => {
    const unsubCache = subscribeToCacheChanges(refreshStats);
    const unsubRate = rateLimiter.subscribe(refreshStats);
    const unsubQueue = synthesisQueue.subscribe(refreshStats);

    const interval = setInterval(refreshStats, 2000);

    return () => {
      unsubCache();
      unsubRate();
      unsubQueue();
      clearInterval(interval);
    };
  }, []);

  const handleClearCache = () => {
    if (window.confirm('Clear all cached synthesis results and reset API savings stats?')) {
      clearSynthesisCache();
      refreshStats();
    }
  };

  const { cache, rateLimit, queue } = stats;

  return (
    <aside className="api-stats-panel" aria-label="API Performance Monitor">
      <div
        className="api-stats-header"
        onClick={() => setIsExpanded((prev) => !prev)}
        title="Toggle API Quota & Cache Monitor"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsExpanded((prev) => !prev);
          }
        }}
      >
        <div className="api-stats-summary">
          <span className="api-stats-badge">
            <span className="badge-dot" style={{ backgroundColor: rateLimit.isThrottled ? '#f59e0b' : '#10b981' }} />
            API Quota Shield
          </span>
          <span className="api-stat-pill">
            💾 {cache.size} cached
          </span>
          <span className="api-stat-pill highlight">
            🎯 {cache.totalHits} calls saved
          </span>
          <span className="api-stat-pill">
            ⚡ {rateLimit.availableTokens}/{rateLimit.maxBurst} tokens
          </span>
        </div>

        <button
          type="button"
          className="api-stats-toggle-btn"
          aria-expanded={isExpanded}
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded((prev) => !prev);
          }}
        >
          {isExpanded ? 'Hide Stats ▲' : 'Inspect API Stats ▼'}
        </button>
      </div>

      {isExpanded && (
        <div className="api-stats-body">
          <div className="api-stats-grid">
            <div className="api-stats-card">
              <h5>💾 Synthesis Cache</h5>
              <div className="stat-row">
                <span>Cached Results:</span>
                <strong>{cache.size} items</strong>
              </div>
              <div className="stat-row">
                <span>Cache Hits:</span>
                <strong className="text-success">{cache.totalHits}</strong>
              </div>
              <div className="stat-row">
                <span>API Calls Saved:</span>
                <strong className="text-success">~{cache.apiCallsSaved} calls</strong>
              </div>
              <button
                type="button"
                className="clear-cache-btn"
                onClick={handleClearCache}
                title="Clear cached recipes"
              >
                Clear Cache
              </button>
            </div>

            <div className="api-stats-card">
              <h5>🚦 Rate Limiter (Token Bucket)</h5>
              <div className="stat-row">
                <span>Available Tokens:</span>
                <strong>{rateLimit.availableTokens} / {rateLimit.maxBurst}</strong>
              </div>
              <div className="stat-row">
                <span>Allowed Refill Rate:</span>
                <strong>{rateLimit.tokensPerMinute} req/min</strong>
              </div>
              <div className="stat-row">
                <span>Status:</span>
                <strong className={rateLimit.isThrottled ? 'text-warning' : 'text-success'}>
                  {rateLimit.isThrottled ? '⏸️ Throttling' : '🟢 Healthy'}
                </strong>
              </div>
            </div>

            <div className="api-stats-card">
              <h5>🔄 Request Deduplication</h5>
              <div className="stat-row">
                <span>In-Flight Requests:</span>
                <strong>{queue.inFlightRequests}</strong>
              </div>
              <div className="stat-row">
                <span>Deduplicated Concurrents:</span>
                <strong className="text-success">{queue.deduplicatedCount}</strong>
              </div>
              <div className="stat-row">
                <span>Queue Processing:</span>
                <strong>{queue.isProcessing ? 'Active ⚡' : 'Idle'}</strong>
              </div>
            </div>
          </div>
          <div className="api-stats-footer">
            <span>🛡️ <strong>Permanent Quota Protection Active</strong>: Duplicate requests are retrieved instantly from cache or deduplicated in-flight without consuming Gemini API tokens.</span>
          </div>
        </div>
      )}
    </aside>
  );
}
