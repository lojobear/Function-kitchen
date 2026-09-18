/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TimelineEntry } from '../constants';
import { ItemSprite } from './ItemSprite';
import {
  Terminal,
  Activity,
  Zap,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Code2,
  Workflow,
  ArrowRight,
  Clock,
  Layers,
  Cpu,
  Copy,
  Check,
} from 'lucide-react';

export interface LiveFunctionCallLogProps {
  timeline: TimelineEntry[];
  isCrafting: boolean;
  activeAction: string | null;
  craftingProgress: {
    step: number;
    total: number | null;
    phase: 'planning' | 'processing' | 'revealing';
  };
  targetGoal: string;
  onClearTimeline?: () => void;
  onQuickSampleSelect?: (sample: string) => void;
}

export function LiveFunctionCallLog({
  timeline,
  isCrafting,
  activeAction,
  craftingProgress,
  targetGoal,
  onClearTimeline,
  onQuickSampleSelect,
}: LiveFunctionCallLogProps) {
  const [viewMode, setViewMode] = useState<'pipeline' | 'code'>('pipeline');
  const [copied, setCopied] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const consoleRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll pipeline to the newest entry or active action
  useEffect(() => {
    if (trackRef.current && viewMode === 'pipeline') {
      trackRef.current.scrollTo({
        left: trackRef.current.scrollWidth,
        behavior: 'smooth',
      });
    }
  }, [timeline.length, activeAction, craftingProgress.phase, viewMode]);

  // Auto-scroll console log
  useEffect(() => {
    if (consoleRef.current && viewMode === 'code') {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [timeline.length, activeAction, viewMode]);

  // Derived metrics
  const functionCallCount = useMemo(
    () => timeline.filter((e) => Boolean(e.action)).length,
    [timeline]
  );
  const completedCalls = useMemo(
    () => timeline.filter((e) => Boolean(e.action && e.result)).length,
    [timeline]
  );

  const phaseDescription = useMemo(() => {
    if (!isCrafting) {
      if (timeline.length > 0) return 'Execution pipeline completed';
      return 'Ready for function call dispatch';
    }
    if (craftingProgress.phase === 'planning') {
      return `Gemini 3.8 Flash formulating recipe sequence for "${targetGoal || 'request'}"...`;
    }
    if (craftingProgress.phase === 'processing') {
      return activeAction
        ? `Executing tool call: ${activeAction}() with intermediate inputs...`
        : 'Transforming sub-assemblies through tool execution...';
    }
    return 'Revealing procedural component sprite matrix...';
  }, [isCrafting, craftingProgress.phase, activeAction, targetGoal, timeline.length]);

  const handleCopyLogs = () => {
    const rawText = timeline
      .map((entry, index) => {
        if (entry.text && !entry.action) {
          return `[${index + 1}] MSG: ${entry.text}`;
        }
        const inputs = entry.ingredients?.join(', ') || 'none';
        const result = entry.result
          ? `${entry.result.name} (${entry.result.category || 'Component'})`
          : 'Executing...';
        return `[${index + 1}] CALL ${entry.action}(${inputs}) => ${result}`;
      })
      .join('\n');

    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="live-log-top-container" aria-label="Live Function Call Log">
      {/* Dynamic Animated Status Scanline when crafting */}
      {isCrafting && <div className="live-log-laser-scanner" />}

      {/* Header Bar */}
      <div className="live-log-header">
        <div className="live-log-header-left">
          <div className="live-log-title-group">
            <div className="live-log-icon-box">
              {isCrafting ? (
                <Activity size={18} className="icon-pulse text-blue-400" />
              ) : (
                <Terminal size={18} className="text-emerald-400" />
              )}
            </div>
            <div>
              <h2 className="live-log-title">Live Function Call Execution Log</h2>
              <p className="live-log-subtitle">
                Real-time Gemini 3.8 Flash tool execution & procedural synthesis pipeline
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="live-log-status-badges">
            {isCrafting ? (
              <span className="badge-live-pulse">
                <span className="pulse-ring" />
                <span className="pulse-dot" />
                LIVE STREAMING
              </span>
            ) : timeline.length > 0 ? (
              <span className="badge-idle-ready">
                <CheckCircle2 size={13} className="text-emerald-500" />
                PIPELINE COMPLETE
              </span>
            ) : (
              <span className="badge-standby">
                <Cpu size={13} className="text-slate-400" />
                STANDBY
              </span>
            )}

            {functionCallCount > 0 && (
              <span className="badge-metrics">
                <Layers size={12} />
                <span>{completedCalls} / {functionCallCount} Tools Executed</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div className="live-log-header-right">
          {/* View Mode Toggle */}
          <div className="log-mode-segmented">
            <button
              type="button"
              className={`mode-btn ${viewMode === 'pipeline' ? 'active' : ''}`}
              onClick={() => setViewMode('pipeline')}
              title="Interactive Visual Pipeline Flow"
            >
              <Workflow size={14} />
              <span>Pipeline Flow</span>
            </button>
            <button
              type="button"
              className={`mode-btn ${viewMode === 'code' ? 'active' : ''}`}
              onClick={() => setViewMode('code')}
              title="Raw Function Call Syntax Stream"
            >
              <Code2 size={14} />
              <span>Code Stream</span>
            </button>
          </div>

          {timeline.length > 0 && (
            <>
              <button
                type="button"
                className="log-control-btn"
                onClick={handleCopyLogs}
                title="Copy function call trace"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              {onClearTimeline && !isCrafting && (
                <button
                  type="button"
                  className="log-control-btn text-rose-400 hover:text-rose-600"
                  onClick={onClearTimeline}
                  title="Clear timeline log"
                >
                  <RotateCcw size={14} />
                  <span>Clear</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Live Activity Ticker Line */}
      <div className={`live-log-ticker ${isCrafting ? 'active' : ''}`}>
        <div className="ticker-pulse-icon">
          {isCrafting ? <Zap size={14} className="animate-spin-slow text-amber-400" /> : <Terminal size={14} className="text-slate-400" />}
        </div>
        <div className="ticker-text" aria-live="polite">
          <span className="ticker-label">
            {isCrafting ? 'LIVE DISPATCH' : 'SYSTEM STATUS'}:
          </span>
          <span className="ticker-content">{phaseDescription}</span>
        </div>
        {isCrafting && (
          <div className="ticker-indicator">
            <span className="indicator-bar" />
            <span className="indicator-bar" />
            <span className="indicator-bar" />
          </div>
        )}
      </div>

      {/* Empty State when no tool calls have run yet */}
      {timeline.length === 0 ? (
        <div className="live-log-empty-state">
          <div className="empty-state-visual">
            <div className="empty-node">
              <span className="node-icon">📦</span>
              <span className="node-label">Raw Materials</span>
            </div>
            <div className="empty-arrow">
              <span className="empty-arrow-line" />
              <Zap size={15} className="text-amber-400" />
            </div>
            <div className="empty-node highlight">
              <span className="node-icon">⚡</span>
              <span className="node-label">Gemini Function Call</span>
            </div>
            <div className="empty-arrow">
              <span className="empty-arrow-line" />
              <ArrowRight size={15} className="text-blue-400" />
            </div>
            <div className="empty-node">
              <span className="node-icon">🔮</span>
              <span className="node-label">64×64 Pixel Sprite</span>
            </div>
          </div>
          <p className="empty-state-desc">
            Type any item, weapon, tech, or artifact above and click <strong>"Synthesize & Mix"</strong> to watch Gemini stream function calls live!
          </p>
          {onQuickSampleSelect && (
            <div className="empty-quick-samples">
              <span className="quick-label">Try quick live synthesis:</span>
              {['Laser Sword', 'Cybernetic Watch', 'Dragon Elixir'].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  className="quick-sample-chip"
                  onClick={() => onQuickSampleSelect(sample)}
                  disabled={isCrafting}
                >
                  <Sparkles size={12} className="text-amber-400" />
                  <span>{sample}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : viewMode === 'pipeline' ? (
        /* Visual Pipeline View */
        <div className="live-log-pipeline-wrapper">
          <div className="live-log-pipeline-track" ref={trackRef}>
            {timeline.map((entry, index) => {
              const isLast = index === timeline.length - 1;
              const hasAction = Boolean(entry.action);
              const isLoading = hasAction && entry.result === null;
              const isExecutingNow = isLoading || (isCrafting && isLast && activeAction === entry.action);

              // Text-only notification (e.g. final synthesis message)
              if (!hasAction && entry.text) {
                return (
                  <React.Fragment key={entry.id}>
                    <div className="pipeline-step-card text-card">
                      <div className="step-card-header">
                        <span className="step-badge-num">EVENT</span>
                        <span className="step-time">
                          <Clock size={11} />
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <div className="step-card-body text-body">
                        <span className="event-emoji">✨</span>
                        <div className="event-text">{entry.text}</div>
                      </div>
                    </div>
                    {!isLast && (
                      <div className="pipeline-connector-node">
                        <span className="connector-wire" />
                        <ChevronRight size={16} className="connector-chevron" />
                      </div>
                    )}
                  </React.Fragment>
                );
              }

              return (
                <React.Fragment key={entry.id}>
                  <div
                    className={`pipeline-step-card ${isExecutingNow ? 'executing-now' : 'resolved'}`}
                    data-step={index + 1}
                  >
                    {/* Active Halo Glow */}
                    {isExecutingNow && <div className="card-active-halo" />}

                    {/* Step Card Header */}
                    <div className="step-card-header">
                      <div className="step-badge-group">
                        <span className="step-badge-num">
                          STEP #{String(index + 1).padStart(2, '0')}
                        </span>
                        {isExecutingNow ? (
                          <span className="step-state-tag executing">
                            <span className="mini-spin">⚙️</span>
                            <span>EXECUTING</span>
                          </span>
                        ) : (
                          <span className="step-state-tag done">
                            <Check size={11} />
                            <span>RESOLVED</span>
                          </span>
                        )}
                      </div>
                      <span className="step-time">
                        <Clock size={11} />
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    {/* Tool Function Call Signature */}
                    <div className="step-function-box">
                      <div className="function-signature-row">
                        <span className="fn-icon-thumb">
                          <ItemSprite
                            name={entry.action || 'tool'}
                            emoji="🛠️"
                            category="tool"
                            size="thumb"
                          />
                        </span>
                        <code className="fn-signature">
                          <span className="fn-call-prefix">tool.</span>
                          <span className="fn-name">{entry.action}</span>
                          <span className="fn-paren">(</span>
                        </code>
                      </div>

                      {/* Inputs / Arguments Passed */}
                      <div className="fn-args-container">
                        {entry.ingredients && entry.ingredients.length > 0 ? (
                          entry.ingredients.map((ing, ingIdx) => (
                            <span key={`${entry.id}-ing-${ingIdx}`} className="arg-chip">
                              <span className="arg-bullet">•</span>
                              <span className="arg-name">{ing}</span>
                            </span>
                          ))
                        ) : (
                          <span className="arg-empty">void args</span>
                        )}
                      </div>
                      <div className="fn-paren-close">)</div>
                    </div>

                    {/* Animated Energy Flow Beam */}
                    <div className={`energy-flow-beam ${isExecutingNow ? 'active-beam' : 'resolved-beam'}`}>
                      <div className="beam-track">
                        <span className="beam-sparkle" />
                        <span className="beam-sparkle secondary" />
                      </div>
                      <div className="beam-badge">
                        {isExecutingNow ? (
                          <span className="beam-status-pulse">TRANSFORMING</span>
                        ) : (
                          <span className="beam-status-arrow">↳ OUTPUT</span>
                        )}
                      </div>
                    </div>

                    {/* Result Stage */}
                    <div className="step-result-box">
                      {isLoading ? (
                        <div className="result-loading-state">
                          <div className="mini-matrix-scanner">
                            <span className="scanner-line" />
                          </div>
                          <div className="result-loading-text">
                            <span className="loading-title">Synthesizing intermediate...</span>
                            <span className="loading-sub">Calculating combination & matrix</span>
                          </div>
                        </div>
                      ) : entry.result ? (
                        <div className="result-resolved-state">
                          <div className="result-sprite-frame">
                            <ItemSprite
                              name={entry.result.name}
                              emoji={entry.result.emoji}
                              category={entry.result.category}
                              size="small"
                              interactive
                            />
                          </div>
                          <div className="result-info">
                            <span className="result-title">{entry.result.name}</span>
                            <span className="result-category-badge">
                              {entry.result.category || 'Component'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="result-fallback">
                          <span className="text-slate-400 italic">No output produced</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Flow Connector Between Steps */}
                  {!isLast && (
                    <div className="pipeline-connector-node">
                      <div className={`connector-wire ${isExecutingNow ? 'pulsing-wire' : ''}`} />
                      <div className="connector-arrow-chip">
                        <ChevronRight size={16} className="connector-chevron" />
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ) : (
        /* Code / Console Stream View */
        <div className="live-log-console-wrapper" ref={consoleRef}>
          <div className="console-lines">
            <div className="console-line system">
              <span className="line-num">00</span>
              <span className="line-prefix">SYS</span>
              <span className="line-content">
                Gemini 3.8 Flash Function Calling Orchestrator initialized.
              </span>
            </div>
            {timeline.map((entry, index) => {
              const lineNum = String(index + 1).padStart(2, '0');
              const timeStr = new Date(entry.timestamp).toLocaleTimeString();

              if (!entry.action && entry.text) {
                return (
                  <div key={entry.id} className="console-line info">
                    <span className="line-num">{lineNum}</span>
                    <span className="line-time">[{timeStr}]</span>
                    <span className="line-prefix text-purple-400">NOTE</span>
                    <span className="line-content">{entry.text}</span>
                  </div>
                );
              }

              return (
                <React.Fragment key={entry.id}>
                  <div className="console-line call">
                    <span className="line-num">{lineNum}</span>
                    <span className="line-time">[{timeStr}]</span>
                    <span className="line-prefix text-blue-400">CALL</span>
                    <span className="line-content">
                      <strong className="text-blue-300">{entry.action}</strong>
                      <span className="text-slate-400">(</span>
                      <span className="text-amber-300">
                        {JSON.stringify({ ingredients: entry.ingredients })}
                      </span>
                      <span className="text-slate-400">)</span>
                    </span>
                  </div>
                  <div className="console-line response">
                    <span className="line-num">{lineNum}b</span>
                    <span className="line-time">[{timeStr}]</span>
                    <span className="line-prefix text-emerald-400">RETN</span>
                    <span className="line-content">
                      {entry.result ? (
                        <span className="text-emerald-300">
                          {`-> { name: "${entry.result.name}", category: "${entry.result.category || 'Component'}", emoji: "${entry.result.emoji}" }`}
                        </span>
                      ) : (
                        <span className="text-yellow-400 animate-pulse">
                          ⏳ Waiting for model response / matrix synthesis...
                        </span>
                      )}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
