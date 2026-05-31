import { useCallback, useRef } from 'react';
import { useAppStore } from '@/store';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  Download,
  RotateCcw,
} from 'lucide-react';
import { api } from '@/utils/api';
import { cn } from '@/lib/utils';

interface PlaybackControlsProps {
  projectId: string;
}

export function PlaybackControls({ projectId }: PlaybackControlsProps) {
  const {
    isPlaying,
    currentTime,
    volume,
    zoom,
    currentProject,
    selectedRegion,
    setVolume,
    setZoom,
    setSelectedRegion,
    setSelectedAnnotationId,
  } = useAppStore();

  const wavesurferRef = useRef<any>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const togglePlay = useCallback(() => {
    const ws = (window as any).wavesurferInstance;
    if (ws) {
      if (selectedRegion) {
        ws.play(selectedRegion.startTime, selectedRegion.endTime);
      } else {
        ws.playPause();
      }
    }
  }, [selectedRegion]);

  const skipBackward = useCallback(() => {
    const ws = (window as any).wavesurferInstance;
    if (ws) {
      const duration = ws.getDuration() || 1;
      ws.seekTo(Math.max(0, (currentTime - 5) / duration));
    }
  }, [currentTime]);

  const skipForward = useCallback(() => {
    const ws = (window as any).wavesurferInstance;
    if (ws) {
      const duration = ws.getDuration() || 1;
      ws.seekTo(Math.min(1, (currentTime + 5) / duration));
    }
  }, [currentTime]);

  const toggleMute = useCallback(() => {
    setVolume(volume > 0 ? 0 : 0.8);
  }, [volume, setVolume]);

  const zoomIn = useCallback(() => {
    setZoom(Math.min(10, zoom + 0.5));
  }, [zoom, setZoom]);

  const zoomOut = useCallback(() => {
    setZoom(Math.max(0.5, zoom - 0.5));
  }, [zoom, setZoom]);

  const resetZoom = useCallback(() => {
    setZoom(1);
  }, [setZoom]);

  const clearSelection = useCallback(() => {
    setSelectedRegion(null);
    setSelectedAnnotationId(null);
    const regions = (window as any).regionsInstance;
    if (regions) {
      const allRegions = regions.getRegions();
      allRegions.forEach((r: any) => {
        r.remove();
      });
    }
  }, [setSelectedAnnotationId, setSelectedRegion]);

  const handleExport = (format: 'json' | 'csv') => {
    api.export.download(projectId, format, true);
  };

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-lg p-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={skipBackward}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
            title="后退5秒"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={togglePlay}
            className={cn(
              'p-3 rounded-xl transition-all duration-200',
              'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400',
              'text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50',
              'active:scale-95'
            )}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          <button
            onClick={skipForward}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
            title="前进5秒"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <div className="w-px h-8 bg-slate-700 mx-2" />

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
              title={volume > 0 ? '静音' : '取消静音'}
            >
              {volume > 0 ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div className="w-px h-8 bg-slate-700 mx-2" />

          <div className="flex items-center gap-1">
            <button
              onClick={zoomOut}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
              title="缩小"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-xs text-slate-400 w-12 text-center font-mono">
              {zoom.toFixed(1)}x
            </span>
            <button
              onClick={zoomIn}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
              title="放大"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={resetZoom}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
              title="重置缩放"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-8 bg-slate-700 mx-2" />

          <button
            onClick={clearSelection}
            className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            清除选择
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm font-mono text-slate-300">
            <span className="text-amber-400">{formatTime(currentTime)}</span>
            <span className="text-slate-500 mx-1">/</span>
            <span className="text-slate-400">
              {currentProject ? formatTime(currentProject.duration) : '--:--.---'}
            </span>
          </div>

          <div className="w-px h-8 bg-slate-700" />

          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-lg transition-all shadow-lg shadow-amber-500/20">
              <Download className="w-4 h-4" />
              导出
            </button>

            <div className="absolute right-0 top-full mt-2 p-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[120px]">
              <button
                onClick={() => handleExport('json')}
                className="w-full px-3 py-2 text-sm text-left text-slate-300 hover:bg-slate-700 rounded-md transition-colors"
              >
                导出 JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-3 py-2 text-sm text-left text-slate-300 hover:bg-slate-700 rounded-md transition-colors"
              >
                导出 CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
