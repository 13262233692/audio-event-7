import { useState } from 'react';
import { useAppStore } from '@/store';
import { api } from '@/utils/api';
import { Trash2, Play, Clock, Tag, Edit2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnnotationListProps {
  onPlayRegion: (startTime: number, endTime: number) => void;
  onSelectAnnotation: (id: string) => void;
}

export function AnnotationList({ onPlayRegion, onSelectAnnotation }: AnnotationListProps) {
  const {
    annotations,
    selectedAnnotationId,
    getLabelColor,
    removeAnnotation,
    updateAnnotation,
    setError,
  } = useAppStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAnnotations = annotations.filter((a) =>
    a.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const startEditing = (id: string, currentLabel: string) => {
    setEditingId(id);
    setEditLabel(currentLabel);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditLabel('');
  };

  const saveEdit = async (id: string) => {
    if (!editLabel.trim()) return;

    try {
      const updated = await api.annotations.update(id, { label: editLabel.trim() });
      updateAnnotation(updated);
      setEditingId(null);
      setEditLabel('');
    } catch (err) {
      setError('Failed to update annotation');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.annotations.delete(id);
      removeAnnotation(id);
    } catch (err) {
      setError('Failed to delete annotation');
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-800/50 rounded-lg border border-slate-700">
      <div className="p-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
          <Tag className="w-4 h-4 text-amber-400" />
          标注列表 ({annotations.length})
        </h3>
        <input
          type="text"
          placeholder="搜索标签..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredAnnotations.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            {searchTerm ? '未找到匹配的标注' : '暂无标注\n在波形上拖拽选择区域开始'}
          </div>
        ) : (
          filteredAnnotations.map((annotation) => {
            const isSelected = annotation.id === selectedAnnotationId;
            const isEditing = editingId === annotation.id;
            const color = getLabelColor(annotation.label);

            return (
              <div
                key={annotation.id}
                className={cn(
                  'p-2 rounded-lg border transition-all duration-200 cursor-pointer',
                  isSelected
                    ? 'bg-slate-700/80 border-blue-500/50 shadow-lg shadow-blue-500/10'
                    : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 hover:border-slate-600'
                )}
                onClick={() => onSelectAnnotation(annotation.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm bg-slate-900 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(annotation.id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            saveEdit(annotation.id);
                          }}
                          className="p-1 text-green-400 hover:text-green-300 hover:bg-green-400/10 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEditing();
                          }}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium text-slate-200 truncate">
                          {annotation.label}
                        </span>
                        {annotation.confidence && (
                          <span className="text-xs text-slate-500">
                            {Math.round(annotation.confidence * 100)}%
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span className="font-mono">
                        {formatTime(annotation.startTime)} → {formatTime(annotation.endTime)}
                      </span>
                      <span className="text-slate-600">|</span>
                      <span>
                        {(annotation.endTime - annotation.startTime).toFixed(2)}s
                      </span>
                    </div>

                    <div className="mt-1">
                      {annotation.source === 'ai-suggested' ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-300">
                          AI 建议
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-600/50 text-slate-300">
                          手动
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayRegion(annotation.startTime, annotation.endTime);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                      title="播放"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(annotation.id, annotation.label);
                      }}
                      className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded transition-colors"
                      title="编辑"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(annotation.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
