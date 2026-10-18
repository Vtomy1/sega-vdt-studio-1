/**
 * Procedural retro test images for instant testing without webcam
 */
export function generateTestPattern(
  width: number,
  height: number,
  type: 'synthwave' | 'color_bars' | 'portrait' | 'cyberpunk'
): ImageData {
  const imgData = new ImageData(width, height);
  const data = imgData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let r = 0, g = 0, b = 0;

      if (type === 'color_bars') {
        const barIndex = Math.floor((x / width) * 8);
        const yFrac = y / height;
        if (yFrac < 0.65) {
          // Standard SMPTE / Genesis test bars
          const colors = [
            [220, 220, 220], // White
            [220, 220, 0],   // Yellow
            [0, 220, 220],   // Cyan
            [0, 220, 0],     // Green
            [220, 0, 220],   // Magenta
            [220, 0, 0],     // Red
            [0, 0, 220],     // Blue
            [20, 20, 20],    // Black
          ];
          [r, g, b] = colors[barIndex];
        } else if (yFrac < 0.8) {
          // Inverted or gradient test
          const v = Math.floor((x / width) * 255);
          r = g = b = v;
        } else {
          // Checkerboard tile test
          const isCheck = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0;
          r = isCheck ? 180 : 40;
          g = isCheck ? 80 : 120;
          b = isCheck ? 220 : 160;
        }
      } else if (type === 'synthwave') {
        const ny = y / height;
        const nx = x / width;

        if (ny < 0.55) {
          // Sunset sky gradient: deep purple to electric orange
          const skyT = ny / 0.55;
          r = Math.floor(40 + skyT * 215);
          g = Math.floor(10 + skyT * 90);
          b = Math.floor(80 + (1 - skyT) * 100);

          // Giant retro sun
          const sunCx = width * 0.5;
          const sunCy = height * 0.45;
          const dist = Math.hypot(x - sunCx, y - sunCy);
          const sunRadius = width * 0.22;

          if (dist < sunRadius) {
            // Horizontal blind stripes in the sun
            const stripeY = Math.floor(y / 4) % 2 === 0 && y > sunCy;
            if (!stripeY) {
              const sunT = (y - (sunCy - sunRadius)) / (sunRadius * 2);
              r = 255;
              g = Math.floor(220 - sunT * 180);
              b = Math.floor(40);
            }
          }
        } else {
          // 3D Perspective Grid
          const groundT = (ny - 0.55) / 0.45;
          const perspectiveY = 1 / (groundT + 0.05);

          // Grid lines
          const gridLineH = Math.floor(perspectiveY * 4) % 12 === 0;
          const gridLineV =
            Math.floor(((nx - 0.5) * perspectiveY * 6) % 2) === 0 &&
            Math.abs(((nx - 0.5) * perspectiveY * 6) % 2) < 0.15;

          if (gridLineH || gridLineV) {
            r = 0;
            g = 255;
            b = 230; // Neon Cyan
          } else {
            // Deep magenta grid floor
            r = Math.floor(20 + groundT * 40);
            g = 5;
            b = Math.floor(40 + groundT * 60);
          }
        }
      } else if (type === 'cyberpunk') {
        // Neon city back alley with volumetric lighting
        const ny = y / height;
        const nx = x / width;
        const noise = (Math.sin(x * 0.1) * Math.cos(y * 0.1) + 1) * 0.5;

        r = Math.floor(15 + Math.sin(nx * 4) * 20 + (1 - ny) * 50);
        g = Math.floor(20 + noise * 60);
        b = Math.floor(40 + ny * 100);

        // Neon sign glow
        if (nx > 0.3 && nx < 0.7 && ny > 0.2 && ny < 0.5) {
          const d = Math.hypot(nx - 0.5, ny - 0.35);
          if (d < 0.15) {
            r = 255;
            g = 50;
            b = 150;
          }
        }
      } else {
        // Portrait silhouette with rim light
        const cx = width / 2;
        const cy = height * 0.45;
        const headDist = Math.hypot(x - cx, y - cy);
        const bodyDist = Math.hypot(x - cx, (y - height * 0.9) * 0.6);

        // Soft studio backdrop
        r = Math.floor(50 + (x / width) * 40);
        g = Math.floor(60 + (y / height) * 40);
        b = Math.floor(90 + (x / width) * 30);

        if (headDist < width * 0.2 || bodyDist < width * 0.35) {
          // Silhouette with rim lighting
          const rim = Math.abs(headDist - width * 0.2) < 4 || Math.abs(bodyDist - width * 0.35) < 4;
          if (rim && x > cx) {
            r = 240; g = 210; b = 150; // Warm rim
          } else {
            r = 30; g = 32; b = 40; // Figure shadow
          }
        }
      }

      data[idx] = Math.max(0, Math.min(255, r));
      data[idx + 1] = Math.max(0, Math.min(255, g));
      data[idx + 2] = Math.max(0, Math.min(255, b));
      data[idx + 3] = 255;
    }
  }

  return imgData;
}
