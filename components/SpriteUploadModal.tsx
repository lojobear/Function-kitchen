/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ItemSprite } from './ItemSprite';
import {
  processSpriteImage,
  saveCustomSpriteToCloud,
  deleteCustomSpriteFromCloud,
  getCustomSprite,
  getAllCustomSprites,
  subscribeCustomSprites,
  CustomSpriteRecord,
} from '../lib/custom-sprite-service';
import { Ingredient, KitchenAction, FinishedItem } from '../constants';
import { auth } from '../firebase';

export interface SpriteUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTargetName?: string;
  initialTargetType?: 'item' | 'tool' | 'ingredient' | 'any';
  inventory?: Ingredient[];
  tools?: KitchenAction[];
  finishedItems?: FinishedItem[];
}

export function SpriteUploadModal({
  isOpen,
  onClose,
  initialTargetName = '',
  initialTargetType = 'item',
  inventory = [],
  tools = [],
  finishedItems = [],
}: SpriteUploadModalProps) {
  const [targetName, setTargetName] = useState<string>(initialTargetName);
  const [targetType, setTargetType] = useState<'item' | 'tool' | 'ingredient' | 'any'>(initialTargetType);
  const [resolution, setResolution] = useState<number>(64);
  const [authorName, setAuthorName] = useState<string>(auth.currentUser?.displayName || 'Artisan');
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery'>('upload');
  const [communitySprites, setCommunitySprites] = useState<Record<string, CustomSpriteRecord>>(() =>
    getAllCustomSprites()
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync initial target name when opened
  useEffect(() => {
    if (initialTargetName) {
      setTargetName(initialTargetName);
    }
  }, [initialTargetName]);

  // Subscribe to community custom sprites
  useEffect(() => {
    setCommunitySprites(getAllCustomSprites());
    const unsub = subscribeCustomSprites((updated) => {
      setCommunitySprites({ ...updated });
    });
    return unsub;
  }, []);

  // Check if current target already has a custom sprite
  const existingCustomSprite = useMemo(() => {
    return targetName ? getCustomSprite(targetName) : undefined;
  }, [targetName, communitySprites]);

  // Available candidate suggestions from forge catalog
  const suggestions = useMemo(() => {
    const list: Array<{ name: string; type: 'item' | 'tool' | 'ingredient'; emoji: string }> = [];
    finishedItems.forEach((it) => list.push({ name: it.name, type: 'item', emoji: it.emoji }));
    inventory.forEach((ing) => list.push({ name: ing.name, type: 'ingredient', emoji: ing.emoji }));
    tools.forEach((tl) => list.push({ name: tl.name, type: 'tool', emoji: tl.emoji }));
    return list;
  }, [finishedItems, inventory, tools]);

  if (!isOpen) return null;

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (PNG, JPG, SVG, WebP, or GIF).');
      return;
    }
    setErrorMessage(null);
    setIsProcessing(true);
    setFileName(file.name);

    try {
      const processedUrl = await processSpriteImage(file, resolution);
      setUploadedDataUrl(processedUrl);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error reading image file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSaveToCloud = async () => {
    if (!targetName.trim()) {
      setErrorMessage('Please specify which item or tool this sprite will replace.');
      return;
    }
    if (!uploadedDataUrl) {
      setErrorMessage('Please select or drop an image file first.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await saveCustomSpriteToCloud({
        targetName: targetName.trim(),
        imageUrl: uploadedDataUrl,
        targetType,
        authorName: authorName.trim() || 'Artisan',
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save sprite to cloud.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevertDefault = async (targetToRevert: string) => {
    if (!confirm(`Revert "${targetToRevert}" back to default procedural sprite generation?`)) {
      return;
    }
    try {
      await deleteCustomSpriteFromCloud(targetToRevert);
      if (targetName === targetToRevert) {
        setUploadedDataUrl(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to revert sprite.');
    }
  };

  const galleryList = Object.values(communitySprites);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="sprite-uploader-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon">🎨</span>
            <div>
              <h3 className="modal-title">Forge Custom Sprite Studio</h3>
              <p className="modal-subtitle">
                Upload custom sprites to replace game items. All uploads save to the cloud database for everyone to see!
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Top Tabs */}
        <div className="uploader-tabs-row">
          <button
            type="button"
            className={`uploader-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <span>⬆️ Upload & Replace Sprite</span>
          </button>
          <button
            type="button"
            className={`uploader-tab-btn ${activeTab === 'gallery' ? 'active' : ''}`}
            onClick={() => setActiveTab('gallery')}
          >
            <span>🌍 Community Sprites ({galleryList.length})</span>
          </button>
        </div>

        {activeTab === 'upload' ? (
          <div className="uploader-content-grid">
            {/* Left Column: Form & Dropzone */}
            <div className="uploader-form-col">
              {/* Target Item Selection */}
              <div className="uploader-field-group">
                <label className="field-label">Target Item / Tool to Replace:</label>
                <div className="target-input-row">
                  <input
                    type="text"
                    className="target-name-input"
                    placeholder="e.g. Iron Sword, Carbon Steel Ingot, smelt..."
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                  />
                  <select
                    className="target-type-select"
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value as any)}
                  >
                    <option value="item">Crafted Item</option>
                    <option value="ingredient">Material</option>
                    <option value="tool">Tool / Action</option>
                    <option value="any">General</option>
                  </select>
                </div>

                {/* Quick Selection Chips */}
                <div className="quick-suggestions-box">
                  <span className="quick-label">Quick Pick:</span>
                  <div className="quick-chips-wrap">
                    {suggestions.slice(0, 10).map((sugg) => (
                      <button
                        key={`${sugg.type}-${sugg.name}`}
                        type="button"
                        className={`quick-chip ${targetName.toLowerCase() === sugg.name.toLowerCase() ? 'active' : ''}`}
                        onClick={() => {
                          setTargetName(sugg.name);
                          setTargetType(sugg.type);
                        }}
                      >
                        <span>{sugg.emoji}</span>
                        <span>{sugg.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Resolution Choice */}
              <div className="uploader-field-group">
                <div className="resolution-choice-row">
                  <label className="field-label">Pixel Art Format:</label>
                  <div className="resolution-pills">
                    <button
                      type="button"
                      className={`res-pill ${resolution === 64 ? 'active' : ''}`}
                      onClick={() => {
                        setResolution(64);
                      }}
                    >
                      64×64 Crisp Pixel Art
                    </button>
                    <button
                      type="button"
                      className={`res-pill ${resolution === 128 ? 'active' : ''}`}
                      onClick={() => {
                        setResolution(128);
                      }}
                    >
                      128×128 HD Pixel Art
                    </button>
                  </div>
                </div>
              </div>

              {/* Drag & Drop Upload Zone */}
              <div
                className={`upload-dropzone ${isDragOver ? 'drag-over' : ''} ${uploadedDataUrl ? 'has-file' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <div className="dropzone-inner">
                  <span className="dropzone-icon">{isProcessing ? '⏳' : uploadedDataUrl ? '✨' : '📁'}</span>
                  <div className="dropzone-text">
                    {isProcessing ? (
                      <p>Optimizing and pixelating sprite image...</p>
                    ) : uploadedDataUrl ? (
                      <p>
                        <strong>{fileName || 'Image Loaded'}</strong>
                        <br />
                        <span className="dropzone-sub">Click or drag another image to replace</span>
                      </p>
                    ) : (
                      <p>
                        <strong>Click to browse</strong> or drag & drop sprite here
                        <br />
                        <span className="dropzone-sub">Supports PNG, JPG, GIF, WebP, SVG</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Author Attribution */}
              <div className="uploader-field-group">
                <label className="field-label">Creator / Artisan Name:</label>
                <input
                  type="text"
                  className="author-name-input"
                  placeholder="Your display name..."
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                />
              </div>

              {errorMessage && <div className="uploader-error-alert">{errorMessage}</div>}
              {saveSuccess && (
                <div className="uploader-success-alert">
                  ✓ Sprite saved and broadcast to all forge players!
                </div>
              )}

              {/* Action Buttons */}
              <div className="uploader-actions-row">
                <button
                  type="button"
                  className="publish-sprite-btn"
                  disabled={!targetName.trim() || !uploadedDataUrl || isSaving || isProcessing}
                  onClick={handleSaveToCloud}
                >
                  {isSaving ? '⏳ Saving for Everyone...' : '🚀 Publish Sprite (Saves for Everyone)'}
                </button>

                {existingCustomSprite && (
                  <button
                    type="button"
                    className="revert-default-btn"
                    onClick={() => handleRevertDefault(targetName)}
                  >
                    🔄 Revert to Procedural
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Live Comparison Preview */}
            <div className="uploader-preview-col">
              <h4 className="preview-heading">Live Forge Comparison</h4>

              <div className="preview-cards-container">
                {/* Default Procedural */}
                <div className="preview-box">
                  <span className="preview-box-label">Default Procedural Engine:</span>
                  <div className="preview-sprite-wrapper">
                    <ItemSprite
                      name={targetName || 'Preview Item'}
                      emoji="⚔️"
                      size="large"
                      showRarityBadge={true}
                      showCustomBadge={false}
                    />
                  </div>
                  <span className="preview-status-text">64 × 64 Procedural Synthesis</span>
                </div>

                {/* Uploaded Custom Replacement */}
                <div className="preview-box highlight">
                  <span className="preview-box-label">Your Uploaded Replacement:</span>
                  <div className="preview-sprite-wrapper">
                    {uploadedDataUrl ? (
                      <div
                        className="custom-preview-frame"
                        style={{
                          width: '140px',
                          height: '140px',
                          borderRadius: '12px',
                          background: '#090d16',
                          border: '2px solid #38bdf8',
                          boxShadow: '0 0 16px rgba(56, 189, 248, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={uploadedDataUrl}
                          alt="Custom Sprite Preview"
                          style={{
                            width: '112px',
                            height: '112px',
                            objectFit: 'contain',
                            imageRendering: 'pixelated',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: '#38bdf8',
                            color: '#040d1a',
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '4px',
                          }}
                        >
                          CUSTOM
                        </div>
                      </div>
                    ) : existingCustomSprite ? (
                      <div
                        className="custom-preview-frame"
                        style={{
                          width: '140px',
                          height: '140px',
                          borderRadius: '12px',
                          background: '#090d16',
                          border: '2px solid #10b981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={existingCustomSprite.imageUrl}
                          alt="Existing Custom Sprite"
                          style={{
                            width: '112px',
                            height: '112px',
                            objectFit: 'contain',
                            imageRendering: 'pixelated',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: '#10b981',
                            color: '#040d1a',
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '4px',
                          }}
                        >
                          SAVED
                        </div>
                      </div>
                    ) : (
                      <div className="preview-empty-placeholder">
                        <span>📷</span>
                        <p>Upload an image to see live replacement</p>
                      </div>
                    )}
                  </div>
                  <span className="preview-status-text">
                    {uploadedDataUrl
                      ? 'Ready to publish to cloud'
                      : existingCustomSprite
                      ? `Active cloud custom sprite by ${existingCustomSprite.authorName || 'Artisan'}`
                      : 'No custom image selected yet'}
                  </span>
                </div>
              </div>

              {/* Quick Info Box */}
              <div className="uploader-info-box">
                <h5>💡 Sprite Crafting Tips</h5>
                <ul>
                  <li>Transparent PNG or pixel art works best for crisp RPG contours.</li>
                  <li>Images are automatically optimized and scaled with pixelated interpolation.</li>
                  <li>Once published, every player in the forge sees this sprite instantly!</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          /* Community Gallery Tab */
          <div className="community-gallery-view">
            <div className="gallery-header-info">
              <h4>All Active Custom Sprites in Cloud Storage</h4>
              <p>These sprites replace default procedural visuals for all connected players.</p>
            </div>

            {galleryList.length === 0 ? (
              <div className="gallery-empty-state">
                <span>🎨</span>
                <h4>No custom sprites uploaded yet</h4>
                <p>Be the first artisan to upload a custom sprite and share it with everyone!</p>
                <button
                  type="button"
                  className="switch-upload-btn"
                  onClick={() => setActiveTab('upload')}
                >
                  Upload a Sprite Now
                </button>
              </div>
            ) : (
              <div className="gallery-sprites-grid">
                {galleryList.map((sprite) => (
                  <div key={sprite.id} className="gallery-sprite-card">
                    <div className="gallery-sprite-thumb-wrap">
                      <img
                        src={sprite.imageUrl}
                        alt={sprite.targetName}
                        className="gallery-sprite-img"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                    <div className="gallery-sprite-meta">
                      <h5 className="gallery-sprite-name">{sprite.targetName}</h5>
                      <span className="gallery-sprite-author">
                        By {sprite.authorName || 'Artisan'}
                      </span>
                      <span className="gallery-sprite-type">
                        Type: {sprite.targetType || 'item'}
                      </span>
                    </div>
                    <div className="gallery-card-actions">
                      <button
                        type="button"
                        className="gallery-edit-btn"
                        onClick={() => {
                          setTargetName(sprite.targetName);
                          setTargetType(sprite.targetType || 'item');
                          setActiveTab('upload');
                        }}
                        title="Upload a new replacement"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        className="gallery-delete-btn"
                        onClick={() => handleRevertDefault(sprite.targetName)}
                        title="Revert to procedural"
                      >
                        Revert
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
