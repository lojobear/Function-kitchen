import React from 'react';
import { KitchenAction } from '../../constants';
import { ItemSprite } from '../ItemSprite';

export interface ActionTileProps {
  action: KitchenAction;
  isActive: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

export const ActionTile = React.memo(
  function ActionTile({
    action,
    isActive,
    isDisabled,
    onClick,
  }: ActionTileProps) {
    return (
      <button
        className={`action-tile ${isActive ? 'active' : ''}`}
        onClick={onClick}
        disabled={isDisabled}
        title={action.displayName}
        data-action={action.name}
        aria-pressed={isActive}
        aria-label={`${action.displayName} function call`}
      >
        <span className="tile-sprite-thumb">
          <ItemSprite
            name={action.name}
            emoji={action.emoji}
            category={action.category || 'tool'}
            size="thumb"
          />
        </span>
        <span className="name">{action.name}()</span>
      </button>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.action.name === nextProps.action.name &&
      prevProps.action.displayName === nextProps.action.displayName &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.isDisabled === nextProps.isDisabled
    );
  }
);
