import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SegaColor } from '../types/sega';
import {
  packTileToGenesis4bpp,
  createTileImageData,
} from '../utils/vdpTiles';
import {
  X,
  Pencil,
  Eraser,
  Pipette,
  PaintBucket,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Undo2,
  Redo2,
  RefreshCw,
  Sparkles,
  Check,
  Cpu,
} from 'lucide-react';

interface TileEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tileId: number;
  initialBlock: Uint8Array; // 64 bytes (values 0..15)
  palette: SegaColor[];
  usageCount: number;
  onSaveTile: (tileId: number, updatedBlock: Uint8Array, asNewTile?: boolean) => void;
}

type ToolMode = 'pencil' | 'eraser' | 'picker' | 'fill';

export const TileEditorModal: React.FC<TileEditorModalProps> = ({
  isOpen,
  onClose,
  tileId,
  initialBlock,
  palette,
  usageCount,
  onSaveTile,
}) => {
  // Current 64-byte pixel indices (0..15)
  const [pixels, setPixels] = useState<Uint8Array>(new Uint8Array(64));
  // Keep original snapshot for before/after and revert
  const [originalPixels, setOriginalPixels] = useState<Uint8Array>(new Uint8Array(64));

  // Active color in Sega CRAM palette (0..15)
  const [activeColorIdx, setActiveColorIdx] = useState<number>(1);
  const [tool, setTool] = useState<ToolMode>('pencil');

  // Hovered pixel coordinate
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number; y: number } | null>(null);

  // Drag-painting state
  const isMouseDownRef = useRef<boolean>(false);

  // Undo / Redo history
  const [history, setHistory] = useState<Uint8Array[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  // Initialize tile when modal opens or tileId changes
  useEffect(() => {
    if (isOpen && initialBlock) {
      const copy = new Uint8Array(initialBlock);
      const origCopy = new Uint8Array(initialBlock);
      setPixels(copy);
      setOriginalPixels(origCopy);
      setHistory([new Uint8Array(copy)]);
      setHistoryIdx(0);
      setHoveredPixel(null);
    }
  }, [isOpen, tileId, initialBlock]);

  // Push new state to history stack
  const pushHistory = useCallback(
    (newPixels: Uint8Array) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIdx + 1);
        return [...sliced, new Uint8Array(newPixels)];
      });
      setHistoryIdx((prev) => prev + 1);
    },
    [historyIdx]
  );

  // Undo / Redo handlers
  const handleUndo = useCallback(() => {
    if (historyIdx > 0) {
      const nextIdx = historyIdx - 1;
      setHistoryIdx(nextIdx);
      setPixels(new Uint8Array(history[nextIdx]));
    }
  }, [historyIdx, history]);

  const handleRedo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      const nextIdx = historyIdx + 1;
      setHistoryIdx(nextIdx);
      setPixels(new Uint8Array(history[nextIdx]));
    }
  }, [historyIdx, history]);

  // Keyboard shortcuts (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        handleRedo();
        e.preventDefault();
      } else if (e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'p') {
        setTool('pencil');
      } else if (e.key.toLowerCase() === 'e') {
        setTool('eraser');
      } else if (e.key.toLowerCase() === 'i') {
        setTool('picker');
      } else if (e.key.toLowerCase() === 'g') {
        setTool('fill');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleUndo, handleRedo]);

  // Flood fill algorithm
  const floodFill = useCallback(
    (startX: number, startY: number, targetCol: number, fillCol: number) => {
      if (targetCol === fillCol) return;
      const next = new Uint8Array(pixels);
      const queue: [number, number][] = [[startX, startY]];
      const visited = new Uint8Array(64);

      while (queue.length > 0) {
        const [x, y] = queue.pop()!;
        const idx = y * 8 + x;
        if (visited[idx]) continue;
        visited[idx] = 1;

        if (next[idx] === targetCol) {
          next[idx] = fillCol;

          if (x > 0) queue.push([x - 1, y]);
          if (x < 7) queue.push([x + 1, y]);
          if (y > 0) queue.push([x, y - 1]);
          if (y < 7) queue.push([x, y + 1]);
        }
      }

      setPixels(next);
      pushHistory(next);
    },
    [pixels, pushHistory]
  );

  // Paint a single pixel
  const applyToolAt = useCallback(
    (x: number, y: number, isInitialClick: boolean = false) => {
      if (x < 0 || x > 7 || y < 0 || y > 7) return;
      const idx = y * 8 + x;

      if (tool === 'picker') {
        if (isInitialClick) {
          setActiveColorIdx(pixels[idx]);
          setTool('pencil');
        }
        return;
      }

      if (tool === 'fill') {
        if (isInitialClick) {
          floodFill(x, y, pixels[idx], activeColorIdx);
        }
        return;
      }

      const colToPaint = tool === 'eraser' ? 0 : activeColorIdx;
      if (pixels[idx] === colToPaint && !isInitialClick) return;

      const next = new Uint8Array(pixels);
      next[idx] = colToPaint;
      setPixels(next);

      if (isInitialClick) {
        pushHistory(next);
      } else {
        // While dragging, update current history head
        setHistory((prev) => {
          const sliced = prev.slice(0, historyIdx);
          return [...sliced, new Uint8Array(next)];
        });
      }
    },
    [tool, activeColorIdx, pixels, floodFill, pushHistory, historyIdx]
  );

  // Pixel Grid Mouse Handlers
  const handlePixelMouseDown = (x: number, y: number) => {
    isMouseDownRef.current = true;
    applyToolAt(x, y, true);
  };

  const handlePixelMouseEnter = (x: number, y: number) => {
    setHoveredPixel({ x, y });
    if (isMouseDownRef.current && (tool === 'pencil' || tool === 'eraser')) {
      applyToolAt(x, y, false);
    }
  };

  const handleMouseUp = () => {
    if (isMouseDownRef.current) {
      isMouseDownRef.current = false;
      // Finalize current state in history
      pushHistory(pixels);
    }
  };

  // Transformation actions
  const handleShift = (dx: number, dy: number) => {
    const next = new Uint8Array(64);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const srcX = (x - dx + 8) % 8;
        const srcY = (y - dy + 8) % 8;
        next[y * 8 + x] = pixels[srcY * 8 + srcX];
      }
    }
    setPixels(next);
    pushHistory(next);
  };

  const handleFlipH = () => {
    const next = new Uint8Array(64);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        next[y * 8 + x] = pixels[y * 8 + (7 - x)];
      }
    }
    setPixels(next);
    pushHistory(next);
  };

  const handleFlipV = () => {
    const next = new Uint8Array(64);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        next[y * 8 + x] = pixels[(7 - y) * 8 + x];
      }
    }
    setPixels(next);
    pushHistory(next);
  };

  const handleRotateCw = () => {
    const next = new Uint8Array(64);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        // Rotate 90 deg clockwise: newX = 7 - y, newY = x
        next[x * 8 + (7 - y)] = pixels[y * 8 + x];
      }
    }
    setPixels(next);
    pushHistory(next);
  };

  const handleInvert = () => {
    const next = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
      next[i] = (15 - pixels[i]) & 0x0f;
    }
    setPixels(next);
    pushHistory(next);
  };

  const handleClear = () => {
    const next = new Uint8Array(64); // all 0
    setPixels(next);
    pushHistory(next);
  };

  const handleRevert = () => {
    const restored = new Uint8Array(originalPixels);
    setPixels(restored);
    pushHistory(restored);
  };

  // Convert 8 rows of 4bpp nibble words for bitmask inspector
  const bitmaskRows = useMemo(() => {
    const packed = packTileToGenesis4bpp(pixels);
    const rows: { row: number; hexLong: string; nibbles: string }[] = [];

    for (let r = 0; r < 8; r++) {
      const b0 = packed[r * 4];
      const b1 = packed[r * 4 + 1];
      const b2 = packed[r * 4 + 2];
      const b3 = packed[r * 4 + 3];

      const val32 =
        ((b0 << 24) >>> 0) | (b1 << 16) | (b2 << 8) | b3;
      const hexLong = '0x' + (val32 >>> 0).toString(16).padStart(8, '0').toUpperCase();

      let nibbles = '';
      for (let x = 0; x < 8; x++) {
        nibbles += pixels[r * 8 + x].toString(16).toUpperCase() + ' ';
      }

      rows.push({ row: r, hexLong, nibbles: nibbles.trim() });
    }

    return rows;
  }, [pixels]);

  // Before and After tile image data
  const editedImageData = useMemo(() => {
    return createTileImageData(pixels, palette);
  }, [pixels, palette]);

  const originalImageData = useMemo(() => {
    return createTileImageData(originalPixels, palette);
  }, [originalPixels, palette]);

  if (!isOpen) return null;

  const currentHoveredColor =
    hoveredPixel !== null
      ? palette[pixels[hoveredPixel.y * 8 + hoveredPixel.x]]
      : null;

  return (
    <div
      onMouseUp={handleMouseUp}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs select-none"
    >
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-5 text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400/10 text-amber-400 rounded-md border border-amber-400/20">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-['Plus_Jakarta_Sans',sans-serif]">
                  8×8 VRAM Tile Editor: Pattern #{tileId.toString().padStart(3, '0')}
                </h2>
                <span className="font-mono text-xs text-amber-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                  4bpp Planar
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Pixel-grid bitmask editor. Modifies 64-pixel VRAM pattern and updates all {usageCount} instances on the screen.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace: Left (Grid & Tools), Right (Palette, Previews, Bitmask) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          {/* Left Column: Pixel Editor Grid & Tool Controls */}
          <div className="space-y-4">
            {/* Tool Selector Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTool('pencil')}
                  title="Pencil Tool (P)"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                    tool === 'pencil'
                      ? 'bg-amber-400 text-neutral-950 font-bold'
                      : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Pencil</span>
                </button>

                <button
                  onClick={() => setTool('eraser')}
                  title="Eraser Tool (E - Color #0)"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                    tool === 'eraser'
                      ? 'bg-amber-400 text-neutral-950 font-bold'
                      : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Eraser</span>
                </button>

                <button
                  onClick={() => setTool('picker')}
                  title="Eyedropper / Color Picker (I)"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                    tool === 'picker'
                      ? 'bg-amber-400 text-neutral-950 font-bold'
                      : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <Pipette className="w-3.5 h-3.5" />
                  <span>Sample</span>
                </button>

                <button
                  onClick={() => setTool('fill')}
                  title="Flood Fill Bucket (G)"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                    tool === 'fill'
                      ? 'bg-amber-400 text-neutral-950 font-bold'
                      : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <PaintBucket className="w-3.5 h-3.5" />
                  <span>Fill</span>
                </button>
              </div>

              {/* Undo / Redo */}
              <div className="flex items-center gap-1 border-l border-neutral-800 pl-2">
                <button
                  onClick={handleUndo}
                  disabled={historyIdx <= 0}
                  title="Undo (Ctrl+Z)"
                  className="p-1.5 rounded text-neutral-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-neutral-800"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIdx >= history.length - 1}
                  title="Redo (Ctrl+Y)"
                  className="p-1.5 rounded text-neutral-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-neutral-800"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 8x8 Pixel Canvas Grid */}
            <div className="flex flex-col items-center justify-center p-4 bg-neutral-950 border border-neutral-800 rounded-lg">
              <div
                className="grid grid-cols-8 gap-[1px] bg-neutral-800 p-[1px] rounded-sm shadow-2xl border border-neutral-700/80 cursor-crosshair"
                onMouseLeave={() => setHoveredPixel(null)}
              >
                {Array.from({ length: 64 }).map((_, idx) => {
                  const x = idx % 8;
                  const y = Math.floor(idx / 8);
                  const palIdx = pixels[idx];
                  const color = palette[palIdx] || palette[0];
                  const isHovered = hoveredPixel?.x === x && hoveredPixel?.y === y;

                  return (
                    <div
                      key={idx}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handlePixelMouseDown(x, y);
                      }}
                      onMouseEnter={() => handlePixelMouseEnter(x, y)}
                      className={`relative w-8 h-8 sm:w-10 sm:h-10 transition-transform ${
                        isHovered ? 'scale-105 z-10 ring-2 ring-amber-400 shadow-lg' : ''
                      }`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {/* Pixel index number overlay for fine precision */}
                      <span className="absolute bottom-0.5 right-1 text-[8px] font-mono opacity-40 select-none pointer-events-none text-white drop-shadow">
                        {palIdx}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Pixel Coordinates HUD */}
              <div className="mt-3 flex items-center justify-between w-full max-w-[320px] text-xs font-mono text-neutral-400">
                {hoveredPixel ? (
                  <div className="flex items-center gap-2">
                    <span>
                      Pixel: <strong className="text-white">({hoveredPixel.x}, {hoveredPixel.y})</strong>
                    </span>
                    {currentHoveredColor && (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-xs border border-white/30"
                          style={{ backgroundColor: currentHoveredColor.hex }}
                        />
                        <span className="text-amber-400">
                          #{pixels[hoveredPixel.y * 8 + hoveredPixel.x]} (0x{currentHoveredColor.cramWord.toString(16).padStart(4, '0')})
                        </span>
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-neutral-500">Hover & drag on pixels to paint</span>
                )}
                <span className="text-neutral-500 text-[11px]">8×8 Matrix</span>
              </div>
            </div>

            {/* Transformations Quick Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs">
              <span className="text-neutral-400 font-mono text-[11px] px-1">Transforms:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleShift(0, -1)}
                  title="Shift Up"
                  className="p-1.5 rounded text-neutral-300 hover:text-white hover:bg-neutral-800"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleShift(0, 1)}
                  title="Shift Down"
                  className="p-1.5 rounded text-neutral-300 hover:text-white hover:bg-neutral-800"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleShift(-1, 0)}
                  title="Shift Left"
                  className="p-1.5 rounded text-neutral-300 hover:text-white hover:bg-neutral-800"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleShift(1, 0)}
                  title="Shift Right"
                  className="p-1.5 rounded text-neutral-300 hover:text-white hover:bg-neutral-800"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1 border-l border-neutral-800 pl-2">
                <button
                  onClick={handleFlipH}
                  title="Flip Horizontal"
                  className="flex items-center gap-1 px-2 py-1 rounded text-neutral-300 hover:text-white hover:bg-neutral-800"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span>H-Flip</span>
                </button>
                <button
                  onClick={handleFlipV}
                  title="Flip Vertical"
                  className="flex items-center gap-1 px-2 py-1 rounded text-neutral-300 hover:text-white hover:bg-neutral-800"
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                  <span>V-Flip</span>
                </button>
                <button
                  onClick={handleRotateCw}
                  title="Rotate 90° Clockwise"
                  className="flex items-center gap-1 px-2 py-1 rounded text-neutral-300 hover:text-white hover:bg-neutral-800"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>90°</span>
                </button>
              </div>

              <div className="flex items-center gap-1 border-l border-neutral-800 pl-2">
                <button
                  onClick={handleInvert}
                  title="Invert Palette Indices"
                  className="px-2 py-1 rounded text-neutral-300 hover:text-white hover:bg-neutral-800"
                >
                  Invert
                </button>
                <button
                  onClick={handleClear}
                  title="Clear tile to index 0"
                  className="px-2 py-1 rounded text-neutral-400 hover:text-red-400 hover:bg-neutral-800"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Palette Bar, Live Previews & Raw Bitmask */}
          <div className="space-y-4">
            {/* Sega CRAM 16-Color Palette */}
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Active Paint Color:</span>
                </span>
                <span className="font-mono text-amber-400 text-[11px]">
                  Slot #{activeColorIdx} (0x{palette[activeColorIdx]?.cramWord.toString(16).padStart(4, '0')})
                </span>
              </div>

              {/* 16 color buttons */}
              <div className="grid grid-cols-8 gap-1.5">
                {palette.map((col, idx) => {
                  const isSelected = activeColorIdx === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveColorIdx(idx);
                        if (tool === 'eraser') setTool('pencil');
                      }}
                      title={`Color #${idx}: 9-Bit RGB (R:${col.r}, G:${col.g}, B:${col.b}) - CRAM 0x${col.cramWord.toString(16).padStart(4, '0')}`}
                      className={`relative w-8 h-8 rounded-xs border transition-all ${
                        isSelected
                          ? 'border-amber-400 ring-2 ring-amber-400/50 scale-110 z-10'
                          : 'border-white/20 hover:border-white/50'
                      }`}
                      style={{ backgroundColor: col.hex }}
                    >
                      <span className="absolute bottom-0 right-0.5 text-[8px] font-mono text-white drop-shadow font-bold">
                        {idx}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Multi-Scale Live Previews (Before vs After) */}
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3">
              <span className="text-xs font-semibold text-white block">Multi-Scale Live Previews</span>
              <div className="grid grid-cols-2 gap-3">
                {/* Original */}
                <div className="flex flex-col items-center p-2 bg-neutral-900 border border-neutral-800 rounded">
                  <span className="text-[10px] text-neutral-400 font-mono mb-2">Original Dither</span>
                  <TileCanvasPreview img={originalImageData} scale={6} />
                  <span className="text-[9px] text-neutral-500 font-mono mt-1">48×48 px (6x)</span>
                </div>

                {/* Edited */}
                <div className="flex flex-col items-center p-2 bg-neutral-900 border border-neutral-800 rounded">
                  <span className="text-[10px] text-amber-400 font-mono mb-2 font-bold">Edited VRAM Tile</span>
                  <TileCanvasPreview img={editedImageData} scale={6} />
                  <span className="text-[9px] text-neutral-500 font-mono mt-1">48×48 px (6x)</span>
                </div>
              </div>

              {/* 1x, 2x, 4x Actual Scales */}
              <div className="flex items-center justify-around p-2 bg-neutral-900/60 rounded border border-neutral-800 text-[10px] font-mono text-neutral-400">
                <div className="flex flex-col items-center gap-1">
                  <span>1x (8px)</span>
                  <TileCanvasPreview img={editedImageData} scale={1} />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span>2x (16px)</span>
                  <TileCanvasPreview img={editedImageData} scale={2} />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span>4x (32px)</span>
                  <TileCanvasPreview img={editedImageData} scale={4} />
                </div>
              </div>
            </div>

            {/* Raw 4bpp Genesis Bitmask Inspector */}
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <span>VRAM 4bpp Planar Bitmask:</span>
                </span>
                <span className="font-mono text-neutral-400 text-[10px]">32 Bytes Total</span>
              </div>

              <div className="max-h-28 overflow-y-auto font-mono text-[10px] space-y-0.5 text-neutral-300 bg-neutral-900/80 p-2 rounded border border-neutral-800">
                {bitmaskRows.map((r) => (
                  <div key={r.row} className="flex justify-between hover:text-amber-400">
                    <span className="text-neutral-500">Row {r.row}:</span>
                    <span className="text-amber-400 font-bold">{r.hexLong}</span>
                    <span className="text-neutral-400 text-[9px] tracking-widest">{r.nibbles}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800 pt-4">
          <button
            onClick={handleRevert}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-950 hover:bg-neutral-800 rounded border border-neutral-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Revert to Camera Dither</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
            >
              Cancel
            </button>

            {/* Duplicate as New Tile */}
            <button
              onClick={() => {
                onSaveTile(tileId, pixels, true);
                onClose();
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/80 rounded transition-colors"
            >
              Save as New VRAM Tile
            </button>

            {/* Apply & Replace Tile */}
            <button
              onClick={() => {
                onSaveTile(tileId, pixels, false);
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded shadow transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply to Tile #{tileId} ({usageCount} Cells)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Canvas Preview helper
const TileCanvasPreview: React.FC<{ img: ImageData; scale: number }> = ({ img, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw sharp pixelated
    ctx.imageSmoothingEnabled = false;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 8;
    offCanvas.height = 8;
    const offCtx = offCanvas.getContext('2d')!;
    offCtx.putImageData(img, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offCanvas, 0, 0, 8, 8, 0, 0, 8 * scale, 8 * scale);
  }, [img, scale]);

  return (
    <canvas
      ref={canvasRef}
      width={8 * scale}
      height={8 * scale}
      className="rounded-xs border border-neutral-700/60 block shadow"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};
