export type SegaConsole = 'genesis_h40' | 'genesis_h32' | 'master_system';

export type DitherAlgorithm =
  | 'none'
  | 'bayer2'
  | 'bayer4'
  | 'bayer8'
  | 'floyd-steinberg'
  | 'atkinson'
  | 'sierra2'
  | 'checkerboard';

export interface SegaColor {
  /** Channel values: 0 to 7 for 9-bit Genesis (or 0 to 3 for SMS) */
  r: number;
  g: number;
  b: number;
  /** Actual display 0..255 RGB values */
  displayR: number;
  displayG: number;
  displayB: number;
  /** Genesis VDP CRAM word (0x0BGR, where each nibble is 0, 2, 4, 6, 8, A, C, E) */
  cramWord: number;
  /** Hex string e.g. '#00e' or '#123456' */
  hex: string;
}

export interface TileNametableEntry {
  tileId: number;
  paletteLine: number;
  priority: boolean;
  hFlip: boolean;
  vFlip: boolean;
}

export interface PpuAnalysis {
  width: number;
  height: number;
  tilesX: number;
  tilesY: number;
  totalTiles: number;
  uniqueTilesCount: number;
  compressionRatio: number;
  vramBytes: number;
  maxVramBytes: number;
  palette: SegaColor[];
  nametable: TileNametableEntry[];
  uniqueTilePatterns: Uint8Array[]; // 32 bytes per 8x8 4bpp tile
  uniqueTileBlocks: Uint8Array[]; // 64 bytes (pixel indices 0..15) per 8x8 tile
  uniqueTileImages: ImageData[];
}

export interface RomHeaderConfig {
  consoleName: string; // 'SEGA MEGA DRIVE ' or 'SEGA GENESIS    '
  copyright: string;   // '(C)SEGA 2026.OCT'
  domesticTitle: string; // 48 chars
  overseasTitle: string; // 48 chars
  serial: string;      // 'GM 00000000-00'
  region: string;      // 'JUE'
  author: string;
  checksum: number;
  romSize: number;
}
