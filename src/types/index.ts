export interface Project {
  id: string;
  name: string;
  audioFileName: string;
  duration: number;
  sampleRate: number;
  createdAt: string;
  updatedAt: string;
  annotationCount?: number;
}

export interface Annotation {
  id: string;
  projectId: string;
  startTime: number;
  endTime: number;
  label: string;
  confidence?: number;
  source: 'manual' | 'ai-suggested';
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  id: string;
  name: string;
  yamnetClasses?: string;
  color: string;
  createdAt: string;
}

export interface TagSuggestion {
  label: string;
  confidence: number;
  yamnetClass: string;
}

export interface SelectedRegion {
  startTime: number;
  endTime: number;
}

export interface ExportOptions {
  format: 'json' | 'csv';
  includeConfidence: boolean;
}
