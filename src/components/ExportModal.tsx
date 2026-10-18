import React from 'react';
import { PpuAnalysis, RomHeaderConfig } from '../types/sega';
import {
  generateGenesisRom,
  generateMasterSystemRom,
  generateSgdkCHeader,
  generateM68kAsm,
} from '../utils/romGenerator';
import { X, Download, FileCode, Disc, Image as ImageIcon, FileText } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: PpuAnalysis | null;
  config: RomHeaderConfig;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  analysis,
  config,
}) => {
  if (!isOpen || !analysis) return null;

  // File download helper
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 1. Download Sega Genesis / Mega Drive ROM (.bin)
  const handleDownloadGenesisBin = () => {
    const rom = generateGenesisRom(analysis, config);
    const blob = new Blob([rom.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const filename = `${config.domesticTitle.trim().replace(/\s+/g, '_') || 'sega_vdp_capture'}.bin`;
    triggerDownload(blob, filename);
  };

  // 2. Download Sega Master System ROM (.sms)
  const handleDownloadSms = () => {
    const rom = generateMasterSystemRom(analysis, config.domesticTitle);
    const blob = new Blob([rom.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    triggerDownload(blob, 'sega_sms_capture.sms');
  };

  // 3. Download SGDK C Header (.h)
  const handleDownloadCHeader = () => {
    const headerCode = generateSgdkCHeader(analysis, 'webcam_capture');
    const blob = new Blob([headerCode], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, 'sega_vdp_tiles.h');
  };

  // 4. Download M68000 Assembly (.s)
  const handleDownloadAsm = () => {
    const asmCode = generateM68kAsm(analysis, 'webcam_capture');
    const blob = new Blob([asmCode], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, 'sega_vdp_tiles.s');
  };

  // 5. Download PNG Tile Sheet
  const handleDownloadTileSheetPng = () => {
    const count = analysis.uniqueTileImages.length;
    if (count === 0) return;

    // Arrange in 16 columns of 8x8 tiles
    const cols = 16;
    const rows = Math.ceil(count / cols);
    const canvas = document.createElement('canvas');
    canvas.width = cols * 8;
    canvas.height = rows * 8;
    const ctx = canvas.getContext('2d')!;

    // Fill background with palette 0
    const bg = analysis.palette[0];
    ctx.fillStyle = bg.hex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < count; i++) {
      const tx = (i % cols) * 8;
      const ty = Math.floor(i / cols) * 8;
      ctx.putImageData(analysis.uniqueTileImages[i], tx, ty);
    }

    canvas.toBlob((blob) => {
      if (blob) triggerDownload(blob, 'sega_vram_tilesheet.png');
    });
  };

  // 6. Download Tilemap JSON
  const handleDownloadTilemapJson = () => {
    const json = JSON.stringify(
      {
        resolution: { width: analysis.width, height: analysis.height },
        tiles: { cols: analysis.tilesX, rows: analysis.tilesY, total: analysis.totalTiles },
        uniqueTilesCount: analysis.uniqueTilesCount,
        compressionRatio: analysis.compressionRatio,
        palette: analysis.palette.map((c) => ({
          cramWord: '0x' + c.cramWord.toString(16).padStart(4, '0').toUpperCase(),
          rgb9: { r: c.r, g: c.g, b: c.b },
          hex: c.hex,
        })),
        nametable: analysis.nametable,
      },
      null,
      2
    );
    const blob = new Blob([json], { type: 'application/json' });
    triggerDownload(blob, 'sega_vdp_tilemap.json');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6 text-neutral-200">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white font-['Plus_Jakarta_Sans',sans-serif]">
              Export Sega ROM & Developer Assets
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Bootable Genesis ROM */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-white font-semibold text-sm mb-1">
                <Disc className="w-4 h-4 text-amber-400" />
                <span>Sega Mega Drive ROM (.BIN)</span>
              </div>
              <p className="text-xs text-neutral-400">
                Executable 68000 ROM with official Sega header, valid checksum, and TMSS unlock. Bootable on real hardware and emulators.
              </p>
            </div>
            <button
              onClick={handleDownloadGenesisBin}
              className="w-full py-2 px-3 text-xs font-bold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .BIN ROM</span>
            </button>
          </div>

          {/* 2. SGDK C Header */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-white font-semibold text-sm mb-1">
                <FileCode className="w-4 h-4 text-amber-400" />
                <span>SGDK C Header File (.H)</span>
              </div>
              <p className="text-xs text-neutral-400">
                Complete C source code arrays for SGDK and Sega Genesis development kits: palette, tile patterns, and nametable map.
              </p>
            </div>
            <button
              onClick={handleDownloadCHeader}
              className="w-full py-2 px-3 text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors flex items-center justify-center gap-2"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Download SGDK Header (.h)</span>
            </button>
          </div>

          {/* 3. M68000 Assembly */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-white font-semibold text-sm mb-1">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>M68000 Assembly (.S)</span>
              </div>
              <p className="text-xs text-neutral-400">
                Motorola 68000 assembly source with dc.w and dc.l tables, compatible with GNU as and vasm.
              </p>
            </div>
            <button
              onClick={handleDownloadAsm}
              className="w-full py-2 px-3 text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Download Assembly (.s)</span>
            </button>
          </div>

          {/* 4. Sega Master System ROM */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-white font-semibold text-sm mb-1">
                <Disc className="w-4 h-4 text-amber-400" />
                <span>Master System ROM (.SMS)</span>
              </div>
              <p className="text-xs text-neutral-400">
                32KB Sega Master System binary with Z80 vectors and "TMR SEGA" header at 0x7FF0.
              </p>
            </div>
            <button
              onClick={handleDownloadSms}
              className="w-full py-2 px-3 text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download SMS ROM (.sms)</span>
            </button>
          </div>

          {/* 5. PNG Tile Sheet */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-white font-semibold text-sm mb-1">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>VRAM 8x8 Tile Sheet (.PNG)</span>
              </div>
              <p className="text-xs text-neutral-400">
                Packed 2D sprite/tile sheet containing all unique 8x8 tiles generated by the deduplication engine.
              </p>
            </div>
            <button
              onClick={handleDownloadTileSheetPng}
              className="w-full py-2 px-3 text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors flex items-center justify-center gap-2"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Download Tile Sheet (.png)</span>
            </button>
          </div>

          {/* 6. JSON Tilemap */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-white font-semibold text-sm mb-1">
                <FileCode className="w-4 h-4 text-amber-400" />
                <span>Tilemap & Metadata (.JSON)</span>
              </div>
              <p className="text-xs text-neutral-400">
                Raw JSON export of nametable descriptors, tile IDs, flip flags, and 9-bit RGB palette definitions.
              </p>
            </div>
            <button
              onClick={handleDownloadTilemapJson}
              className="w-full py-2 px-3 text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors flex items-center justify-center gap-2"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Download JSON Map</span>
            </button>
          </div>
        </div>

        <div className="border-t border-neutral-800 pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
