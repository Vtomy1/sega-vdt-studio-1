import React, { useRef, useState, useEffect } from 'react';
import { PpuAnalysis } from '../types/sega';
import { Tv, Grid, Split, ZoomIn, Pencil } from 'lucide-react';

interface PpuDisplayProps {
  analysis: PpuAnalysis | null;
  outputImageData: ImageData | null;
  originalImageData: ImageData | null;
  highlightedTileId: number | null;
  onSelectTile: (tileId: number | null) => void;
  onOpenTileEditor: (tileId: number) => void;
}

export const PpuDisplay: React.FC<PpuDisplayProps> = ({
  analysis,
  outputImageData,
  originalImageData,
  highlightedTileId,
  onSelectTile,
  onOpenTileEditor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [showCrt, setShowCrt] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [splitPos, setSplitPos] = useState(0.5); // 0.0 to 1.0
  const [scaleFactor, setScaleFactor] = useState<2 | 3 | 4>(2);

  // Hover state
  const [hoveredCell, setHoveredCell] = useState<{
    pixelX: number;
    pixelY: number;
    tileX: number;
    tileY: number;
    tileId: number;
    paletteIdx: number;
    hFlip: boolean;
    vFlip: boolean;
  } | null>(null);

  // Render to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !outputImageData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = outputImageData.width;
    const height = outputImageData.height;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    if (!splitMode || !originalImageData) {
      // Direct quantized image
      ctx.putImageData(outputImageData, 0, 0);
    } else {
      // Split view: Left original, Right dithered
      const splitX = Math.floor(width * splitPos);
      ctx.putImageData(originalImageData, 0, 0);

      // Copy right slice from dithered
      // Create offscreen canvas or temporary put
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(outputImageData, 0, 0);

      ctx.drawImage(
        tempCanvas,
        splitX, 0, width - splitX, height,
        splitX, 0, width - splitX, height
      );

      // Draw split divider line
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(splitX - 1, 0, 2, height);
    }

    // Draw Highlighted Tile instances (if selected from VRAM inspector)
    if (analysis && highlightedTileId !== null) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      for (let ty = 0; ty < analysis.tilesY; ty++) {
        for (let tx = 0; tx < analysis.tilesX; tx++) {
          const cell = analysis.nametable[ty * analysis.tilesX + tx];
          if (cell && cell.tileId === highlightedTileId) {
            ctx.strokeRect(tx * 8 + 0.5, ty * 8 + 0.5, 7, 7);
          }
        }
      }
    }

    // Draw Hovered Cell box
    if (hoveredCell && !splitMode) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.strokeRect(hoveredCell.tileX * 8 + 0.5, hoveredCell.tileY * 8 + 0.5, 7, 7);
    }
  }, [outputImageData, originalImageData, splitMode, splitPos, highlightedTileId, hoveredCell, analysis]);

  // Handle canvas mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !analysis) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const px = Math.floor((e.clientX - rect.left) * scaleX);
    const py = Math.floor((e.clientY - rect.top) * scaleY);

    if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) {
      setHoveredCell(null);
      return;
    }

    if (splitMode) {
      const pos = (e.clientX - rect.left) / rect.width;
      setSplitPos(Math.max(0.05, Math.min(0.95, pos)));
      setHoveredCell(null);
      return;
    }

    const tx = Math.floor(px / 8);
    const ty = Math.floor(py / 8);
    const cellIdx = ty * analysis.tilesX + tx;
    const cell = analysis.nametable[cellIdx];

    if (cell) {
      // Find color at that pixel
      let palIdx = 0;
      if (outputImageData) {
        const pIdx = (py * canvas.width + px) * 4;
        const r = outputImageData.data[pIdx];
        const g = outputImageData.data[pIdx + 1];
        const b = outputImageData.data[pIdx + 2];
        for (let i = 0; i < analysis.palette.length; i++) {
          if (
            analysis.palette[i].displayR === r &&
            analysis.palette[i].displayG === g &&
            analysis.palette[i].displayB === b
          ) {
            palIdx = i;
            break;
          }
        }
      }

      setHoveredCell({
        pixelX: px,
        pixelY: py,
        tileX: tx,
        tileY: ty,
        tileId: cell.tileId,
        paletteIdx: palIdx,
        hFlip: cell.hFlip,
        vFlip: cell.vFlip,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  const handleCanvasClick = () => {
    if (hoveredCell) {
      onSelectTile(hoveredCell.tileId === highlightedTileId ? null : hoveredCell.tileId);
    }
  };

  const currentColor = hoveredCell && analysis ? analysis.palette[hoveredCell.paletteIdx] : null;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3 text-neutral-200">
      {/* Viewport Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-mono">
            <span className="text-amber-400 font-bold">VDP DISPLAY:</span>
            <span>
              {analysis ? `${analysis.width}x${analysis.height} (${analysis.tilesX}x${analysis.tilesY} Tiles)` : '320x224'}
            </span>
          </div>

          {/* CRT Toggle */}
          <button
            onClick={() => setShowCrt(!showCrt)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-colors ${
              showCrt
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>CRT Filter</span>
          </button>

          {/* 8x8 Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-colors ${
              showGrid
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>8x8 Tile Grid</span>
          </button>

          {/* Split Mode */}
          <button
            onClick={() => setSplitMode(!splitMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border transition-colors ${
              splitMode
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>Split Compare</span>
          </button>
        </div>

        {/* Zoom Selector */}
        <div className="flex items-center gap-1.5 text-xs">
          <ZoomIn className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-neutral-400">Scale:</span>
          {([2, 3, 4] as const).map((z) => (
            <button
              key={z}
              onClick={() => setScaleFactor(z)}
              className={`px-2 py-0.5 rounded font-mono ${
                scaleFactor === z
                  ? 'bg-neutral-800 text-amber-400 font-bold border border-neutral-700'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {z}x
            </button>
          ))}
        </div>
      </div>

      {/* Main Screen Viewport Container */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center p-4 bg-black/90 rounded-lg overflow-hidden border border-neutral-800/80 shadow-2xl min-h-[380px]"
      >
        {/* Subtle Sega Genesis Console Outer Bezel Simulation */}
        <div className="relative inline-block max-w-full overflow-auto">
          {/* Canvas */}
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleCanvasClick}
            onDoubleClick={() => {
              if (hoveredCell) onOpenTileEditor(hoveredCell.tileId);
            }}
            className="cursor-crosshair shadow-2xl rounded-sm block"
            style={{
              width: analysis ? analysis.width * scaleFactor : 640,
              height: analysis ? analysis.height * scaleFactor : 448,
              imageRendering: 'pixelated',
            }}
          />

          {/* CRT Scanline & Phosphor Overlay */}
          {showCrt && (
            <div
              className="absolute inset-0 pointer-events-none rounded-sm"
              style={{
                backgroundImage: `linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.45) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.04), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.04))`,
                backgroundSize: `100% ${scaleFactor * 2}px, ${scaleFactor * 3}px 100%`,
                boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.7)',
              }}
            />
          )}

          {/* 8x8 Grid Overlay */}
          {showGrid && analysis && (
            <div
              className="absolute inset-0 pointer-events-none rounded-sm"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                backgroundSize: `${8 * scaleFactor}px ${8 * scaleFactor}px`,
              }}
            />
          )}
        </div>
      </div>

      {/* Real-time Telemetry & Tile Inspection HUD */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-neutral-950 border border-neutral-800 rounded font-mono text-xs">
        {hoveredCell ? (
          <div className="flex flex-wrap items-center gap-4 text-neutral-300">
            <span className="text-amber-400 font-bold">INSPECTOR:</span>
            <span>
              Pixel: <strong className="text-white">({hoveredCell.pixelX}, {hoveredCell.pixelY})</strong>
            </span>
            <span>
              Tile: <strong className="text-white">({hoveredCell.tileX}, {hoveredCell.tileY})</strong>
            </span>
            <span>
              VRAM Pattern ID: <strong className="text-amber-400">#{hoveredCell.tileId.toString().padStart(3, '0')}</strong>
            </span>
            {currentColor && (
              <span className="flex items-center gap-1.5">
                <span>Color:</span>
                <span
                  className="inline-block w-3 h-3 rounded-xs border border-white/20"
                  style={{ backgroundColor: currentColor.hex }}
                />
                <span className="text-white">#{hoveredCell.paletteIdx} (0x{currentColor.cramWord.toString(16).padStart(4, '0')})</span>
              </span>
            )}
            <span>
              Attributes: H-Flip: <strong className={hoveredCell.hFlip ? 'text-green-400' : 'text-neutral-500'}>{hoveredCell.hFlip ? 'YES' : 'NO'}</strong> | V-Flip: <strong className={hoveredCell.vFlip ? 'text-green-400' : 'text-neutral-500'}>{hoveredCell.vFlip ? 'YES' : 'NO'}</strong>
            </span>
          </div>
        ) : (
          <div className="text-neutral-500">
            Hover over screen to inspect 8x8 VDP tile attributes. Double-click or select a tile to edit its bitmask in the Tile Editor.
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Action button to open Tile Editor */}
          {hoveredCell && (
            <button
              onClick={() => onOpenTileEditor(hoveredCell.tileId)}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs rounded transition-colors shadow"
            >
              <Pencil className="w-3 h-3" />
              <span>Edit Tile #{hoveredCell.tileId.toString().padStart(3, '0')}</span>
            </button>
          )}

          {!hoveredCell && highlightedTileId !== null && (
            <button
              onClick={() => onOpenTileEditor(highlightedTileId)}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs rounded transition-colors shadow"
            >
              <Pencil className="w-3 h-3" />
              <span>Edit Tile #{highlightedTileId.toString().padStart(3, '0')}</span>
            </button>
          )}

          {highlightedTileId !== null && (
            <button
              onClick={() => onSelectTile(null)}
              className="text-neutral-400 hover:text-white text-xs underline cursor-pointer"
            >
              Clear Selection
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
