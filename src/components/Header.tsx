import React from 'react';
import { Download, Monitor, Cpu, FileCode, Layers } from 'lucide-react';

interface HeaderProps {
  activeTab: 'display' | 'vram' | 'header' | 'specs';
  setActiveTab: (tab: 'display' | 'vram' | 'header' | 'specs') => void;
  onQuickDownloadRom: () => void;
  onOpenExportModal: () => void;
  isStreaming: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenExportModal,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-neutral-900 border-b border-neutral-800 text-white">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="/"
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap hover:text-amber-400 transition-colors flex items-center gap-2"
        >
          <span className="font-mono text-amber-400 text-sm tracking-widest font-black">16-BIT</span>
          <span className="font-['Plus_Jakarta_Sans',sans-serif]">SEGA VDP STUDIO</span>
        </a>
      </div>

      {/* Zone 2: 4 concise single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-300">
        <button
          onClick={() => setActiveTab('display')}
          className={`flex items-center gap-2 hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
            activeTab === 'display' ? 'text-amber-400 font-semibold border-b-2 border-amber-400' : 'text-neutral-400'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>VDP Output</span>
        </button>
        <button
          onClick={() => setActiveTab('vram')}
          className={`flex items-center gap-2 hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
            activeTab === 'vram' ? 'text-amber-400 font-semibold border-b-2 border-amber-400' : 'text-neutral-400'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>PPU Tiles & VRAM</span>
        </button>
        <button
          onClick={() => setActiveTab('header')}
          className={`flex items-center gap-2 hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
            activeTab === 'header' ? 'text-amber-400 font-semibold border-b-2 border-amber-400' : 'text-neutral-400'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>ROM Header (0x100)</span>
        </button>
        <button
          onClick={() => setActiveTab('specs')}
          className={`flex items-center gap-2 hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 ${
            activeTab === 'specs' ? 'text-amber-400 font-semibold border-b-2 border-amber-400' : 'text-neutral-400'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Hardware Architecture</span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all rounded-md shadow-sm whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Sega ROM (.BIN)</span>
        </button>
      </div>
    </header>
  );
};
