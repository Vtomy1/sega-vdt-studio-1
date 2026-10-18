import { PpuAnalysis, RomHeaderConfig, SegaColor } from '../types/sega';

/**
 * Standard Sega Mega Drive VDP Registers setup values
 */
const VDP_INIT_REGISTERS = [
  0x8004, // 0: Enable H-blank interrupt off, 8 colors mode off
  0x8174, // 1: Enable display, V-int on, DMA on, 224 lines
  0x8230, // 2: Plane A at VRAM 0xC000 (0x30 * 0x400)
  0x8300, // 3: Window at 0x0000
  0x8407, // 4: Plane B at VRAM 0xE000 (0x07 * 0x2000)
  0x857C, // 5: Sprite Table at 0xF800 (0x7C * 0x200)
  0x8600, // 6: Unused
  0x8700, // 7: Backdrop color (palette 0, color 0)
  0x8800, // 8: Unused
  0x8900, // 9: Unused
  0x8AFF, // 10: H-int line counter
  0x8B00, // 11: Scroll mode: full screen
  0x8C81, // 12: 40-cell mode (320x224), no shadow/highlight (or 0x8C00 for 32-cell)
  0x8D3F, // 13: H-scroll table at 0xFC00 (0x3F * 0x400)
  0x8E00, // 14: Unused
  0x8F02, // 15: Auto-increment 2 bytes
  0x9001, // 16: Plane size 64x32
  0x9100, // 17: Window H position
  0x9200, // 18: Window V position
];

/**
 * Pad string to exact byte length with spaces
 */
function padString(str: string, len: number): Uint8Array {
  const result = new Uint8Array(len);
  result.fill(0x20); // space
  const encoded = new TextEncoder().encode(str.slice(0, len));
  result.set(encoded);
  return result;
}

/**
 * Calculate standard Sega Mega Drive 16-bit ROM checksum
 * Sum of all 16-bit words from offset 0x200 to end of ROM
 */
export function calculateSegaChecksum(rom: Uint8Array): number {
  let sum = 0;
  for (let i = 0x200; i < rom.length; i += 2) {
    const word = (rom[i] << 8) | rom[i + 1];
    sum = (sum + word) & 0xffff;
  }
  return sum;
}

/**
 * Generate a complete, bootable Sega Genesis / Mega Drive ROM (.bin)
 */
export function generateGenesisRom(
  analysis: PpuAnalysis,
  config: Partial<RomHeaderConfig> = {}
): Uint8Array {
  // Determine minimum ROM size: multiple of 64KB, at least 64KB
  const rawSize = 0x200 + 512 + 32 + analysis.uniqueTilePatterns.length * 32 + analysis.nametable.length * 2;
  const romSize = Math.max(65536, Math.ceil(rawSize / 65536) * 65536);

  const rom = new Uint8Array(romSize);
  rom.fill(0xff); // Standard unwritten ROM bytes are 0xFF

  const view = new DataView(rom.buffer);

  // 1. M68000 Vector Table (0x000 - 0x100)
  view.setUint32(0x000, 0x00fffe00, false); // Initial SP: top of 64KB RAM (0xFF0000 + 0xFE00)
  view.setUint32(0x004, 0x00000200, false); // Initial PC / Reset Vector: 0x200

  // Point default exception vectors to safe loop or reset
  for (let vec = 0x008; vec < 0x100; vec += 4) {
    view.setUint32(vec, 0x00000200, false);
  }
  // VBlank interrupt vector (Level 6 autovector at 0x78)
  view.setUint32(0x078, 0x00000200, false);

  // 2. Sega Standard Header (0x100 - 0x200)
  const consoleName = config.consoleName || 'SEGA MEGA DRIVE ';
  const copyright = config.copyright || '(C)SEGA 2026.OCT';
  const domesticTitle = config.domesticTitle || 'SEGA VDP WEBCAM CAPTURE';
  const overseasTitle = config.overseasTitle || 'SEGA VDP WEBCAM CAPTURE';
  const serial = config.serial || 'GM 00000000-00';
  const region = config.region || 'JUE             ';

  rom.set(padString(consoleName, 16), 0x100);
  rom.set(padString(copyright, 16), 0x110);
  rom.set(padString(domesticTitle, 48), 0x120);
  rom.set(padString(overseasTitle, 48), 0x150);
  rom.set(padString(serial, 14), 0x180);

  // 0x18E: Checksum (will be filled after code injection)
  rom.set(padString('J6              ', 16), 0x190); // 6-button controller support

  // Memory addresses
  view.setUint32(0x1a0, 0x00000000, false); // ROM start
  view.setUint32(0x1a4, romSize - 1, false); // ROM end
  view.setUint32(0x1a8, 0x00ff0000, false); // RAM start
  view.setUint32(0x1ac, 0x00ffffff, false); // RAM end

  // Backup RAM & notes
  rom.set(padString('            ', 12), 0x1b0); // SRAM info
  rom.set(padString('            ', 12), 0x1bc); // Modem
  rom.set(padString('WEBCAM TO SEGA PPU TILES GENERATOR      ', 40), 0x1c8); // Memo
  rom.set(padString(region, 16), 0x1f0); // Region code

  // 3. Executable M68000 Machine Code Routine at 0x200
  // Offset tracker
  let pc = 0x200;

  // move.w #$2700, %sr (disable interrupts) -> 46 FC 27 00
  rom[pc++] = 0x46; rom[pc++] = 0xfc; rom[pc++] = 0x27; rom[pc++] = 0x00;

  // TMSS check and unlock:
  // move.b ($A10001), %d0 -> 10 39 00 A1 00 01
  rom[pc++] = 0x10; rom[pc++] = 0x39;
  rom[pc++] = 0x00; rom[pc++] = 0xa1; rom[pc++] = 0x00; rom[pc++] = 0x01;
  // andi.b #$0F, %d0 -> 02 00 00 0F
  rom[pc++] = 0x02; rom[pc++] = 0x00; rom[pc++] = 0x00; rom[pc++] = 0x0f;
  // beq.s skip_tmss (+10 bytes) -> 67 0A
  rom[pc++] = 0x67; rom[pc++] = 0x0a;
  // move.l #'SEGA', ($A14000) -> 23 FC 53 45 47 41 00 A1 40 00
  rom[pc++] = 0x23; rom[pc++] = 0xfc;
  rom[pc++] = 0x53; rom[pc++] = 0x45; rom[pc++] = 0x47; rom[pc++] = 0x41; // 'SEGA'
  rom[pc++] = 0x00; rom[pc++] = 0xa1; rom[pc++] = 0x40; rom[pc++] = 0x00;

  // VDP Control Port = 0xC00004, Data Port = 0xC00000
  // Initialize VDP Registers:
  const isH40 = analysis.width === 320;
  for (let r = 0; r < VDP_INIT_REGISTERS.length; r++) {
    let regVal = VDP_INIT_REGISTERS[r];
    if (r === 12) {
      regVal = isH40 ? 0x8c81 : 0x8c00; // H40 vs H32 mode
    }
    // move.w #regVal, ($00C00004) -> 33 FC regVal 00 C0 00 04
    rom[pc++] = 0x33; rom[pc++] = 0xfc;
    rom[pc++] = (regVal >> 8) & 0xff; rom[pc++] = regVal & 0xff;
    rom[pc++] = 0x00; rom[pc++] = 0xc0; rom[pc++] = 0x00; rom[pc++] = 0x04;
  }

  // Data pointers in ROM:
  // We'll place paletteData, tilePatternsData, and nametableData immediately after our code!
  // Let's reserve addresses:
  const codeHeaderEnd = pc + 120; // safe estimation
  const paletteRomAddr = (codeHeaderEnd + 3) & ~3; // 4-byte aligned
  const tilesRomAddr = paletteRomAddr + 32; // 16 words = 32 bytes
  const mapRomAddr = tilesRomAddr + analysis.uniqueTilePatterns.length * 32;

  // --- Load Palette to CRAM (CRAM write command 0xC0000000) ---
  // move.l #$C0000000, ($00C00004) -> 23 FC C0 00 00 00 00 C0 00 04
  rom[pc++] = 0x23; rom[pc++] = 0xfc;
  rom[pc++] = 0xc0; rom[pc++] = 0x00; rom[pc++] = 0x00; rom[pc++] = 0x00;
  rom[pc++] = 0x00; rom[pc++] = 0xc0; rom[pc++] = 0x00; rom[pc++] = 0x04;

  // lea paletteRomAddr, %a0 -> 41 F9 paletteRomAddr
  rom[pc++] = 0x41; rom[pc++] = 0xf9;
  view.setUint32(pc, paletteRomAddr, false); pc += 4;
  // move.w #15, %d0 -> 30 3C 00 0F
  rom[pc++] = 0x30; rom[pc++] = 0x3c; rom[pc++] = 0x00; rom[pc++] = 0x0f;
  // loop_pal: move.w (%a0)+, ($00C00000) -> 33 D8 00 C0 00 00
  const loopPal = pc;
  rom[pc++] = 0x33; rom[pc++] = 0xd8; rom[pc++] = 0x00; rom[pc++] = 0xc0; rom[pc++] = 0x00; rom[pc++] = 0x00;
  // dbra %d0, loop_pal -> 51 C8 displacement
  rom[pc++] = 0x51; rom[pc++] = 0xc8;
  const dispPal = loopPal - (pc + 2);
  view.setInt16(pc, dispPal, false); pc += 2;

  // --- Load Unique Tiles to VRAM at 0x0000 (VRAM write command 0x40000000) ---
  // move.l #$40000000, ($00C00004)
  rom[pc++] = 0x23; rom[pc++] = 0xfc;
  rom[pc++] = 0x40; rom[pc++] = 0x00; rom[pc++] = 0x00; rom[pc++] = 0x00;
  rom[pc++] = 0x00; rom[pc++] = 0xc0; rom[pc++] = 0x00; rom[pc++] = 0x04;

  // lea tilesRomAddr, %a0
  rom[pc++] = 0x41; rom[pc++] = 0xf9;
  view.setUint32(pc, tilesRomAddr, false); pc += 4;
  // Number of longwords = (uniqueTiles * 32) / 4 = uniqueTiles * 8
  const numLongs = analysis.uniqueTilePatterns.length * 8;
  // move.l #numLongs-1, %d0 -> 20 3C ...
  rom[pc++] = 0x20; rom[pc++] = 0x3c;
  view.setUint32(pc, numLongs - 1, false); pc += 4;
  // loop_tiles: move.l (%a0)+, ($00C00000) -> 23 D8 00 C0 00 00
  const loopTiles = pc;
  rom[pc++] = 0x23; rom[pc++] = 0xd8; rom[pc++] = 0x00; rom[pc++] = 0xc0; rom[pc++] = 0x00; rom[pc++] = 0x00;
  // subq.l #1, %d0 -> 53 80
  rom[pc++] = 0x53; rom[pc++] = 0x80;
  // bpl.s loop_tiles -> 6A displacement
  rom[pc++] = 0x6a;
  const dispTiles = loopTiles - (pc + 1);
  rom[pc++] = dispTiles & 0xff;

  // --- Load Plane A Nametable at 0xC000 ---
  // VRAM write command to 0xC000 = 0x60000003
  rom[pc++] = 0x23; rom[pc++] = 0xfc;
  rom[pc++] = 0x60; rom[pc++] = 0x00; rom[pc++] = 0x00; rom[pc++] = 0x03;
  rom[pc++] = 0x00; rom[pc++] = 0xc0; rom[pc++] = 0x00; rom[pc++] = 0x04;

  // lea mapRomAddr, %a0
  rom[pc++] = 0x41; rom[pc++] = 0xf9;
  view.setUint32(pc, mapRomAddr, false); pc += 4;
  // move.w #numCells-1, %d0
  rom[pc++] = 0x30; rom[pc++] = 0x3c;
  view.setUint16(pc, analysis.nametable.length - 1, false); pc += 2;
  // loop_map: move.w (%a0)+, ($00C00000)
  const loopMap = pc;
  rom[pc++] = 0x33; rom[pc++] = 0xd8; rom[pc++] = 0x00; rom[pc++] = 0xc0; rom[pc++] = 0x00; rom[pc++] = 0x00;
  // dbra %d0, loop_map
  rom[pc++] = 0x51; rom[pc++] = 0xc8;
  const dispMap = loopMap - (pc + 2);
  view.setInt16(pc, dispMap, false); pc += 2;

  // Infinite spin loop: bra.s * (60 FE)
  rom[pc++] = 0x60; rom[pc++] = 0xfe;

  // --- Write Palette Data to paletteRomAddr ---
  for (let c = 0; c < 16; c++) {
    const col = analysis.palette[c] || analysis.palette[0];
    view.setUint16(paletteRomAddr + c * 2, col.cramWord, false);
  }

  // --- Write Unique Tiles Data to tilesRomAddr ---
  for (let t = 0; t < analysis.uniqueTilePatterns.length; t++) {
    rom.set(analysis.uniqueTilePatterns[t], tilesRomAddr + t * 32);
  }

  // --- Write Nametable Data to mapRomAddr ---
  for (let m = 0; m < analysis.nametable.length; m++) {
    const cell = analysis.nametable[m];
    // Word format: [P][CC][VF][HF][TTTTTTTTTTT]
    // Bit 15: Priority, 13-14: Palette, 12: VFlip, 11: HFlip, 0-10: Tile ID
    const prio = cell.priority ? 1 : 0;
    const pal = cell.paletteLine & 3;
    const vf = cell.vFlip ? 1 : 0;
    const hf = cell.hFlip ? 1 : 0;
    const tid = cell.tileId & 0x07ff;

    const word = (prio << 15) | (pal << 13) | (vf << 12) | (hf << 11) | tid;
    view.setUint16(mapRomAddr + m * 2, word, false);
  }

  // 4. Calculate Checksum and store at 0x18E
  const checksum = calculateSegaChecksum(rom);
  view.setUint16(0x18e, checksum, false);

  return rom;
}

/**
 * Generate Sega Master System ROM (.sms, 32KB)
 */
export function generateMasterSystemRom(
  analysis: PpuAnalysis,
  title: string = 'SEGA SMS CAPTURE'
): Uint8Array {
  const rom = new Uint8Array(32768);
  rom.fill(0xff);

  // Z80 reset vector at 0x0000: DI, IM 1, JP 0x0040
  rom[0] = 0xf3; // DI
  rom[1] = 0xed; rom[2] = 0x56; // IM 1
  rom[3] = 0xc3; rom[4] = 0x40; rom[5] = 0x00; // JP 0x0040

  // 0x0040 startup routine
  rom[0x40] = 0x31; rom[0x41] = 0xf0; rom[0x42] = 0xdf; // LD SP, 0xDFF0
  rom[0x43] = 0x18; rom[0x44] = 0xfe; // JR $ (spin)

  // Standard SMS Header at 0x7FF0
  const headerStart = 0x7ff0;
  // "TMR SEGA"
  const tmr = new TextEncoder().encode('TMR SEGA');
  rom.set(tmr, headerStart);
  // Reserved 2 bytes (0x20 0x20)
  rom[headerStart + 8] = 0x20;
  rom[headerStart + 9] = 0x20;

  // Calculate 16-bit SMS checksum of 0x0000 to 0x7FEF
  let sum = 0;
  for (let i = 0; i < 0x7ff0; i++) {
    sum = (sum + rom[i]) & 0xffff;
  }
  rom[headerStart + 10] = sum & 0xff;
  rom[headerStart + 11] = (sum >> 8) & 0xff;

  // Product code, version, and region code (4 = Export / Worldwide)
  rom[headerStart + 12] = 0x00;
  rom[headerStart + 13] = 0x00;
  rom[headerStart + 14] = 0x00;
  rom[headerStart + 15] = 0x4c; // Region: Export, 32KB

  return rom;
}

/**
 * Generate SGDK C Header (.h)
 */
export function generateSgdkCHeader(analysis: PpuAnalysis, name: string = 'capture'): string {
  const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  const dateStr = new Date().toISOString().split('T')[0];

  let out = `/**\n`;
  out += ` * Sega Mega Drive / Genesis Asset Export\n`;
  out += ` * Generated: ${dateStr}\n`;
  out += ` * Resolution: ${analysis.width}x${analysis.height} (${analysis.tilesX}x${analysis.tilesY} tiles)\n`;
  out += ` * Unique Tiles: ${analysis.uniqueTilesCount} (${analysis.compressionRatio.toFixed(1)}% VRAM saved)\n`;
  out += ` * Target: SGDK / Sega Genesis C Engine\n`;
  out += ` */\n\n`;
  out += `#ifndef _${safeName.toUpperCase()}_H_\n`;
  out += `#define _${safeName.toUpperCase()}_H_\n\n`;
  out += `#include <genesis.h>\n\n`;

  // Palette array (16 x u16)
  out += `// Sega Genesis 9-bit CRAM Palette (0x0BGR)\n`;
  out += `const u16 ${safeName}_palette[16] = {\n  `;
  const palWords = analysis.palette.map(
    (c) => '0x' + c.cramWord.toString(16).padStart(4, '0').toUpperCase()
  );
  out += palWords.join(', ') + '\n};\n\n';

  // Tile patterns (4bpp packed: 8 u32 words per tile)
  out += `// VRAM Tile Patterns (${analysis.uniqueTilesCount} tiles, 32 bytes each = ${analysis.vramBytes} bytes)\n`;
  out += `const u32 ${safeName}_tiles[${analysis.uniqueTilesCount * 8}] = {\n`;
  for (let t = 0; t < analysis.uniqueTilePatterns.length; t++) {
    const tile = analysis.uniqueTilePatterns[t];
    const u32s: string[] = [];
    for (let j = 0; j < 32; j += 4) {
      const val =
        ((tile[j] << 24) >>> 0) |
        (tile[j + 1] << 16) |
        (tile[j + 2] << 8) |
        tile[j + 3];
      u32s.push('0x' + (val >>> 0).toString(16).padStart(8, '0').toUpperCase());
    }
    out += `  /* Tile ${t.toString().padStart(3, '0')} */ ${u32s.join(', ')},\n`;
  }
  out += `};\n\n`;

  // Nametable / Tilemap
  out += `// Plane A Nametable (${analysis.tilesX}x${analysis.tilesY} cells = ${analysis.nametable.length} words)\n`;
  out += `// Attributes: [Priority:1][Pal:2][VFlip:1][HFlip:1][TileIndex:11]\n`;
  out += `const u16 ${safeName}_map[${analysis.nametable.length}] = {\n`;
  for (let ty = 0; ty < analysis.tilesY; ty++) {
    out += `  /* Row ${ty.toString().padStart(2, '0')} */ `;
    const rowWords: string[] = [];
    for (let tx = 0; tx < analysis.tilesX; tx++) {
      const cell = analysis.nametable[ty * analysis.tilesX + tx];
      const word =
        ((cell.priority ? 1 : 0) << 15) |
        ((cell.paletteLine & 3) << 13) |
        ((cell.vFlip ? 1 : 0) << 12) |
        ((cell.hFlip ? 1 : 0) << 11) |
        (cell.tileId & 0x07ff);
      rowWords.push('0x' + word.toString(16).padStart(4, '0').toUpperCase());
    }
    out += rowWords.join(', ') + ',\n';
  }
  out += `};\n\n`;

  out += `// Convenience helper for SGDK\n`;
  out += `static inline void load_${safeName}(VDPPlane plane, u16 tile_index) {\n`;
  out += `    VDP_setPalette(PAL0, ${safeName}_palette);\n`;
  out += `    VDP_loadTileData(${safeName}_tiles, tile_index, ${analysis.uniqueTilesCount}, CPU);\n`;
  out += `    VDP_setTileMapDataRect(plane, ${safeName}_map, 0, 0, ${analysis.tilesX}, ${analysis.tilesY});\n`;
  out += `}\n\n`;

  out += `#endif // _${safeName.toUpperCase()}_H_\n`;

  return out;
}

/**
 * Generate Motorola 68000 Assembly (.s)
 */
export function generateM68kAsm(analysis: PpuAnalysis, name: string = 'capture'): string {
  const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

  let asm = `;==============================================================================\n`;
  asm += `; SEGA MEGA DRIVE / GENESIS ASSEMBLY DATA\n`;
  asm += `; Resolution: ${analysis.width}x${analysis.height} | Unique Tiles: ${analysis.uniqueTilesCount}\n`;
  asm += `;==============================================================================\n\n`;

  asm += `\t.globl\t${safeName}_palette\n`;
  asm += `\t.globl\t${safeName}_tiles\n`;
  asm += `\t.globl\t${safeName}_map\n\n`;

  asm += `${safeName}_palette:\n`;
  const palWords = analysis.palette.map(
    (c) => '$' + c.cramWord.toString(16).padStart(4, '0').toUpperCase()
  );
  asm += `\tdc.w\t${palWords.join(', ')}\n\n`;

  asm += `${safeName}_tiles:\n`;
  for (let t = 0; t < analysis.uniqueTilePatterns.length; t++) {
    const tile = analysis.uniqueTilePatterns[t];
    const longs: string[] = [];
    for (let j = 0; j < 32; j += 4) {
      const val =
        ((tile[j] << 24) >>> 0) |
        (tile[j + 1] << 16) |
        (tile[j + 2] << 8) |
        tile[j + 3];
      longs.push('$' + (val >>> 0).toString(16).padStart(8, '0').toUpperCase());
    }
    asm += `\tdc.l\t${longs.join(', ')}\t; Tile ${t}\n`;
  }
  asm += `\n`;

  asm += `${safeName}_map:\n`;
  for (let ty = 0; ty < analysis.tilesY; ty++) {
    const rowWords: string[] = [];
    for (let tx = 0; tx < analysis.tilesX; tx++) {
      const cell = analysis.nametable[ty * analysis.tilesX + tx];
      const word =
        ((cell.priority ? 1 : 0) << 15) |
        ((cell.paletteLine & 3) << 13) |
        ((cell.vFlip ? 1 : 0) << 12) |
        ((cell.hFlip ? 1 : 0) << 11) |
        (cell.tileId & 0x07ff);
      rowWords.push('$' + word.toString(16).padStart(4, '0').toUpperCase());
    }
    asm += `\tdc.w\t${rowWords.join(', ')}\t; Row ${ty}\n`;
  }

  return asm;
}
