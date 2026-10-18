import { SegaColor } from '../types/sega';

// Genesis 9-bit DAC hardware voltage levels mapped to 8-bit display values
// Sega Mega Drive VDP uses levels 0, 52, 87, 122, 157, 192, 227, 255
export const GENESIS_DAC_TABLE = [0, 52, 87, 122, 157, 192, 227, 255];

/**
 * Convert 0..7 3-bit channel to 0..255 screen RGB
 */
export function channel3To8(val: number): number {
  const clamped = Math.max(0, Math.min(7, Math.round(val)));
  return GENESIS_DAC_TABLE[clamped];
}

/**
 * Snap 0..255 screen RGB to 0..7 3-bit channel
 */
export function channel8To3(val: number): number {
  let closestIdx = 0;
  let minDiff = 999;
  for (let i = 0; i < 8; i++) {
    const diff = Math.abs(GENESIS_DAC_TABLE[i] - val);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  }
  return closestIdx;
}

/**
 * Create a SegaColor from 3-bit R, G, B channels (0..7)
 */
export function createSegaColor(r3: number, g3: number, b3: number): SegaColor {
  const r = Math.max(0, Math.min(7, Math.round(r3)));
  const g = Math.max(0, Math.min(7, Math.round(g3)));
  const b = Math.max(0, Math.min(7, Math.round(b3)));

  const displayR = channel3To8(r);
  const displayG = channel3To8(g);
  const displayB = channel3To8(b);

  // Sega CRAM word: 0x0BGR (bits 1-3: R, bits 5-7: G, bits 9-11: B)
  // Even values: r*2, g*2, b*2
  const cramWord = ((b * 2) << 8) | ((g * 2) << 4) | (r * 2);

  const hexR = displayR.toString(16).padStart(2, '0');
  const hexG = displayG.toString(16).padStart(2, '0');
  const hexB = displayB.toString(16).padStart(2, '0');
  const hex = `#${hexR}${hexG}${hexB}`;

  return { r, g, b, displayR, displayG, displayB, cramWord, hex };
}

/**
 * Master System 6-bit color (0..3 per channel)
 */
export function createSmsColor(r2: number, g2: number, b2: number): SegaColor {
  const r = Math.max(0, Math.min(3, Math.round(r2)));
  const g = Math.max(0, Math.min(3, Math.round(g2)));
  const b = Math.max(0, Math.min(3, Math.round(b2)));

  const displayR = Math.round((r / 3) * 255);
  const displayG = Math.round((g / 3) * 255);
  const displayB = Math.round((b / 3) * 255);

  const cramWord = (b << 4) | (g << 2) | r;
  const hexR = displayR.toString(16).padStart(2, '0');
  const hexG = displayG.toString(16).padStart(2, '0');
  const hexB = displayB.toString(16).padStart(2, '0');

  return { r, g, b, displayR, displayG, displayB, cramWord, hex: `#${hexR}${hexG}${hexB}` };
}

/**
 * Pre-defined Authentic Sega Palettes
 */
export interface SegaPalettePreset {
  id: string;
  name: string;
  system: 'Genesis' | 'SMS';
  colors: SegaColor[];
}

export const SEGA_PALETTES: SegaPalettePreset[] = [
  {
    id: 'sonic_green_hill',
    name: 'Green Hill Zone (Sonic)',
    system: 'Genesis',
    colors: [
      createSegaColor(0, 0, 0), // BG/Transparent
      createSegaColor(0, 1, 5), // Deep Sky Blue
      createSegaColor(2, 4, 7), // Sky Cyan
      createSegaColor(0, 3, 0), // Dark Leaf Green
      createSegaColor(1, 5, 1), // Grass Emerald
      createSegaColor(3, 7, 2), // Highlight Lime
      createSegaColor(4, 2, 0), // Dark Earth Brown
      createSegaColor(6, 4, 1), // Dirt Tan
      createSegaColor(7, 6, 3), // Sand Ochre
      createSegaColor(7, 1, 1), // Sonic Red Shoes
      createSegaColor(7, 7, 7), // Pure White
      createSegaColor(1, 1, 1), // Shadow Slate
      createSegaColor(7, 5, 2), // Sonic Tan Belly
      createSegaColor(0, 0, 7), // Sonic Blue
      createSegaColor(4, 4, 4), // Stone Grey
      createSegaColor(7, 7, 1), // Gold Ring Yellow
    ],
  },
  {
    id: 'streets_of_rage_neon',
    name: 'Streets of Rage (Neon Night)',
    system: 'Genesis',
    colors: [
      createSegaColor(0, 0, 1), // Deep Night Abyss
      createSegaColor(1, 0, 3), // Midnight Purple
      createSegaColor(4, 0, 5), // Neon Violet
      createSegaColor(7, 1, 5), // Electric Magenta
      createSegaColor(0, 2, 4), // Asphalt Cyan
      createSegaColor(0, 5, 7), // Bright Neon Cyan
      createSegaColor(7, 4, 0), // Sodium Vapor Amber
      createSegaColor(7, 6, 1), // High Voltage Yellow
      createSegaColor(7, 2, 2), // Neon Crimson
      createSegaColor(2, 2, 3), // Gunmetal Concrete
      createSegaColor(4, 4, 5), // Wet Pavement
      createSegaColor(6, 6, 7), // Rimlight Blue
      createSegaColor(7, 7, 7), // Flash White
      createSegaColor(1, 1, 1), // Dark Shadow
      createSegaColor(3, 1, 1), // Rust Red
      createSegaColor(0, 4, 2), // Toxic Emerald
    ],
  },
  {
    id: 'golden_axe_fantasy',
    name: 'Golden Axe (High Fantasy)',
    system: 'Genesis',
    colors: [
      createSegaColor(0, 0, 0),
      createSegaColor(2, 1, 0),
      createSegaColor(4, 2, 1),
      createSegaColor(6, 4, 2),
      createSegaColor(7, 6, 4),
      createSegaColor(5, 1, 0),
      createSegaColor(7, 2, 0),
      createSegaColor(7, 5, 0),
      createSegaColor(1, 2, 1),
      createSegaColor(2, 4, 2),
      createSegaColor(1, 2, 3),
      createSegaColor(3, 4, 5),
      createSegaColor(5, 5, 6),
      createSegaColor(7, 7, 7),
      createSegaColor(2, 2, 2),
      createSegaColor(4, 3, 2),
    ],
  },
  {
    id: 'shinobi_monochrome',
    name: 'Revenge of Shinobi (Graphite & Crimson)',
    system: 'Genesis',
    colors: [
      createSegaColor(0, 0, 0),
      createSegaColor(1, 1, 1),
      createSegaColor(2, 2, 2),
      createSegaColor(3, 3, 3),
      createSegaColor(4, 4, 4),
      createSegaColor(5, 5, 5),
      createSegaColor(6, 6, 6),
      createSegaColor(7, 7, 7),
      createSegaColor(3, 0, 0),
      createSegaColor(5, 0, 0),
      createSegaColor(7, 1, 1),
      createSegaColor(7, 3, 2),
      createSegaColor(0, 1, 2),
      createSegaColor(1, 3, 4),
      createSegaColor(3, 5, 6),
      createSegaColor(6, 7, 7),
    ],
  },
  {
    id: 'sega_master_system_arcade',
    name: 'Sega Master System (6-Bit Classic)',
    system: 'SMS',
    colors: [
      createSmsColor(0, 0, 0),
      createSmsColor(0, 0, 2),
      createSmsColor(0, 0, 3),
      createSmsColor(0, 2, 0),
      createSmsColor(0, 3, 0),
      createSmsColor(0, 2, 2),
      createSmsColor(0, 3, 3),
      createSmsColor(2, 0, 0),
      createSmsColor(3, 0, 0),
      createSmsColor(2, 0, 2),
      createSmsColor(3, 0, 3),
      createSmsColor(2, 2, 0),
      createSmsColor(3, 3, 0),
      createSmsColor(1, 1, 1),
      createSmsColor(2, 2, 2),
      createSmsColor(3, 3, 3),
    ],
  },
];

/**
 * Adaptive Color Quantization (K-Means) snapped to Sega 9-bit DAC
 */
export function generateAdaptiveSegaPalette(
  imageData: ImageData,
  colorCount: number = 16,
  isSms: boolean = false
): SegaColor[] {
  const data = imageData.data;
  const pixelCount = data.length / 4;
  const step = Math.max(1, Math.floor(pixelCount / 2000)); // Sample ~2000 pixels for fast real-time responsiveness

  const samples: [number, number, number][] = [];
  for (let i = 0; i < data.length; i += step * 4) {
    if (data[i + 3] > 64) {
      samples.push([data[i], data[i + 1], data[i + 2]]);
    }
  }

  if (samples.length === 0) {
    return SEGA_PALETTES[0].colors;
  }

  // Initialize centroids with diverse points (k-means++)
  const centroids: [number, number, number][] = [];
  centroids.push(samples[Math.floor(Math.random() * samples.length)]);

  while (centroids.length < colorCount) {
    let maxDist = -1;
    let bestSample = samples[0];

    for (let s = 0; s < Math.min(samples.length, 300); s++) {
      const sample = samples[s];
      let nearestDist = 999999;
      for (const c of centroids) {
        const d =
          (sample[0] - c[0]) ** 2 +
          (sample[1] - c[1]) ** 2 +
          (sample[2] - c[2]) ** 2;
        if (d < nearestDist) nearestDist = d;
      }
      if (nearestDist > maxDist) {
        maxDist = nearestDist;
        bestSample = sample;
      }
    }
    centroids.push(bestSample);
  }

  // 3 quick iterations of k-means
  for (let iter = 0; iter < 3; iter++) {
    const clusterSums: [number, number, number, number][] = centroids.map(() => [0, 0, 0, 0]);

    for (const [r, g, b] of samples) {
      let minDist = 999999;
      let bestCluster = 0;
      for (let c = 0; c < centroids.length; c++) {
        const d =
          (r - centroids[c][0]) ** 2 +
          (g - centroids[c][1]) ** 2 +
          (b - centroids[c][2]) ** 2;
        if (d < minDist) {
          minDist = d;
          bestCluster = c;
        }
      }
      clusterSums[bestCluster][0] += r;
      clusterSums[bestCluster][1] += g;
      clusterSums[bestCluster][2] += b;
      clusterSums[bestCluster][3] += 1;
    }

    for (let c = 0; c < centroids.length; c++) {
      const count = clusterSums[c][3];
      if (count > 0) {
        centroids[c] = [
          clusterSums[c][0] / count,
          clusterSums[c][1] / count,
          clusterSums[c][2] / count,
        ];
      }
    }
  }

  // Sort centroids by luminance so index 0 is dark (classic Sega background / transparent slot)
  centroids.sort((a, b) => {
    const lumA = 0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2];
    const lumB = 0.299 * b[0] + 0.587 * b[1] + 0.114 * b[2];
    return lumA - lumB;
  });

  // Snap to Sega hardware limits
  return centroids.map(([r, g, b]) => {
    if (isSms) {
      const r2 = Math.round((r / 255) * 3);
      const g2 = Math.round((g / 255) * 3);
      const b2 = Math.round((b / 255) * 3);
      return createSmsColor(r2, g2, b2);
    } else {
      const r3 = channel8To3(r);
      const g3 = channel8To3(g);
      const b3 = channel8To3(b);
      return createSegaColor(r3, g3, b3);
    }
  });
}
