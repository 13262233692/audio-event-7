import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import { api } from '@/utils/api';
import { useYamnet } from '@/hooks/useYamnet';
import { Brain, Sparkles, Loader2, Check, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagSuggestionsProps {
  onApplySuggestion: (label: string, confidence: number) => void;
}

export function TagSuggestions({ onApplySuggestion }: TagSuggestionsProps) {
  const {
    selectedRegion,
    tagSuggestions,
    isAnalyzing,
    currentProject,
    setTagSuggestions,
    setIsAnalyzing,
    setError,
  } = useAppStore();

  const { loadModel, analyzeAudio, isLoaded } = useYamnet();
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const analyzedRegionsRef = useRef<Set<string>>(new Set());

  const getAudioBuffer = useCallback(async () => {
    if (audioBufferRef.current) return audioBufferRef.current;
    if (!currentProject) return null;

    const audioUrl = api.projects.getAudioUrl(currentProject.id);
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioBufferRef.current = await audioContext.decodeAudioData(arrayBuffer);
    return audioBufferRef.current;
  }, [currentProject]);

  const analyzeRegion = useCallback(async () => {
    if (!selectedRegion || !currentProject) return;

    const regionKey = `${selectedRegion.startTime.toFixed(3)}-${selectedRegion.endTime.toFixed(3)}`;
    if (analyzedRegionsRef.current.has(regionKey)) return;

    setIsAnalyzing(true);
    setTagSuggestions([]);

    try {
      if (!isLoaded()) {
        await loadModel();
      }

      const audioBuffer = await getAudioBuffer();
      if (!audioBuffer) throw new Error('Failed to load audio');

      const duration = selectedRegion.endTime - selectedRegion.startTime;
      const midPoint = selectedRegion.startTime + duration / 2;
      const analysisStart = Math.max(0, midPoint - 0.5);
      const analysisEnd = Math.min(audioBuffer.duration, midPoint + 0.5);

      const suggestions = await analyzeAudio(audioBuffer, analysisStart, analysisEnd);
      setTagSuggestions(suggestions);
      analyzedRegionsRef.current.add(regionKey);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError('AI分析失败，请检查网络连接');
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedRegion, currentProject, loadModel, analyzeAudio, getAudioBuffer, isLoaded, setIsAnalyzing, setTagSuggestions, setError]);

  useEffect(() => {
    if (selectedRegion) {
      analyzeRegion();
    } else {
      setTagSuggestions([]);
      analyzedRegionsRef.current.clear();
    }
  }, [selectedRegion, analyzeRegion, setTagSuggestions]);

  if (!selectedRegion) {
    return (
      <div className="h-full flex flex-col bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="p-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            AI 标签建议
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-slate-500 text-sm">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>在波形上拖拽选择音频区域</p>
            <p>AI将自动分析并推荐标签</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-800/50 rounded-lg border border-slate-700">
      <div className="p-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          AI 标签建议
          {isAnalyzing && (
            <span className="ml-auto flex items-center gap-1 text-xs text-purple-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              分析中...
            </span>
          )}
        </h3>
        <div className="mt-2 text-xs text-slate-400 font-mono">
          选中区域: {selectedRegion.startTime.toFixed(2)}s → {selectedRegion.endTime.toFixed(2)}s
          <span className="text-slate-500 ml-2">
            ({(selectedRegion.endTime - selectedRegion.startTime).toFixed(2)}s)
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {isAnalyzing ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-10 bg-slate-700/50 rounded animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        ) : tagSuggestions.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>未识别出明显的音频事件</p>
            <p className="text-xs mt-1">请选择更长的音频片段或手动输入标签</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tagSuggestions.map((suggestion, index) => {
              const confidencePercent = Math.round(suggestion.confidence * 100);
              const barWidth = Math.min(100, confidencePercent * 1.5);

              return (
                <button
                  key={index}
                  onClick={() => onApplySuggestion(suggestion.label, suggestion.confidence)}
                  className={cn(
                    'w-full p-2.5 rounded-lg border transition-all duration-200',
                    'bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/60 hover:border-purple-500/50',
                    'group text-left'
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200 group-hover:text-purple-300 transition-colors">
                        {suggestion.label}
                      </span>
                      <Check className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-sm font-mono text-purple-400">
                      {confidencePercent}%
                    </span>
                  </div>

                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  <div className="mt-1 text-[10px] text-slate-500 truncate">
                    YAMNet: {suggestion.yamnetClass}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
