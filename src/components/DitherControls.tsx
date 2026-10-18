import React from 'react';
import { DitherAlgorithm, SegaConsole } from '../types/sega';
import { SEGA_PALETTES } from '../utils/segaPalette';
import { SlidersHorizontal, Palette, Cpu, Sparkles } from 'lucide-react';

interface DitherControlsProps {
  consoleMode: SegaConsole;
  algorithm: DitherAlgorithm;
  ditherStrength: number;
  paletteMode: 'adaptive' | string;
  allowTileFlipping: boolean;
  onConsoleModeChange: (mode: SegaConsole) => void;
  onAlgorithmChange: (algo: DitherAlgorithm) => void;
  onDitherStrengthChange: (val: number) => void;
  onPaletteModeChange: (mode: 'adaptive' | string) => void;
  onAllowTileFlippingChange: (val: boolean) => void;
}

export const DitherControls: React.FC<DitherControlsProps> = ({
  consoleMode,
  algorithm,
  ditherStrength,
  paletteMode,
  allowTileFlipping,
  onConsoleModeChange,
  onAlgorithmChange,
  onDitherStrengthChange,
  onPaletteModeChange,
  onAllowTileFlippingChange,
}) => {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4 text-neutral-200">
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
        <SlidersHorizontal className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-semibold text-white">VDP Hardware & Dithering Configuration</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* Console Target Mode */}
        <div>
          <label className="block text-neutral-400 mb-1.5 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>Target Sega VDP Mode</span>
          </label>
          <select
            value={consoleMode}
            onChange={(e) => onConsoleModeChange(e.target.value as SegaConsole)}
            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-amber-400"
          >
            <option value="genesis_h40">Mega Drive H40 (320x224 · 40x28 tiles)</option>
            <option value="genesis_h32">Mega Drive H32 (256x224 · 32x28 tiles)</option>
            <option value="master_system">Master System (256x192 · 32x24 tiles)</option>
          </select>
        </div>

        {/* Dithering Algorithm */}
        <div>
          <label className="block text-neutral-400 mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Dithering Algorithm</span>
          </label>
          <select
            value={algorithm}
            onChange={(e) => onAlgorithmChange(e.target.value as DitherAlgorithm)}
            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-amber-400"
          >
            <option value="bayer4">Bayer 4x4 (Classic 16-Bit Mesh)</option>
            <option value="bayer8">Bayer 8x8 (Fine Ordered Pattern)</option>
            <option value="bayer2">Bayer 2x2 (Coarse Ordered Matrix)</option>
            <option value="checkerboard">Sega Checkerboard (CRT Pseudo-Alpha)</option>
            <option value="floyd-steinberg">Floyd-Steinberg (Error Diffusion)</option>
            <option value="atkinson">Atkinson (High Contrast Retro Mac/Arcade)</option>
            <option value="sierra2">Sierra-2 (Balanced Error Diffusion)</option>
            <option value="none">No Dither (Hard Color Quantization)</option>
          </select>
        </div>

        {/* Dither Strength */}
        <div>
          <div className="flex justify-between text-neutral-400 mb-1.5">
            <span>Dither Strength</span>
            <span className="font-mono tabular-nums text-amber-400">
              {Math.round(ditherStrength * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={ditherStrength}
            onChange={(e) => onDitherStrengthChange(Number(e.target.value))}
            className="w-full accent-amber-400"
          />
        </div>

        {/* Palette Preset / Adaptive */}
        <div>
          <label className="block text-neutral-400 mb-1.5 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span>Color Palette (16 Colors)</span>
          </label>
          <select
            value={paletteMode}
            onChange={(e) => onPaletteModeChange(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-amber-400"
          >
            <option value="adaptive">Adaptive 9-Bit (K-Means Camera Snapped)</option>
            {SEGA_PALETTES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* VRAM Deduplication Toggle */}
      <div className="flex items-center justify-between border-t border-neutral-800/80 pt-3 text-xs">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allowTileFlipping}
            onChange={(e) => onAllowTileFlippingChange(e.target.checked)}
            className="accent-amber-400 rounded"
          />
          <span className="text-neutral-300">
            Allow H-Flip & V-Flip Tile Reuse (Sega VDP native Nametable attribute optimization)
          </span>
        </label>
        <span className="text-neutral-500 font-mono">Bits 11-12 of VDP Plane Word</span>
      </div>
    </div>
  );
};
