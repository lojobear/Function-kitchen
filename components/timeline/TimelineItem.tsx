import React from 'react';
import { TimelineEntry } from '../../constants';
import { ItemSprite } from '../ItemSprite';

export interface TimelineItemProps {
  entry: TimelineEntry;
}

export const TimelineItem = React.memo(function TimelineItem({ entry }: TimelineItemProps) {
  const hasAction = entry.action && entry.ingredients;
  const hasText = entry.text;
  const isLoading = hasAction && entry.result === null;

  if (hasText && !hasAction) {
    return (
      <div className="timeline-item timeline-text-only">
        <div className="timeline-text-content">{entry.text}</div>
      </div>
    );
  }

  return (
    <div className={`timeline-item ${isLoading ? 'loading' : ''}`}>
      {hasText && <div className="timeline-text-content">{entry.text}</div>}
      {hasAction && (
        <>
          <div className="timeline-action">
            <ItemSprite
              name={entry.action!}
              emoji="🛠️"
              category="tool"
              size="thumb"
            />
            <div className="timeline-action-text">
              <span className="action-name">{entry.action}(</span>
              <span className="action-args">{entry.ingredients?.join(', ')}</span>
              <span className="action-name">)</span>
            </div>
          </div>
          <div className="timeline-result">
            <span className="timeline-result-arrow">↳</span>
            {isLoading ? (
              <span className="spinner">⏳</span>
            ) : (
              <div className="timeline-result-sprite-row">
                <ItemSprite
                  name={entry.result!.name}
                  emoji={entry.result!.emoji}
                  size="small"
                />
                <span className="result-name">{entry.result!.name}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
});
