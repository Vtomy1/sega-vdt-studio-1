import React from 'react';
import { Cpu, Tv, Layers, ShieldCheck, Terminal, Disc } from 'lucide-react';

export const HardwareSpecsModal: React.FC = () => {
  return (
    <div className="space-y-6 text-neutral-300">
      {/* Intro Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
        <div className="flex items-center gap-3 border-b border-neutral-800 pb-3 mb-4">
          <Cpu className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white font-['Plus_Jakarta_Sans',sans-serif]">
            Sega 16-Bit VDP (Video Display Processor) Hardware Architecture
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-neutral-300">
          The Sega Mega Drive / Genesis graphics subsystem is powered by a custom Video Display Processor (VDP) based on Yamaha’s YM7101. It is paired with a Motorola 68000 main CPU running at 7.67 MHz and a Zilog Z80 coprocessor for sound. Understanding how real Sega hardware processes pixels, palettes, and tilemaps unlocks the full power of authentic retro graphics.
        </p>
      </div>

      {/* Grid of hardware concepts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* 1. 9-Bit RGB Color System & CRAM */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-white font-semibold border-b border-neutral-800 pb-2">
            <Tv className="w-4 h-4 text-amber-400" />
            <span>9-Bit RGB DAC & CRAM Architecture</span>
          </div>
          <p className="text-neutral-400 leading-relaxed">
            The Genesis VDP has a 9-bit color DAC with 3 bits per channel (Red, Green, Blue), providing a total master palette of <strong className="text-amber-400">512 colors</strong>. Hardware voltage levels correspond to values 0, 52, 87, 122, 157, 192, 227, and 255.
          </p>
          <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800 font-mono text-[11px] space-y-1">
            <div className="text-amber-400 font-bold">CRAM Word Format (0x0BGR):</div>
            <div>Bits 11-8: Blue channel (0, 2, 4, 6, 8, A, C, E)</div>
            <div>Bits 7-4: Green channel (0, 2, 4, 6, 8, A, C, E)</div>
            <div>Bits 3-0: Red channel (0, 2, 4, 6, 8, A, C, E)</div>
            <div className="text-neutral-500">// Bit 0 is ignored on standard hardware</div>
          </div>
        </div>

        {/* 2. Dithering & Composite Blending */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-white font-semibold border-b border-neutral-800 pb-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Why Dithering Was the Secret Weapon</span>
          </div>
          <p className="text-neutral-400 leading-relaxed">
            Because the Genesis could only display 64 colors simultaneously on screen (4 palettes of 16 colors), 90s Sega graphic artists invented advanced ordered and checkerboard dithering.
          </p>
          <p className="text-neutral-400 leading-relaxed">
            When viewed on an authentic CRT TV through composite video cables, the natural horizontal chroma bleeding of the NTSC/PAL television tube automatically blurred alternating pixels into seamless gradients and <strong className="text-white">pseudo-transparency</strong> (most famously the waterfalls in <em>Sonic the Hedgehog</em> and smoke in <em>Streets of Rage</em>).
          </p>
        </div>

        {/* 3. VRAM 8x8 Tile Pattern Encoding */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-white font-semibold border-b border-neutral-800 pb-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            <span>4bpp Nibble-Packed VRAM Pattern Data</span>
          </div>
          <p className="text-neutral-400 leading-relaxed">
            All graphics on the Mega Drive are constructed from <strong className="text-white">8x8 pixel tiles</strong>. In 4bpp (bits per pixel), each pixel is represented by a 4-bit palette index (0 to 15).
          </p>
          <div className="p-2.5 bg-neutral-950 rounded border border-neutral-800 font-mono text-[11px] space-y-1">
            <div>1 row of 8 pixels = 4 bytes (8 nibbles: high nibble left, low nibble right)</div>
            <div>1 tile (8 rows) = 32 bytes (8 longwords)</div>
            <div className="text-green-400">Total VRAM: 64 Kilobytes (Holds up to ~2,048 unique tiles)</div>
          </div>
        </div>

        {/* 4. Sega ROM Header & Boot Vectors */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-white font-semibold border-b border-neutral-800 pb-2">
            <Disc className="w-4 h-4 text-amber-400" />
            <span>ROM Header Standard (0x100 - 0x200)</span>
          </div>
          <p className="text-neutral-400 leading-relaxed">
            Every official Sega cartridge must include standard header information located from address <strong className="text-amber-400">0x000100 to 0x0001FF</strong>.
          </p>
          <p className="text-neutral-400 leading-relaxed">
            Later Genesis revisions (Model 1 with TMSS, Model 2, Model 3) include the Trademark Security System (TMSS). Before accessing the VDP, software must write the ASCII string <code className="text-amber-400">"SEGA"</code> to hardware register <code className="text-amber-400">0xA14000</code>, otherwise the console locks up with a black screen. Our exported ROM includes this startup code automatically!
          </p>
        </div>
      </div>

      {/* Plane A / Plane B nametable explanation */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-white font-semibold border-b border-neutral-800 pb-2 text-xs">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Nametable Plane Descriptors (16-Bit Cell Format)</span>
        </div>
        <div className="bg-neutral-950 p-3 rounded font-mono text-xs border border-neutral-800 space-y-1 text-neutral-300">
          <div className="text-amber-400 font-bold">[15] Priority | [14-13] Palette Line | [12] V-Flip | [11] H-Flip | [10-0] Tile Pattern ID</div>
          <div className="text-neutral-400 text-[11px] pt-1">
            - <strong>Bit 15 (Priority)</strong>: 0 = Low plane priority (drawn behind high priority sprites), 1 = High plane priority (drawn in front of low priority sprites).
          </div>
          <div className="text-neutral-400 text-[11px]">
            - <strong>Bits 14-13 (Palette)</strong>: Selects one of the 4 CRAM palette lines (0 to 3).
          </div>
          <div className="text-neutral-400 text-[11px]">
            - <strong>Bits 12-11 (V-Flip / H-Flip)</strong>: Hardware mirrors the 8x8 tile on the fly without needing duplicated tile data in VRAM!
          </div>
          <div className="text-neutral-400 text-[11px]">
            - <strong>Bits 10-0 (Tile Index)</strong>: Address index in VRAM (0 to 2047).
          </div>
        </div>
      </div>
    </div>
  );
};
