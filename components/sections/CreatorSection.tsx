import React from 'react';
import { PRESET_IDEAS } from '../../constants';

export interface CreatorSectionProps {
  inputGoal: string;
  setInputGoal: (val: string) => void;
  onSynthesize: (goal: string) => void;
  isCrafting: boolean;
  onOpenAddModal: () => void;
}

export const CreatorSection = React.memo(function CreatorSection({
  inputGoal,
  setInputGoal,
  onSynthesize,
  isCrafting,
  onOpenAddModal,
}: CreatorSectionProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputGoal.trim() && !isCrafting) {
      e.preventDefault();
      onSynthesize(inputGoal.trim());
    }
  };

  return (
    <section className="creator-section">
      <div className="creator-input-row">
        <input
          type="text"
          className="creator-input-field"
          placeholder="Input anything to create... e.g. Laser Sword, Magic Potion, Cybernetic Watch, Ramen"
          value={inputGoal}
          onChange={(e) => setInputGoal(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isCrafting}
        />
        <button
          className="synthesize-btn"
          onClick={() => inputGoal.trim() && onSynthesize(inputGoal.trim())}
          disabled={!inputGoal.trim() || isCrafting}
        >
          {isCrafting ? '⚡ Crafting...' : '✨ Synthesize & Mix'}
        </button>
        <button
          type="button"
          className="add-custom-btn catalog-btn"
          onClick={onOpenAddModal}
          title="Add a custom ingredient, material, or tool method to your catalog"
        >
          + Add to Catalog
        </button>
      </div>

      <div className="preset-ideas-row">
        <span className="preset-label">Preset Ideas:</span>
        <div className="preset-chips">
          {PRESET_IDEAS.map((preset) => (
            <button
              key={preset.name}
              className="preset-chip"
              onClick={() => {
                setInputGoal(preset.name);
                if (!isCrafting) {
                  onSynthesize(preset.name);
                }
              }}
              disabled={isCrafting}
            >
              <span>{preset.emoji}</span>
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
});
