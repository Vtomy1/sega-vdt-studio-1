import React, { useMemo } from 'react';
import { RomHeaderConfig, PpuAnalysis } from '../types/sega';
import { generateGenesisRom } from '../utils/romGenerator';
import { FileCode, Hash, Download, CheckCircle, Info } from 'lucide-react';

interface RomHeaderEditorProps {
  analysis: PpuAnalysis | null;
  config: RomHeaderConfig;
  onConfigChange: (cfg: Partial<RomHeaderConfig>) => void;
  onDownloadRom: () => void;
  onDownloadCHeader: () => void;
}

export const RomHeaderEditor: React.FC<RomHeaderEditorProps> = ({
  analysis,
  config,
  onConfigChange,
  onDownloadRom,
  onDownloadCHeader,
}) => {
  // Generate a live sample ROM binary to calculate exact checksum and hex dump
  const { romBinary, checksum } = useMemo(() => {
    if (!analysis) return { romBinary: null, checksum: 0 };
    const rom = generateGenesisRom(analysis, config);
    // Read calculated checksum from 0x18E
    const sum = (rom[0x18e] << 8) | rom[0x18f];
    return { romBinary: rom, checksum: sum };
  }, [analysis, config]);

  // Generate 256-byte Hex Dump lines for 0x100 to 0x200
  const hexDumpRows = useMemo(() => {
    if (!romBinary) return [];
    const rows: { offset: string; hex: string; ascii: string }[] = [];

    for (let addr = 0x100; addr < 0x200; addr += 16) {
      const offset = addr.toString(16).padStart(8, '0').toUpperCase();
      let hex = '';
      let ascii = '';

      for (let b = 0; b < 16; b++) {
        const byte = romBinary[addr + b];
        hex += byte.toString(16).padStart(2, '0').toUpperCase() + ' ';
        // ASCII printable
        if (byte >= 32 && byte <= 126) {
          ascii += String.fromCharCode(byte);
        } else {
          ascii += '.';
        }
      }

      rows.push({ offset, hex: hex.trim(), ascii });
    }

    return rows;
  }, [romBinary]);

  return (
    <div className="space-y-6">
      {/* Header Fields Form */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Sega Mega Drive / Genesis ROM Header (0x100 - 0x200)</h3>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-neutral-400">16-Bit Checksum:</span>
            <span className="text-amber-400 font-bold bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
              0x{checksum.toString(16).padStart(4, '0').toUpperCase()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-neutral-400 mb-1">Hardware System ID (0x100 · 16 Bytes)</label>
            <select
              value={config.consoleName}
              onChange={(e) => onConfigChange({ consoleName: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-amber-400 font-mono"
            >
              <option value="SEGA MEGA DRIVE ">SEGA MEGA DRIVE  (Europe / Japan standard)</option>
              <option value="SEGA GENESIS    ">SEGA GENESIS     (North America standard)</option>
            </select>
          </div>

          <div>
            <label className="block text-neutral-400 mb-1">Copyright & Date (0x110 · 16 Bytes)</label>
            <input
              type="text"
              maxLength={16}
              value={config.copyright}
              onChange={(e) => onConfigChange({ copyright: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-amber-400 font-mono"
              placeholder="(C)SEGA 2026.OCT"
            />
          </div>

          <div>
            <label className="block text-neutral-400 mb-1">Domestic Game Title (0x120 · 48 Bytes)</label>
            <input
              type="text"
              maxLength={48}
              value={config.domesticTitle}
              onChange={(e) => onConfigChange({ domesticTitle: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-amber-400 font-mono"
              placeholder="SEGA VDP WEBCAM CAPTURE"
            />
          </div>

          <div>
            <label className="block text-neutral-400 mb-1">Overseas Game Title (0x150 · 48 Bytes)</label>
            <input
              type="text"
              maxLength={48}
              value={config.overseasTitle}
              onChange={(e) => onConfigChange({ overseasTitle: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-amber-400 font-mono"
              placeholder="SEGA VDP WEBCAM CAPTURE"
            />
          </div>

          <div>
            <label className="block text-neutral-400 mb-1">Product Type & Serial (0x180 · 14 Bytes)</label>
            <input
              type="text"
              maxLength={14}
              value={config.serial}
              onChange={(e) => onConfigChange({ serial: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-amber-400 font-mono"
              placeholder="GM 00000000-00"
            />
          </div>

          <div>
            <label className="block text-neutral-400 mb-1">Release Country / Region Code (0x1F0 · 16 Bytes)</label>
            <select
              value={config.region}
              onChange={(e) => onConfigChange({ region: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-amber-400 font-mono"
            >
              <option value="JUE             ">JUE (Worldwide: Japan, USA, Europe)</option>
              <option value="J               ">J   (Japan NTSC only)</option>
              <option value="U               ">U   (USA NTSC only)</option>
              <option value="E               ">E   (Europe PAL only)</option>
            </select>
          </div>
        </div>

        {/* ROM Specifications Summary */}
        <div className="mt-4 p-3 bg-neutral-950 border border-neutral-800/80 rounded flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span>M68000 Reset Vector: 0x00000200 · Stack Pointer: 0x00FFFE00</span>
          </div>
          <div className="text-neutral-400">
            ROM Size: <span className="text-white font-bold">{romBinary ? (romBinary.length / 1024) : 64} KB</span> (Aligned)
          </div>
        </div>
      </div>

      {/* Live 256-byte Hex Dump Inspector */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Live ROM Header Binary Hex Dump (Offset 0x00000100 - 0x000001FF)</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownloadCHeader}
              className="px-3 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 transition-colors"
            >
              Download SGDK C Header (.h)
            </button>
            <button
              onClick={onDownloadRom}
              className="flex items-center gap-1.5 px-3 py-1 text-xs bg-amber-400 hover:bg-amber-300 text-neutral-900 font-bold rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .BIN ROM</span>
            </button>
          </div>
        </div>

        <div className="bg-neutral-950 border border-neutral-800 rounded p-3 overflow-x-auto font-mono text-xs text-neutral-300 leading-relaxed select-text">
          <div className="grid grid-cols-[80px_1fr_160px] gap-4 border-b border-neutral-800 pb-1 text-neutral-500 font-bold">
            <div>Offset</div>
            <div>Hex (00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F)</div>
            <div>ASCII Decode</div>
          </div>
          {hexDumpRows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-[80px_1fr_160px] gap-4 hover:bg-neutral-900/60 py-0.5">
              <span className="text-amber-500/80">{row.offset}</span>
              <span className="text-neutral-200 tracking-wide">{row.hex}</span>
              <span className="text-cyan-400 font-mono tracking-wider">{row.ascii}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-start gap-2 text-xs text-neutral-400">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            This header complies with official Sega technical specifications. When burned onto a flash cartridge (Mega EverDrive) or loaded into emulators (BlastEm, Genesis Plus GX, Kega Fusion, RetroArch), the 68000 boot routine executes immediately, initializes the Yamaha VDP, loads the webcam tiles into VRAM, and displays the camera snapshot.
          </span>
        </div>
      </div>
    </div>
  );
};
