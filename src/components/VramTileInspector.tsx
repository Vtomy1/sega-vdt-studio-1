import React, { useState } from 'react';
import { PpuAnalysis, SegaColor } from '../types/sega';
import { Layers, Database, Sparkles, Sliders } from 'lucide-react';
import { createSegaColor } from '../utils/segaPalette';

interface VramTileInspectorProps {
  analysis: PpuAnalysis | null;
  highlightedTileId: number | null;
  onSelectTile: (tileId: number | null) => void;
  onUpdatePaletteColor: (index: number, newColor: SegaColor) => void;
  onOpenTileEditor: (tileId: number) => void;
}

export const VramTileInspector: React.FC<VramTileInspectorProps> = ({
  analysis,
  highlightedTileId,
  onSelectTile,
  onUpdatePaletteColor,
  onOpenTileEditor,
}) => {
  const [selectedColorIdx, setSelectedColorIdx] = useState<number | null>(null);

  if (!analysis) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 text-center text-neutral-400">
        Processing video stream to analyze VRAM pattern tables...
      </div>
    );
  }

  // Calculate usage counts for each unique tile
  const tileUsageCounts = new Array(analysis.uniqueTilesCount).fill(0);
  for (const cell of analysis.nametable) {
    if (cell.tileId < tileUsageCounts.length) {
      tileUsageCounts[cell.tileId]++;
    }
  }

  const selectedColor = selectedColorIdx !== null ? analysis.palette[selectedColorIdx] : null;

  return (
    <div className="space-y-6">
      {/* VRAM Telemetry & Budget Metrics */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-3 mb-4">
          <Database className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">VRAM Pattern Generator & Memory Footprint</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-neutral-950 border border-neutral-800/80 rounded">
            <span className="text-neutral-400 text-xs block mb-1">Screen Nametable</span>
            <div className="text-xl font-bold font-mono text-white tabular-nums">
              {analysis.totalTiles} <span className="text-xs font-normal text-neutral-400">tiles</span>
            </div>
            <span className="text-xs text-neutral-500 font-mono">
              {analysis.tilesX} cols x {analysis.tilesY} rows
            </span>
          </div>

          <div className="p-3 bg-neutral-950 border border-neutral-800/80 rounded">
            <span className="text-neutral-400 text-xs block mb-1">Unique VRAM Tiles</span>
            <div className="text-xl font-bold font-mono text-amber-400 tabular-nums">
              {analysis.uniqueTilesCount} <span className="text-xs font-normal text-neutral-400">tiles</span>
            </div>
            <span className="text-xs text-green-400 font-mono">
              {analysis.compressionRatio.toFixed(1)}% VRAM saved
            </span>
          </div>

          <div className="p-3 bg-neutral-950 border border-neutral-800/80 rounded">
            <span className="text-neutral-400 text-xs block mb-1">Pattern Data Size</span>
            <div className="text-xl font-bold font-mono text-white tabular-nums">
              {(analysis.vramBytes / 1024).toFixed(1)} <span className="text-xs font-normal text-neutral-400">KB</span>
            </div>
            <span className="text-xs text-neutral-500 font-mono">
              {analysis.vramBytes} bytes (32 B/tile)
            </span>
          </div>

          <div className="p-3 bg-neutral-950 border border-neutral-800/80 rounded">
            <span className="text-neutral-400 text-xs block mb-1">Mega Drive VRAM</span>
            <div className="text-xl font-bold font-mono text-cyan-400 tabular-nums">
              {((analysis.vramBytes / analysis.maxVramBytes) * 100).toFixed(1)}%
            </div>
            <span className="text-xs text-neutral-500 font-mono">
              of 64 KB VRAM total
            </span>
          </div>
        </div>

        {/* VRAM Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-neutral-400 mb-1">
            <span>VRAM Allocation (Pattern Generator)</span>
            <span className="font-mono tabular-nums">{analysis.vramBytes} / 65,536 Bytes</span>
          </div>
          <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
            <div
              className="h-full bg-amber-400 transition-all duration-300"
              style={{ width: `${Math.min(100, (analysis.vramBytes / analysis.maxVramBytes) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* CRAM Palette Inspector (16 colors) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">CRAM Palette Table (Line 0 · 16 Colors)</h3>
          </div>
          <span className="text-xs text-neutral-400 font-mono">9-Bit RGB DAC (0..7 per channel)</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-16 gap-2">
          {analysis.palette.map((color, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedColorIdx(selectedColorIdx === idx ? null : idx)}
              className={`flex flex-col items-center p-2 rounded border transition-all ${
                selectedColorIdx === idx
                  ? 'border-amber-400 ring-2 ring-amber-400/30 bg-neutral-800'
                  : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950'
              }`}
            >
              <div
                className="w-full h-8 rounded-xs border border-white/20 mb-1 shadow-inner"
                style={{ backgroundColor: color.hex }}
              />
              <span className="font-mono text-[10px] text-neutral-400 font-bold">#{idx}</span>
              <span className="font-mono text-[9px] text-neutral-500 truncate w-full text-center">
                0x{color.cramWord.toString(16).padStart(4, '0')}
              </span>
            </button>
          ))}
        </div>

        {/* Selected Color Tweaker */}
        {selectedColor && selectedColorIdx !== null && (
          <div className="mt-4 p-4 bg-neutral-950 border border-neutral-800 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Adjust Palette Slot #{selectedColorIdx}</span>
                <span
                  className="inline-block w-4 h-4 rounded-xs border border-white/30"
                  style={{ backgroundColor: selectedColor.hex }}
                />
              </span>
              <span className="text-xs font-mono text-amber-400">
                Word: 0x{selectedColor.cramWord.toString(16).padStart(4, '0')} ({selectedColor.hex})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="flex justify-between text-neutral-400 mb-1">
                  <span className="text-red-400 font-semibold">Red (3-bit)</span>
                  <span className="font-mono tabular-nums text-white">{selectedColor.r} / 7</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="7"
                  value={selectedColor.r}
                  onChange={(e) => {
                    const r = Number(e.target.value);
                    const newCol = createSegaColor(r, selectedColor.g, selectedColor.b);
                    onUpdatePaletteColor(selectedColorIdx, newCol);
                  }}
                  className="w-full accent-red-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-neutral-400 mb-1">
                  <span className="text-green-400 font-semibold">Green (3-bit)</span>
                  <span className="font-mono tabular-nums text-white">{selectedColor.g} / 7</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="7"
                  value={selectedColor.g}
                  onChange={(e) => {
                    const g = Number(e.target.value);
                    const newCol = createSegaColor(selectedColor.r, g, selectedColor.b);
                    onUpdatePaletteColor(selectedColorIdx, newCol);
                  }}
                  className="w-full accent-green-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-neutral-400 mb-1">
                  <span className="text-blue-400 font-semibold">Blue (3-bit)</span>
                  <span className="font-mono tabular-nums text-white">{selectedColor.b} / 7</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="7"
                  value={selectedColor.b}
                  onChange={(e) => {
                    const b = Number(e.target.value);
                    const newCol = createSegaColor(selectedColor.r, selectedColor.g, b);
                    onUpdatePaletteColor(selectedColorIdx, newCol);
                  }}
                  className="w-full accent-blue-400"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VRAM Unique Tiles Pattern Table Grid */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Unique 8x8 VRAM Pattern Table</h3>
          </div>
          <div className="flex items-center gap-2">
            {highlightedTileId !== null && (
              <button
                onClick={() => onOpenTileEditor(highlightedTileId)}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs rounded transition-colors shadow"
              >
                <span>Edit Tile #{highlightedTileId.toString().padStart(3, '0')} in Pixel Grid</span>
              </button>
            )}
            <span className="text-xs text-neutral-400">
              Double-click any tile to edit its 8x8 bitmask
            </span>
          </div>
        </div>

        <div className="max-h-[360px] overflow-y-auto pr-2 grid grid-cols-6 sm:grid-cols-10 md:grid-cols-14 lg:grid-cols-16 gap-2">
          {analysis.uniqueTileImages.map((img, idx) => {
            const isSelected = highlightedTileId === idx;
            const count = tileUsageCounts[idx] || 0;

            return (
              <button
                key={idx}
                onClick={() => onSelectTile(isSelected ? null : idx)}
                onDoubleClick={() => onOpenTileEditor(idx)}
                title={`Tile #${idx} (used ${count} times) - Double-click to Edit Bitmask`}
                className={`flex flex-col items-center p-1.5 rounded border transition-all ${
                  isSelected
                    ? 'border-amber-400 ring-2 ring-amber-400/40 bg-neutral-800'
                    : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950'
                }`}
              >
                <TileCanvas img={img} />
                <span className="font-mono text-[9px] text-neutral-400 mt-1 font-bold">#{idx}</span>
                <span className="font-mono text-[8px] text-neutral-500 tabular-nums">{count}x</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Sub-component to render small 8x8 tile canvas
const TileCanvas: React.FC<{ img: ImageData }> = ({ img }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(img, 0, 0);
  }, [img]);

  return (
    <canvas
      ref={canvasRef}
      width={8}
      height={8}
      className="w-8 h-8 rounded-xs block"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};
