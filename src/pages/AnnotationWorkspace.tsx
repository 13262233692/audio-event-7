import { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import type { Region } from 'wavesurfer.js/dist/plugins/regions.js';
import { useAppStore } from '@/store';
import { api } from '@/utils/api';
import { useYamnet } from '@/hooks/useYamnet';
import { AnnotationList } from '@/components/AnnotationList';
import { TagSuggestions } from '@/components/TagSuggestions';
import { PlaybackControls } from '@/components/PlaybackControls';
import { ArrowLeft, Save, Plus, Loader2, AlertCircle } from 'lucide-react';

export default function AnnotationWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<RegionsPlugin | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  const {
    currentProject,
    annotations,
    selectedRegion,
    selectedAnnotationId,
    zoom,
    volume,
    labels,
    getLabelColor,
    setCurrentProject,
    setAnnotations,
    setLabels,
    addAnnotation,
    setSelectedRegion,
    setSelectedAnnotationId,
    setIsPlaying,
    setCurrentTime,
    setVolume,
    setZoom,
    setError,
    loading,
    setLoading,
    error,
    resetWorkspace,
  } = useAppStore();

  const { loadModel, analyzeAudio } = useYamnet();
  const [manualLabel, setManualLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  useEffect(() => {
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    loadProjectData(id);
  }, [id]);

  const loadProjectData = async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [project, annotations, labels] = await Promise.all([
        api.projects.get(projectId),
        api.annotations.getByProject(projectId),
        api.labels.getAll(),
      ]);
      setCurrentProject(project);
      setAnnotations(annotations);
      setLabels(labels);
    } catch (err) {
      setError('无法加载项目数据');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id || !waveformContainerRef.current || !currentProject) return;

    const regions = RegionsPlugin.create();
    regionsPluginRef.current = regions;
    (window as any).regionsInstance = regions;

    const ws = WaveSurfer.create({
      container: waveformContainerRef.current,
      waveColor: '#60a5fa',
      progressColor: '#1e40af',
      cursorColor: '#f59e0b',
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 200,
      normalize: true,
      plugins: [regions],
    });

    wavesurferRef.current = ws;
    (window as any).wavesurferInstance = ws;

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('timeupdate', (time) => setCurrentTime(time));
    ws.on('seeking', (time) => setCurrentTime(time));

    ws.on('interaction', () => {
      clearSelection();
    });

    regions.on('region-created', (region: Region) => {
      region.drag = true;
      region.resize = true;
    });

    regions.on('region-updated', (region: Region) => {
      const startTime = region.start;
      const endTime = region.end || startTime + 0.1;
      setSelectedRegion({ startTime, endTime });
      setSelectedAnnotationId(null);
      analyzeRegionIfNeeded(startTime, endTime);
    });

    regions.on('region-clicked', (region: Region, e: MouseEvent) => {
      e.stopPropagation();
      const startTime = region.start;
      const endTime = region.end || startTime + 0.1;
      setSelectedRegion({ startTime, endTime });

      const annotation = annotations.find(
        (a) => Math.abs(a.startTime - region.start) < 0.01 && Math.abs(a.endTime - (region.end || 0)) < 0.01
      );
      if (annotation) {
        setSelectedAnnotationId(annotation.id);
      }
      analyzeRegionIfNeeded(startTime, endTime);
    });

    ws.on('ready', () => {
      loadAudioBuffer();
      renderAnnotationRegions();
    });

    const audioUrl = api.projects.getAudioUrl(id);
    ws.load(audioUrl);

    return () => {
      ws.destroy();
    };
  }, [id, currentProject?.id]);

  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.zoom(zoom * 50);
    }
  }, [zoom]);

  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(volume);
    }
  }, [volume]);

  useEffect(() => {
    if (regionsPluginRef.current && annotations.length > 0) {
      renderAnnotationRegions();
    }
  }, [annotations]);

  const loadAudioBuffer = async () => {
    if (!id) return;
    try {
      const audioUrl = api.projects.getAudioUrl(id);
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioBufferRef.current = await audioContext.decodeAudioData(arrayBuffer);
    } catch (err) {
      console.error('Failed to load audio buffer:', err);
    }
  };

  const renderAnnotationRegions = () => {
    if (!regionsPluginRef.current) return;

    const existingRegions = regionsPluginRef.current.getRegions();
    existingRegions.forEach((r) => r.remove());

    annotations.forEach((annotation) => {
      regionsPluginRef.current!.addRegion({
        start: annotation.startTime,
        end: annotation.endTime,
        color: `${getLabelColor(annotation.label)}40`,
        drag: true,
        resize: true,
      });
    });
  };

  const analyzedRegionsRef = useRef<Set<string>>(new Set());

  const analyzeRegionIfNeeded = useCallback(async (startTime: number, endTime: number) => {
    const regionKey = `${startTime.toFixed(3)}-${endTime.toFixed(3)}`;
    if (analyzedRegionsRef.current.has(regionKey)) return;
    analyzedRegionsRef.current.add(regionKey);

    if (!audioBufferRef.current) return;

    try {
      const duration = endTime - startTime;
      const midPoint = startTime + duration / 2;
      const analysisStart = Math.max(0, midPoint - 0.5);
      const analysisEnd = Math.min(audioBufferRef.current.duration, midPoint + 0.5);

      const suggestions = await analyzeAudio(audioBufferRef.current, analysisStart, analysisEnd);
      useAppStore.getState().setTagSuggestions(suggestions);
    } catch (err) {
      console.error('Analysis failed:', err);
    }
  }, [analyzeAudio]);

  const clearSelection = useCallback(() => {
    setSelectedRegion(null);
    setSelectedAnnotationId(null);
    useAppStore.getState().setTagSuggestions([]);
    analyzedRegionsRef.current.clear();

    if (regionsPluginRef.current) {
      const allRegions = regionsPluginRef.current.getRegions();
      allRegions.forEach((r) => {
        const isAnnotation = annotations.some(
          (a) => Math.abs(a.startTime - r.start) < 0.01 && Math.abs(a.endTime - (r.end || 0)) < 0.01
        );
        if (!isAnnotation) {
          r.remove();
        }
      });
    }
  }, [annotations, setSelectedAnnotationId, setSelectedRegion]);

  const handleApplySuggestion = useCallback(async (label: string, confidence: number) => {
    if (!selectedRegion || !id) return;

    setIsSaving(true);
    try {
      const annotation = await api.annotations.create(id, {
        startTime: selectedRegion.startTime,
        endTime: selectedRegion.endTime,
        label,
        confidence,
        source: 'ai-suggested',
      });
      addAnnotation(annotation);
      clearSelection();
    } catch (err) {
      setError('保存标注失败');
    } finally {
      setIsSaving(false);
    }
  }, [selectedRegion, id, addAnnotation, clearSelection, setError]);

  const handleSaveManualAnnotation = useCallback(async () => {
    if (!selectedRegion || !id || !manualLabel.trim()) return;

    setIsSaving(true);
    try {
      const annotation = await api.annotations.create(id, {
        startTime: selectedRegion.startTime,
        endTime: selectedRegion.endTime,
        label: manualLabel.trim(),
        source: 'manual',
      });
      addAnnotation(annotation);
      setManualLabel('');
      clearSelection();
    } catch (err) {
      setError('保存标注失败');
    } finally {
      setIsSaving(false);
    }
  }, [selectedRegion, id, manualLabel, addAnnotation, clearSelection, setError]);

  const handlePlayRegion = useCallback((startTime: number, endTime: number) => {
    if (wavesurferRef.current) {
      wavesurferRef.current.play(startTime, endTime);
    }
  }, []);

  const handleSelectAnnotation = useCallback((annotationId: string) => {
    const annotation = annotations.find((a) => a.id === annotationId);
    if (annotation && wavesurferRef.current) {
      setSelectedAnnotationId(annotationId);
      setSelectedRegion({ startTime: annotation.startTime, endTime: annotation.endTime });
      const duration = wavesurferRef.current.getDuration() || 1;
      wavesurferRef.current.seekTo(annotation.startTime / duration);
    }
  }, [annotations, setSelectedAnnotationId, setSelectedRegion]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">项目不存在或加载失败</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm flex-shrink-0">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                resetWorkspace();
                navigate('/');
              }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-white">{currentProject.name}</h1>
              <p className="text-xs text-slate-400">{currentProject.audioFileName}</p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">
              {annotations.length} 个标注
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
        <div className="flex-1 flex gap-4 min-h-0">
          <div className="w-72 flex-shrink-0">
            <AnnotationList
              onPlayRegion={handlePlayRegion}
              onSelectAnnotation={handleSelectAnnotation}
            />
          </div>

          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div
              ref={waveformContainerRef}
              className="w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700 flex-shrink-0"
              style={{ height: '200px' }}
            />

            <PlaybackControls projectId={id!} />

            {selectedRegion && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      手动输入标签
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualLabel}
                        onChange={(e) => setManualLabel(e.target.value)}
                        placeholder="输入标签名称..."
                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveManualAnnotation();
                          }
                        }}
                      />
                      <button
                        onClick={handleSaveManualAnnotation}
                        disabled={!manualLabel.trim() || isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-lg shadow-green-500/20"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        保存
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono bg-slate-900 px-3 py-2 rounded-lg">
                    <span>{selectedRegion.startTime.toFixed(2)}s</span>
                    <span className="text-slate-600">→</span>
                    <span>{selectedRegion.endTime.toFixed(2)}s</span>
                    <span className="text-slate-500 ml-2">
                      ({(selectedRegion.endTime - selectedRegion.startTime).toFixed(2)}s)
                    </span>
                  </div>
                </div>

                {labels.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-slate-500 mb-2">常用标签：</p>
                    <div className="flex flex-wrap gap-2">
                      {labels.map((label) => (
                        <button
                          key={label.id}
                          onClick={() => setManualLabel(label.name)}
                          className="px-3 py-1 text-xs rounded-full border transition-all hover:scale-105"
                          style={{
                            backgroundColor: `${label.color}20`,
                            borderColor: `${label.color}50`,
                            color: label.color,
                          }}
                        >
                          <Plus className="w-3 h-3 inline mr-1" />
                          {label.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-80 flex-shrink-0">
            <TagSuggestions onApplySuggestion={handleApplySuggestion} />
          </div>
        </div>
      </main>
    </div>
  );
}
