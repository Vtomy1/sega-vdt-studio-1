import { DitherAlgorithm, SegaColor } from '../types/sega';

// Bayer matrices normalized to [-0.5, 0.5]
const BAYER_2X2 = [
  [0, 2],
  [3, 1],
].map(row => row.map(v => (v / 4) - 0.5));

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map(row => row.map(v => (v / 16) - 0.5));

const BAYER_8X8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
].map(row => row.map(v => (v / 64) - 0.5));

/**
 * Weighted perceptual color distance
 */
export function colorDistanceSq(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const rMean = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  // Approximation of redmean formula for high perceptual fidelity
  return (2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db;
}

/**
 * Find index of closest color in the Sega palette
 */
export function findClosestPaletteIndex(r: number, g: number, b: number, palette: SegaColor[]): number {
  let bestIdx = 0;
  let minDist = Number.MAX_VALUE;

  for (let i = 0; i < palette.length; i++) {
    const c = palette[i];
    const dist = colorDistanceSq(r, g, b, c.displayR, c.displayG, c.displayB);
    if (dist < minDist) {
      minDist = dist;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * Apply Dithering and Quantize an ImageData buffer to Sega Palette
 * Returns:
 * - Uint8Array of palette indices (length: width * height)
 * - output ImageData for direct canvas rendering
 */
export function applySegaDither(
  sourceImage: ImageData,
  palette: SegaColor[],
  algorithm: DitherAlgorithm,
  ditherStrength: number = 1.0 // 0.0 to 2.0
): { indices: Uint8Array; outputImage: ImageData } {
  const width = sourceImage.width;
  const height = sourceImage.height;
  const src = sourceImage.data;

  const indices = new Uint8Array(width * height);
  const output = new ImageData(width, height);
  const outData = output.data;

  // Work on floating point copy for error diffusion
  const isErrorDiffusion =
    algorithm === 'floyd-steinberg' || algorithm === 'atkinson' || algorithm === 'sierra2';

  if (isErrorDiffusion) {
    // 3 channels float buffer: r, g, b
    const errBuf = new Float32Array(width * height * 3);
    for (let i = 0, j = 0; i < src.length; i += 4, j += 3) {
      errBuf[j] = src[i];
      errBuf[j + 1] = src[i + 1];
      errBuf[j + 2] = src[i + 2];
    }

    const distributeError = (x: number, y: number, er: number, eg: number, eb: number, factor: number) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return;
      const idx = (y * width + x) * 3;
      errBuf[idx] += er * factor * ditherStrength;
      errBuf[idx + 1] += eg * factor * ditherStrength;
      errBuf[idx + 2] += eb * factor * ditherStrength;
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIdx = y * width + x;
        const bufIdx = pixelIdx * 3;

        const currentR = Math.max(0, Math.min(255, errBuf[bufIdx]));
        const currentG = Math.max(0, Math.min(255, errBuf[bufIdx + 1]));
        const currentB = Math.max(0, Math.min(255, errBuf[bufIdx + 2]));

        const palIdx = findClosestPaletteIndex(currentR, currentG, currentB, palette);
        indices[pixelIdx] = palIdx;

        const chosen = palette[palIdx];
        const outIdx = pixelIdx * 4;
        outData[outIdx] = chosen.displayR;
        outData[outIdx + 1] = chosen.displayG;
        outData[outIdx + 2] = chosen.displayB;
        outData[outIdx + 3] = 255;

        const errR = currentR - chosen.displayR;
        const errG = currentG - chosen.displayG;
        const errB = currentB - chosen.displayB;

        if (algorithm === 'floyd-steinberg') {
          // Standard Floyd-Steinberg: 7/16, 3/16, 5/16, 1/16
          distributeError(x + 1, y, errR, errG, errB, 7 / 16);
          distributeError(x - 1, y + 1, errR, errG, errB, 3 / 16);
          distributeError(x, y + 1, errR, errG, errB, 5 / 16);
          distributeError(x + 1, y + 1, errR, errG, errB, 1 / 16);
        } else if (algorithm === 'atkinson') {
          // Bill Atkinson (classic Mac/arcade): 1/8 to 6 neighbors (preserves high contrast)
          const factor = 1 / 8;
          distributeError(x + 1, y, errR, errG, errB, factor);
          distributeError(x + 2, y, errR, errG, errB, factor);
          distributeError(x - 1, y + 1, errR, errG, errB, factor);
          distributeError(x, y + 1, errR, errG, errB, factor);
          distributeError(x + 1, y + 1, errR, errG, errB, factor);
          distributeError(x, y + 2, errR, errG, errB, factor);
        } else if (algorithm === 'sierra2') {
          // Sierra-2 (clean 2-row error distribution)
          distributeError(x + 1, y, errR, errG, errB, 4 / 16);
          distributeError(x + 2, y, errR, errG, errB, 3 / 16);
          distributeError(x - 2, y + 1, errR, errG, errB, 1 / 16);
          distributeError(x - 1, y + 1, errR, errG, errB, 2 / 16);
          distributeError(x, y + 1, errR, errG, errB, 3 / 16);
          distributeError(x + 1, y + 1, errR, errG, errB, 2 / 16);
          distributeError(x + 2, y + 1, errR, errG, errB, 1 / 16);
        }
      }
    }
  } else {
    // Ordered Dithering or None or Checkerboard
    const scale = 64 * ditherStrength;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIdx = y * width + x;
        const srcIdx = pixelIdx * 4;

        let r = src[srcIdx];
        let g = src[srcIdx + 1];
        let b = src[srcIdx + 2];

        if (algorithm === 'bayer2') {
          const offset = BAYER_2X2[y % 2][x % 2] * scale;
          r = Math.max(0, Math.min(255, r + offset));
          g = Math.max(0, Math.min(255, g + offset));
          b = Math.max(0, Math.min(255, b + offset));
        } else if (algorithm === 'bayer4') {
          const offset = BAYER_4X4[y % 4][x % 4] * scale;
          r = Math.max(0, Math.min(255, r + offset));
          g = Math.max(0, Math.min(255, g + offset));
          b = Math.max(0, Math.min(255, b + offset));
        } else if (algorithm === 'bayer8') {
          const offset = BAYER_8X8[y % 8][x % 8] * scale;
          r = Math.max(0, Math.min(255, r + offset));
          g = Math.max(0, Math.min(255, g + offset));
          b = Math.max(0, Math.min(255, b + offset));
        } else if (algorithm === 'checkerboard') {
          // Alternating checkerboard mesh dither (Classic Sega Genesis transparency trick)
          const isEven = (x + y) % 2 === 0;
          const offset = (isEven ? 0.35 : -0.35) * scale;
          r = Math.max(0, Math.min(255, r + offset));
          g = Math.max(0, Math.min(255, g + offset));
          b = Math.max(0, Math.min(255, b + offset));
        }

        const palIdx = findClosestPaletteIndex(r, g, b, palette);
        indices[pixelIdx] = palIdx;

        const chosen = palette[palIdx];
        outData[srcIdx] = chosen.displayR;
        outData[srcIdx + 1] = chosen.displayG;
        outData[srcIdx + 2] = chosen.displayB;
        outData[srcIdx + 3] = 255;
      }
    }
  }

  return { indices, outputImage: output };
}
