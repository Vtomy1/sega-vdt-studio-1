import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SegaConsole,
  DitherAlgorithm,
  PpuAnalysis,
  RomHeaderConfig,
  SegaColor,
} from './types/sega';
import {
  SEGA_PALETTES,
  generateAdaptiveSegaPalette,
} from './utils/segaPalette';
import { applySegaDither } from './utils/dither';
import {
  analyzePpuTiles,
  packTileToGenesis4bpp,
  createTileImageData,
  renderNametableToImageData,
} from './utils/vdpTiles';
import { generateGenesisRom, generateSgdkCHeader } from './utils/romGenerator';
import { generateTestPattern } from './utils/presets';
import { Header } from './components/Header';
import { CameraControls } from './components/CameraControls';
import { DitherControls } from './components/DitherControls';
import { PpuDisplay } from './components/PpuDisplay';
import { VramTileInspector } from './components/VramTileInspector';
import { RomHeaderEditor } from './components/RomHeaderEditor';
import { HardwareSpecsModal } from './components/HardwareSpecsModal';
import { ExportModal } from './components/ExportModal';
import { TileEditorModal } from './components/TileEditorModal';

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'display' | 'vram' | 'header' | 'specs'>('display');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Video / Camera State
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment'); // default to rear back cam as requested!
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Pre-processing
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(1.1);
  const [saturation, setSaturation] = useState<number>(1.2);
  const [isMirrored, setIsMirrored] = useState(false);

  // VDP & Dither Configuration
  const [consoleMode, setConsoleMode] = useState<SegaConsole>('genesis_h40');
  const [algorithm, setAlgorithm] = useState<DitherAlgorithm>('bayer4');
  const [ditherStrength, setDitherStrength] = useState<number>(1.0);
  const [paletteMode, setPaletteMode] = useState<'adaptive' | string>('adaptive');
  const [allowTileFlipping, setAllowTileFlipping] = useState<boolean>(true);

  // Custom user override colors for palette
  const [customPalette, setCustomPalette] = useState<SegaColor[] | null>(null);

  // Interactive Tile Selection & Modal
  const [highlightedTileId, setHighlightedTileId] = useState<number | null>(null);
  const [editingTileId, setEditingTileId] = useState<number | null>(null);

  // ROM Header Configuration
  const [romConfig, setRomConfig] = useState<RomHeaderConfig>({
    consoleName: 'SEGA MEGA DRIVE ',
    copyright: '(C)SEGA 2026.OCT',
    domesticTitle: 'SEGA VDP WEBCAM CAPTURE',
    overseasTitle: 'SEGA VDP WEBCAM CAPTURE',
    serial: 'GM 00000000-00',
    region: 'JUE             ',
    author: 'Sega VDP Studio',
    checksum: 0,
    romSize: 65536,
  });

  // Processed Output Buffers
  const [outputImageData, setOutputImageData] = useState<ImageData | null>(null);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [analysis, setAnalysis] = useState<PpuAnalysis | null>(null);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const processingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const staticImageRef = useRef<ImageData | null>(null);

  // Calculate resolution based on Sega console mode
  const targetResolution = useCallback(() => {
    switch (consoleMode) {
      case 'genesis_h40':
        return { width: 320, height: 224, isSms: false };
      case 'genesis_h32':
        return { width: 256, height: 224, isSms: false };
      case 'master_system':
        return { width: 256, height: 192, isSms: true };
    }
  }, [consoleMode]);

  // Enumerate camera devices
  const updateDeviceList = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
      }
    } catch (e) {
      console.warn('Could not enumerate media devices:', e);
    }
  }, []);

  // Initialize or reconfigure camera stream
  const startCamera = useCallback(
    async (targetFacing: 'environment' | 'user', deviceId?: string) => {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      setCameraError(null);

      try {
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : {
                facingMode: { ideal: targetFacing },
                width: { ideal: 640 },
                height: { ideal: 480 },
              },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.playsInline = true;
          await videoRef.current.play();
        }

        setIsStreaming(true);
        setIsPaused(false);
        staticImageRef.current = null;
        updateDeviceList();
      } catch (err: unknown) {
        console.warn('Camera access failed, falling back to offline test pattern:', err);
        setCameraError(err instanceof Error ? err.message : 'Camera unavailable');
        setIsStreaming(false);

        // Load synthetic retro test card so the app is immediately working and gorgeous!
        const res = targetResolution();
        const testImg = generateTestPattern(res.width, res.height, 'synthwave');
        staticImageRef.current = testImg;
      }
    },
    [targetResolution, updateDeviceList]
  );

  // Initial mount: load camera or fallback
  useEffect(() => {
    startCamera(facingMode, selectedDeviceId);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  // Pre-process canvas frame: brightness, contrast, saturation, mirror
  const preprocessImage = useCallback(
    (sourceImg: ImageData): ImageData => {
      const { width, height } = sourceImg;
      const src = sourceImg.data;
      const dest = new ImageData(width, height);
      const out = dest.data;

      const br = brightness;
      const ct = contrast;
      const sat = saturation;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcX = isMirrored ? width - 1 - x : x;
          const srcIdx = (y * width + srcX) * 4;
          const outIdx = (y * width + x) * 4;

          let r = src[srcIdx];
          let g = src[srcIdx + 1];
          let b = src[srcIdx + 2];

          // 1. Exposure / Brightness
          r += br;
          g += br;
          b += br;

          // 2. Contrast
          r = (r - 128) * ct + 128;
          g = (g - 128) * ct + 128;
          b = (b - 128) * ct + 128;

          // 3. Saturation
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = gray + (r - gray) * sat;
          g = gray + (g - gray) * sat;
          b = gray + (b - gray) * sat;

          out[outIdx] = Math.max(0, Math.min(255, Math.round(r)));
          out[outIdx + 1] = Math.max(0, Math.min(255, Math.round(g)));
          out[outIdx + 2] = Math.max(0, Math.min(255, Math.round(b)));
          out[outIdx + 3] = 255;
        }
      }

      return dest;
    },
    [brightness, contrast, saturation, isMirrored]
  );

  // Core Processing Function
  const processFrame = useCallback(() => {
    const res = targetResolution();
    let currentSourceImage: ImageData | null = null;

    if (staticImageRef.current) {
      // Use frozen or uploaded or preset image
      if (
        staticImageRef.current.width !== res.width ||
        staticImageRef.current.height !== res.height
      ) {
        // Resize static image to match current Sega mode
        const offCanvas = document.createElement('canvas');
        offCanvas.width = staticImageRef.current.width;
        offCanvas.height = staticImageRef.current.height;
        const offCtx = offCanvas.getContext('2d')!;
        offCtx.putImageData(staticImageRef.current, 0, 0);

        const targetCanvas = document.createElement('canvas');
        targetCanvas.width = res.width;
        targetCanvas.height = res.height;
        const targetCtx = targetCanvas.getContext('2d')!;
        targetCtx.drawImage(offCanvas, 0, 0, res.width, res.height);
        currentSourceImage = targetCtx.getImageData(0, 0, res.width, res.height);
        staticImageRef.current = currentSourceImage;
      } else {
        currentSourceImage = staticImageRef.current;
      }
    } else if (videoRef.current && isStreaming && !isPaused) {
      const video = videoRef.current;
      if (video.readyState >= 2 && video.videoWidth > 0) {
        if (!processingCanvasRef.current) {
          processingCanvasRef.current = document.createElement('canvas');
        }
        const canvas = processingCanvasRef.current;
        canvas.width = res.width;
        canvas.height = res.height;
        const ctx = canvas.getContext('2d')!;

        // Aspect fit / crop video frame into Sega resolution
        const vRatio = video.videoWidth / video.videoHeight;
        const tRatio = res.width / res.height;
        let sx = 0,
          sy = 0,
          sw = video.videoWidth,
          sh = video.videoHeight;

        if (vRatio > tRatio) {
          sw = video.videoHeight * tRatio;
          sx = (video.videoWidth - sw) / 2;
        } else {
          sh = video.videoWidth / tRatio;
          sy = (video.videoHeight - sh) / 2;
        }

        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, res.width, res.height);
        currentSourceImage = ctx.getImageData(0, 0, res.width, res.height);
      }
    }

    if (!currentSourceImage) return;

    // Apply analog pre-processing adjustments
    const preprocessed = preprocessImage(currentSourceImage);
    setOriginalImageData(preprocessed);

    // Determine 16-color Sega palette
    let activePalette: SegaColor[];
    if (customPalette) {
      activePalette = customPalette;
    } else if (paletteMode === 'adaptive') {
      activePalette = generateAdaptiveSegaPalette(preprocessed, 16, res.isSms);
    } else {
      const found = SEGA_PALETTES.find((p) => p.id === paletteMode);
      activePalette = found ? found.colors : SEGA_PALETTES[0].colors;
    }

    // Apply Dithering & Color Quantization
    const { indices, outputImage } = applySegaDither(
      preprocessed,
      activePalette,
      algorithm,
      ditherStrength
    );
    setOutputImageData(outputImage);

    // Decompose into 8x8 Sega VDP tiles & Nametable analysis
    const tileAnalysis = analyzePpuTiles(
      indices,
      res.width,
      res.height,
      activePalette,
      allowTileFlipping
    );
    setAnalysis(tileAnalysis);
  }, [
    targetResolution,
    isStreaming,
    isPaused,
    preprocessImage,
    customPalette,
    paletteMode,
    algorithm,
    ditherStrength,
    allowTileFlipping,
  ]);

  // Main Animation / Video Stream Loop
  useEffect(() => {
    let active = true;

    const renderLoop = () => {
      if (!active) return;
      processFrame();

      // If streaming live, schedule next animation frame
      if (isStreaming && !isPaused) {
        animFrameIdRef.current = requestAnimationFrame(renderLoop);
      }
    };

    renderLoop();

    return () => {
      active = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isStreaming, isPaused, processFrame]);

  // Handle Switch Camera (Toggle Rear Back Cam / Front User Cam)
  const handleSwitchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    setSelectedDeviceId('');
    startCamera(nextMode);
  };

  // Handle Specific Camera Device Selection
  const handleSelectDevice = (devId: string) => {
    setSelectedDeviceId(devId);
    startCamera(facingMode, devId);
  };

  // Handle Snapshot / Freeze
  const handleCaptureSnapshot = () => {
    if (originalImageData) {
      staticImageRef.current = originalImageData;
      setIsPaused(true);
    }
  };

  const handleTogglePlayPause = () => {
    if (isPaused) {
      staticImageRef.current = null;
      setIsPaused(false);
    } else {
      if (originalImageData) {
        staticImageRef.current = originalImageData;
      }
      setIsPaused(true);
    }
  };

  // Handle File Upload
  const handleUploadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const res = targetResolution();
        const canvas = document.createElement('canvas');
        canvas.width = res.width;
        canvas.height = res.height;
        const ctx = canvas.getContext('2d')!;

        // Fill background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, res.width, res.height);

        // Aspect fit
        const rRatio = img.width / img.height;
        const tRatio = res.width / res.height;
        let dw = res.width,
          dh = res.height,
          dx = 0,
          dy = 0;

        if (rRatio > tRatio) {
          dh = res.width / rRatio;
          dy = (res.height - dh) / 2;
        } else {
          dw = res.height * rRatio;
          dx = (res.width - dw) / 2;
        }

        ctx.drawImage(img, dx, dy, dw, dh);
        const data = ctx.getImageData(0, 0, res.width, res.height);
        staticImageRef.current = data;
        setIsPaused(true);
        processFrame();
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Load Test Preset Pattern
  const handleLoadPreset = (type: 'synthwave' | 'color_bars' | 'portrait' | 'cyberpunk') => {
    const res = targetResolution();
    const testImg = generateTestPattern(res.width, res.height, type);
    staticImageRef.current = testImg;
    setIsPaused(true);
    processFrame();
  };

  // Update specific palette color from CRAM inspector
  const handleUpdatePaletteColor = (index: number, newCol: SegaColor) => {
    if (!analysis) return;
    const updated = [...analysis.palette];
    updated[index] = newCol;
    setCustomPalette(updated);
  };

  // Open Tile Editor modal (freezes stream so live webcam doesn't wipe edits)
  const handleOpenTileEditor = (tileId: number) => {
    if (originalImageData && !isPaused) {
      staticImageRef.current = originalImageData;
      setIsPaused(true);
    }
    setEditingTileId(tileId);
    setHighlightedTileId(tileId);
  };

  // Save edited tile
  const handleSaveTile = (
    tileId: number,
    updatedBlock: Uint8Array,
    asNewTile: boolean = false
  ) => {
    if (!analysis) return;

    // Ensure stream is paused to retain manual bitmask modifications
    setIsPaused(true);

    const updatedBlocks = [...analysis.uniqueTileBlocks];
    const updatedPatterns = [...analysis.uniqueTilePatterns];
    const updatedImages = [...analysis.uniqueTileImages];
    let targetTileId = tileId;

    if (asNewTile) {
      targetTileId = updatedBlocks.length;
      updatedBlocks.push(new Uint8Array(updatedBlock));
      updatedPatterns.push(packTileToGenesis4bpp(updatedBlock));
      updatedImages.push(createTileImageData(updatedBlock, analysis.palette));
    } else {
      updatedBlocks[tileId] = new Uint8Array(updatedBlock);
      updatedPatterns[tileId] = packTileToGenesis4bpp(updatedBlock);
      updatedImages[tileId] = createTileImageData(updatedBlock, analysis.palette);
    }

    // Re-render entire screen ImageData with the updated tile data
    const updatedScreenImage = renderNametableToImageData(analysis, updatedBlocks);
    setOutputImageData(updatedScreenImage);
    staticImageRef.current = updatedScreenImage;

    // Update VRAM analysis structure
    const updatedAnalysis: PpuAnalysis = {
      ...analysis,
      uniqueTilesCount: updatedBlocks.length,
      uniqueTileBlocks: updatedBlocks,
      uniqueTilePatterns: updatedPatterns,
      uniqueTileImages: updatedImages,
      vramBytes: updatedBlocks.length * 32,
      compressionRatio:
        analysis.totalTiles > 0
          ? ((analysis.totalTiles - updatedBlocks.length) / analysis.totalTiles) * 100
          : 0,
    };

    setAnalysis(updatedAnalysis);
    setHighlightedTileId(targetTileId);
  };

  // Quick download Genesis ROM (.bin)
  const handleQuickDownloadRom = () => {
    if (!analysis) return;
    const rom = generateGenesisRom(analysis, romConfig);
    const blob = new Blob([rom.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${romConfig.domesticTitle.trim().replace(/\s+/g, '_') || 'sega_vdp_capture'}.bin`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Quick download SGDK C Header (.h)
  const handleQuickDownloadCHeader = () => {
    if (!analysis) return;
    const code = generateSgdkCHeader(analysis, 'webcam_capture');
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sega_vdp_tiles.h';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Hidden off-screen video element */}
      <video ref={videoRef} className="hidden" muted playsInline />

      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onQuickDownloadRom={handleQuickDownloadRom}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        isStreaming={isStreaming && !isPaused}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Main Tab 1: VDP Output & Live Dithering Viewport */}
        {activeTab === 'display' && (
          <div className="space-y-6">
            {/* Primary Display */}
            <PpuDisplay
              analysis={analysis}
              outputImageData={outputImageData}
              originalImageData={originalImageData}
              highlightedTileId={highlightedTileId}
              onSelectTile={setHighlightedTileId}
              onOpenTileEditor={handleOpenTileEditor}
            />

            {/* Dither & VDP Controls */}
            <DitherControls
              consoleMode={consoleMode}
              algorithm={algorithm}
              ditherStrength={ditherStrength}
              paletteMode={paletteMode}
              allowTileFlipping={allowTileFlipping}
              onConsoleModeChange={(m) => {
                setConsoleMode(m);
                setCustomPalette(null);
              }}
              onAlgorithmChange={setAlgorithm}
              onDitherStrengthChange={setDitherStrength}
              onPaletteModeChange={(p) => {
                setPaletteMode(p);
                setCustomPalette(null);
              }}
              onAllowTileFlippingChange={setAllowTileFlipping}
            />

            {/* Camera & Sensor Calibration Controls */}
            <CameraControls
              isStreaming={isStreaming}
              isPaused={isPaused}
              facingMode={facingMode}
              availableDevices={availableDevices}
              selectedDeviceId={selectedDeviceId}
              brightness={brightness}
              contrast={contrast}
              saturation={saturation}
              isMirrored={isMirrored}
              onTogglePlayPause={handleTogglePlayPause}
              onSwitchCamera={handleSwitchCamera}
              onSelectDevice={handleSelectDevice}
              onUploadImage={handleUploadImage}
              onLoadPreset={handleLoadPreset}
              onBrightnessChange={setBrightness}
              onContrastChange={setContrast}
              onSaturationChange={setSaturation}
              onMirrorToggle={() => setIsMirrored(!isMirrored)}
              onCaptureSnapshot={handleCaptureSnapshot}
              cameraError={cameraError}
            />
          </div>
        )}

        {/* Main Tab 2: VRAM Pattern Table & PPU Tile Inspector */}
        {activeTab === 'vram' && (
          <div className="space-y-6">
            <VramTileInspector
              analysis={analysis}
              highlightedTileId={highlightedTileId}
              onSelectTile={setHighlightedTileId}
              onUpdatePaletteColor={handleUpdatePaletteColor}
              onOpenTileEditor={handleOpenTileEditor}
            />

            {/* Small live screen preview in VRAM tab for cross-referencing */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-neutral-400 mb-3">Live Plane Nametable Cross-Reference</h3>
              <PpuDisplay
                analysis={analysis}
                outputImageData={outputImageData}
                originalImageData={originalImageData}
                highlightedTileId={highlightedTileId}
                onSelectTile={setHighlightedTileId}
                onOpenTileEditor={handleOpenTileEditor}
              />
            </div>
          </div>
        )}

        {/* Main Tab 3: ROM Header (0x100 - 0x200) */}
        {activeTab === 'header' && (
          <RomHeaderEditor
            analysis={analysis}
            config={romConfig}
            onConfigChange={(cfg) => setRomConfig((prev) => ({ ...prev, ...cfg }))}
            onDownloadRom={handleQuickDownloadRom}
            onDownloadCHeader={handleQuickDownloadCHeader}
          />
        )}

        {/* Main Tab 4: Hardware Architecture Specifications */}
        {activeTab === 'specs' && <HardwareSpecsModal />}
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        analysis={analysis}
        config={romConfig}
      />

      {/* 8x8 VRAM Tile Editor Modal */}
      {editingTileId !== null && analysis && (
        <TileEditorModal
          isOpen={editingTileId !== null}
          onClose={() => setEditingTileId(null)}
          tileId={editingTileId}
          initialBlock={
            analysis.uniqueTileBlocks[editingTileId] || new Uint8Array(64)
          }
          palette={analysis.palette}
          usageCount={
            analysis.nametable.filter((c) => c.tileId === editingTileId).length
          }
          onSaveTile={handleSaveTile}
        />
      )}
    </div>
  );
}
