import { PpuAnalysis, SegaColor, TileNametableEntry } from '../types/sega';

/**
 * Extract an 8x8 block of palette indices from full image index buffer
 */
function extract8x8Block(
  indices: Uint8Array,
  imageWidth: number,
  tileX: number,
  tileY: number
): Uint8Array {
  const block = new Uint8Array(64);
  const startX = tileX * 8;
  const startY = tileY * 8;

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const srcIdx = (startY + y) * imageWidth + (startX + x);
      block[y * 8 + x] = indices[srcIdx];
    }
  }

  return block;
}

/**
 * Pack 64 4-bit pixel indices into 32 bytes of Genesis VDP 4bpp planar/nibble format
 */
export function packTileToGenesis4bpp(block: Uint8Array): Uint8Array {
  const packed = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    const p0 = block[i * 2] & 0x0f;
    const p1 = block[i * 2 + 1] & 0x0f;
    // Genesis VDP: High nibble is left pixel, low nibble is right pixel
    packed[i] = (p0 << 4) | p1;
  }
  return packed;
}

/**
 * Create ImageData for an 8x8 tile given its palette indices
 */
export function createTileImageData(block: Uint8Array, palette: SegaColor[]): ImageData {
  const imgData = new ImageData(8, 8);
  const data = imgData.data;

  for (let i = 0; i < 64; i++) {
    const palIdx = block[i] & 0x0f;
    const color = palette[palIdx] || palette[0];
    const outIdx = i * 4;
    data[outIdx] = color.displayR;
    data[outIdx + 1] = color.displayG;
    data[outIdx + 2] = color.displayB;
    data[outIdx + 3] = 255;
  }

  return imgData;
}

/**
 * Check match with optional H-flip and V-flip
 */
function matchBlocks(
  a: Uint8Array,
  b: Uint8Array,
  allowFlip: boolean = true
): { matches: boolean; hFlip: boolean; vFlip: boolean } {
  // 1. Direct match
  let directMatch = true;
  for (let i = 0; i < 64; i++) {
    if (a[i] !== b[i]) {
      directMatch = false;
      break;
    }
  }
  if (directMatch) return { matches: true, hFlip: false, vFlip: false };

  if (!allowFlip) return { matches: false, hFlip: false, vFlip: false };

  // 2. H-Flip match
  let hMatch = true;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (a[y * 8 + x] !== b[y * 8 + (7 - x)]) {
        hMatch = false;
        break;
      }
    }
    if (!hMatch) break;
  }
  if (hMatch) return { matches: true, hFlip: true, vFlip: false };

  // 3. V-Flip match
  let vMatch = true;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (a[y * 8 + x] !== b[(7 - y) * 8 + x]) {
        vMatch = false;
        break;
      }
    }
    if (!vMatch) break;
  }
  if (vMatch) return { matches: true, hFlip: false, vFlip: true };

  // 4. HV-Flip match
  let hvMatch = true;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (a[y * 8 + x] !== b[(7 - y) * 8 + (7 - x)]) {
        hvMatch = false;
        break;
      }
    }
    if (!hvMatch) break;
  }
  if (hvMatch) return { matches: true, hFlip: true, vFlip: true };

  return { matches: false, hFlip: false, vFlip: false };
}

/**
 * Unpack 32 bytes of Genesis VDP 4bpp planar/nibble format into 64 pixel indices
 */
export function unpackGenesis4bppToTile(packed: Uint8Array): Uint8Array {
  const block = new Uint8Array(64);
  for (let i = 0; i < 32; i++) {
    const byte = packed[i];
    block[i * 2] = (byte >> 4) & 0x0f;
    block[i * 2 + 1] = byte & 0x0f;
  }
  return block;
}

/**
 * Re-render the entire screen ImageData from nametable and updated unique tile blocks
 */
export function renderNametableToImageData(
  analysis: PpuAnalysis,
  uniqueTileBlocks: Uint8Array[]
): ImageData {
  const imgData = new ImageData(analysis.width, analysis.height);
  const data = imgData.data;
  const palette = analysis.palette;

  for (let ty = 0; ty < analysis.tilesY; ty++) {
    for (let tx = 0; tx < analysis.tilesX; tx++) {
      const cell = analysis.nametable[ty * analysis.tilesX + tx];
      const block = uniqueTileBlocks[cell.tileId];
      if (!block) continue;

      for (let y = 0; y < 8; y++) {
        const py = cell.vFlip ? 7 - y : y;
        for (let x = 0; x < 8; x++) {
          const px = cell.hFlip ? 7 - x : x;
          const palIdx = block[py * 8 + px] & 0x0f;
          const col = palette[palIdx] || palette[0];

          const outX = tx * 8 + x;
          const outY = ty * 8 + y;
          const outIdx = (outY * analysis.width + outX) * 4;

          data[outIdx] = col.displayR;
          data[outIdx + 1] = col.displayG;
          data[outIdx + 2] = col.displayB;
          data[outIdx + 3] = 255;
        }
      }
    }
  }

  return imgData;
}

/**
 * Analyze screen tiles and build unique VRAM pattern table & nametable
 */
export function analyzePpuTiles(
  indices: Uint8Array,
  width: number,
  height: number,
  palette: SegaColor[],
  allowTileFlipping: boolean = true
): PpuAnalysis {
  const tilesX = Math.floor(width / 8);
  const tilesY = Math.floor(height / 8);
  const totalTiles = tilesX * tilesY;

  const uniqueBlocks: Uint8Array[] = [];
  const uniqueTilePatterns: Uint8Array[] = [];
  const uniqueTileImages: ImageData[] = [];
  const nametable: TileNametableEntry[] = [];

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const block = extract8x8Block(indices, width, tx, ty);

      let foundIdx = -1;
      let matchedHFlip = false;
      let matchedVFlip = false;

      for (let u = 0; u < uniqueBlocks.length; u++) {
        const result = matchBlocks(block, uniqueBlocks[u], allowTileFlipping);
        if (result.matches) {
          foundIdx = u;
          matchedHFlip = result.hFlip;
          matchedVFlip = result.vFlip;
          break;
        }
      }

      if (foundIdx === -1) {
        // New unique tile
        foundIdx = uniqueBlocks.length;
        uniqueBlocks.push(block);
        uniqueTilePatterns.push(packTileToGenesis4bpp(block));
        uniqueTileImages.push(createTileImageData(block, palette));
        matchedHFlip = false;
        matchedVFlip = false;
      }

      nametable.push({
        tileId: foundIdx,
        paletteLine: 0,
        priority: false,
        hFlip: matchedHFlip,
        vFlip: matchedVFlip,
      });
    }
  }

  const uniqueTilesCount = uniqueBlocks.length;
  const compressionRatio =
    totalTiles > 0 ? ((totalTiles - uniqueTilesCount) / totalTiles) * 100 : 0;
  const vramBytes = uniqueTilesCount * 32; // 32 bytes per tile
  const maxVramBytes = 64 * 1024; // 64KB VRAM on Sega Mega Drive

  return {
    width,
    height,
    tilesX,
    tilesY,
    totalTiles,
    uniqueTilesCount,
    compressionRatio,
    vramBytes,
    maxVramBytes,
    palette,
    nametable,
    uniqueTilePatterns,
    uniqueTileBlocks: uniqueBlocks,
    uniqueTileImages,
  };
}
