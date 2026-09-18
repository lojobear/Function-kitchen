import React from 'react';
import { Ingredient } from '../../constants';
import { ItemSprite } from '../ItemSprite';

export interface IngredientTileProps {
  ingredient: Ingredient;
  isSelected: boolean;
  isActive: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

export const IngredientTile = React.memo(
  function IngredientTile({
    ingredient,
    isSelected,
    isActive,
    isDisabled,
    onClick,
  }: IngredientTileProps) {
    return (
      <button
        className={`ingredient-tile ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}`}
        onClick={onClick}
        title={`${ingredient.name} (${ingredient.category || 'Material'})`}
        data-ingredient={ingredient.name}
        disabled={isDisabled}
        aria-pressed={isSelected}
        aria-label={`${ingredient.name} - ${ingredient.category || 'Material'}`}
      >
        <span className="tile-sprite-thumb">
          <ItemSprite
            name={ingredient.name}
            emoji={ingredient.emoji}
            category={ingredient.category}
            size="thumb"
          />
        </span>
        <span className="name">{ingredient.name}</span>
      </button>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.ingredient.name === nextProps.ingredient.name &&
      prevProps.ingredient.emoji === nextProps.ingredient.emoji &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.isDisabled === nextProps.isDisabled
    );
  }
);
