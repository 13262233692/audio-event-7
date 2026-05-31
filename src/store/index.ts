import { create } from 'zustand';
import type { Project, Annotation, Label, SelectedRegion, TagSuggestion } from '@/types';

interface AppState {
  projects: Project[];
  currentProject: Project | null;
  annotations: Annotation[];
  labels: Label[];
  selectedRegion: SelectedRegion | null;
  selectedAnnotationId: string | null;
  tagSuggestions: TagSuggestion[];
  isAnalyzing: boolean;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  zoom: number;
  loading: boolean;
  error: string | null;

  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (annotation: Annotation) => void;
  removeAnnotation: (id: string) => void;
  setLabels: (labels: Label[]) => void;
  setSelectedRegion: (region: SelectedRegion | null) => void;
  setSelectedAnnotationId: (id: string | null) => void;
  setTagSuggestions: (suggestions: TagSuggestion[]) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setVolume: (volume: number) => void;
  setZoom: (zoom: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetWorkspace: () => void;
  getLabelColor: (labelName: string) => string;
}

const LABEL_COLORS: Record<string, string> = {
  '狗叫': '#ef4444',
  '汽车鸣笛': '#f59e0b',
  '雨声': '#3b82f6',
  '鸟鸣': '#10b981',
  '人声': '#8b5cf6',
  '背景音乐': '#ec4899',
  '脚步声': '#06b6d4',
  '敲门声': '#84cc16',
  '警报声': '#dc2626',
  '笑声': '#f472b6',
};

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  currentProject: null,
  annotations: [],
  labels: [],
  selectedRegion: null,
  selectedAnnotationId: null,
  tagSuggestions: [],
  isAnalyzing: false,
  isPlaying: false,
  currentTime: 0,
  volume: 0.8,
  zoom: 1,
  loading: false,
  error: null,

  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setAnnotations: (annotations) => set({ annotations }),
  addAnnotation: (annotation) =>
    set((state) => ({
      annotations: [...state.annotations, annotation].sort((a, b) => a.startTime - b.startTime),
    })),
  updateAnnotation: (annotation) =>
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === annotation.id ? annotation : a
      ),
    })),
  removeAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
      selectedAnnotationId: state.selectedAnnotationId === id ? null : state.selectedAnnotationId,
    })),
  setLabels: (labels) => set({ labels }),
  setSelectedRegion: (region) => set({ selectedRegion: region, tagSuggestions: [] }),
  setSelectedAnnotationId: (id) => set({ selectedAnnotationId: id }),
  setTagSuggestions: (suggestions) => set({ tagSuggestions: suggestions }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setVolume: (volume) => set({ volume }),
  setZoom: (zoom) => set({ zoom }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  resetWorkspace: () =>
    set({
      currentProject: null,
      annotations: [],
      selectedRegion: null,
      selectedAnnotationId: null,
      tagSuggestions: [],
      isAnalyzing: false,
      isPlaying: false,
      currentTime: 0,
      zoom: 1,
    }),
  getLabelColor: (labelName) => {
    const state = get();
    const label = state.labels.find((l) => l.name === labelName);
    return label?.color || LABEL_COLORS[labelName] || '#64748b';
  },
}));
