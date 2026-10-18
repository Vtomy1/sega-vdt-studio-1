import React, { useRef } from 'react';
import { Camera, SwitchCamera, Upload, Sparkles, Sliders, Play, Pause } from 'lucide-react';

interface CameraControlsProps {
  isStreaming: boolean;
  isPaused: boolean;
  facingMode: 'environment' | 'user';
  availableDevices: MediaDeviceInfo[];
  selectedDeviceId: string;
  brightness: number;
  contrast: number;
  saturation: number;
  isMirrored: boolean;
  onTogglePlayPause: () => void;
  onSwitchCamera: () => void;
  onSelectDevice: (deviceId: string) => void;
  onUploadImage: (file: File) => void;
  onLoadPreset: (type: 'synthwave' | 'color_bars' | 'portrait' | 'cyberpunk') => void;
  onBrightnessChange: (v: number) => void;
  onContrastChange: (v: number) => void;
  onSaturationChange: (v: number) => void;
  onMirrorToggle: () => void;
  onCaptureSnapshot: () => void;
  cameraError: string | null;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  isStreaming,
  isPaused,
  facingMode,
  availableDevices,
  selectedDeviceId,
  brightness,
  contrast,
  saturation,
  isMirrored,
  onTogglePlayPause,
  onSwitchCamera,
  onSelectDevice,
  onUploadImage,
  onLoadPreset,
  onBrightnessChange,
  onContrastChange,
  onSaturationChange,
  onMirrorToggle,
  onCaptureSnapshot,
  cameraError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4 text-neutral-200">
      {/* Top row: Camera status, Front/Back switch, Freeze */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">Video & Camera Source</span>
          <span className="text-xs text-neutral-400 font-mono">
            {facingMode === 'environment' ? 'Rear / Back Cam' : 'Front / User Cam'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Switch Camera Button (Front / Back cam) */}
          <button
            onClick={onSwitchCamera}
            title={`Switch to ${facingMode === 'environment' ? 'Front Camera' : 'Back Camera'}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 rounded border border-neutral-700 transition-colors text-neutral-200"
          >
            <SwitchCamera className="w-3.5 h-3.5 text-amber-400" />
            <span>{facingMode === 'environment' ? 'Switch to Front Cam' : 'Switch to Back Cam'}</span>
          </button>

          {/* Freeze / Live Toggle */}
          <button
            onClick={onTogglePlayPause}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
              isPaused
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume Stream' : 'Freeze Frame'}</span>
          </button>

          {/* Snapshot Button */}
          <button
            onClick={onCaptureSnapshot}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-700 transition-colors text-neutral-200"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>Snapshot</span>
          </button>
        </div>
      </div>

      {cameraError && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded text-xs text-red-300 flex items-center justify-between">
          <span>Camera notice: {cameraError}. (Using offline retro test pattern)</span>
          <button
            onClick={() => onLoadPreset('synthwave')}
            className="px-2 py-1 bg-red-900/60 hover:bg-red-900 rounded text-white font-medium"
          >
            Load Test Card
          </button>
        </div>
      )}

      {/* Device Picker & Mirroring */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block text-neutral-400 mb-1">Select Video Input Device</label>
          <select
            value={selectedDeviceId}
            onChange={(e) => onSelectDevice(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-amber-400"
          >
            {availableDevices.length === 0 ? (
              <option value="">Default System Camera</option>
            ) : (
              availableDevices.map((d, idx) => (
                <option key={d.deviceId || idx} value={d.deviceId}>
                  {d.label || `Camera ${idx + 1} (${facingMode})`}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={onMirrorToggle}
            className={`flex-1 px-3 py-1.5 rounded border transition-colors ${
              isMirrored
                ? 'bg-neutral-800 text-amber-400 border-amber-400/50'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
          >
            Horizontal Flip (Mirror)
          </button>

          {/* Upload Image button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors text-neutral-200"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Upload Photo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadImage(file);
            }}
          />
        </div>
      </div>

      {/* Preset Test Patterns */}
      <div className="border-t border-neutral-800/80 pt-3">
        <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Preset Test Cards:</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => onLoadPreset('synthwave')}
            className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded text-neutral-300 transition-colors"
          >
            Synthwave 3D Grid
          </button>
          <button
            onClick={() => onLoadPreset('color_bars')}
            className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded text-neutral-300 transition-colors"
          >
            Sega SMPTE Bars
          </button>
          <button
            onClick={() => onLoadPreset('cyberpunk')}
            className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded text-neutral-300 transition-colors"
          >
            Streets of Neon
          </button>
          <button
            onClick={() => onLoadPreset('portrait')}
            className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded text-neutral-300 transition-colors"
          >
            Studio Portrait
          </button>
        </div>
      </div>

      {/* Pre-Processing Image Sliders (Brightness, Contrast, Saturation) */}
      <div className="border-t border-neutral-800/80 pt-3">
        <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-2">
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span>Analog Pre-Processing (Sensor Calibration):</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <div className="flex justify-between text-neutral-400 mb-1">
              <span>Exposure</span>
              <span className="font-mono tabular-nums text-amber-400">{brightness > 0 ? `+${brightness}` : brightness}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={brightness}
              onChange={(e) => onBrightnessChange(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-neutral-400 mb-1">
              <span>Contrast</span>
              <span className="font-mono tabular-nums text-amber-400">{contrast.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={contrast}
              onChange={(e) => onContrastChange(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-neutral-400 mb-1">
              <span>Saturation</span>
              <span className="font-mono tabular-nums text-amber-400">{saturation.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0"
              max="2.5"
              step="0.1"
              value={saturation}
              onChange={(e) => onSaturationChange(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
