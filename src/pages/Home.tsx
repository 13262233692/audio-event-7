import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store';
import { api } from '@/utils/api';
import { Plus, Trash2, Music, Clock, Tags, Calendar, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  const { projects, setProjects, setCurrentProject, resetWorkspace, loading, setLoading, error, setError } = useAppStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    resetWorkspace();
    loadProjects();
  }, [resetWorkspace]);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.projects.getAll();
      setProjects(data);
    } catch (err) {
      setError('无法加载项目列表，请确保后端服务已启动');
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!projectName.trim() || !selectedFile) return;

    setIsCreating(true);
    setError(null);
    try {
      const project = await api.projects.create(projectName.trim(), selectedFile);
      setProjects([project, ...projects]);
      setShowCreateModal(false);
      setProjectName('');
      setSelectedFile(null);
    } catch (err) {
      setError('创建项目失败');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个项目吗？所有标注数据将无法恢复。')) return;

    try {
      await api.projects.delete(id);
      setProjects(projects.filter((p) => p.id !== id));
    } catch (err) {
      setError('删除项目失败');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.wav')) {
        setError('只支持 WAV 格式的音频文件');
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        setError('文件大小不能超过 100MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AudioAnnotator</h1>
              <p className="text-xs text-slate-400">音频事件标注工具</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            新建项目
          </button>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-800 flex items-center justify-center">
              <Music className="w-10 h-10 text-slate-600" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">还没有项目</h2>
            <p className="text-slate-400 mb-6">上传一个 WAV 音频文件开始您的第一个标注项目</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50"
            >
              <Plus className="w-5 h-5" />
              创建第一个项目
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">项目列表</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project: any) => (
                <Link
                  key={project.id}
                  to={`/project/${project.id}`}
                  onClick={() => setCurrentProject(project)}
                  className="group bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800 hover:border-slate-600 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/20">
                      <Music className="w-6 h-6 text-blue-400" />
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-sm text-slate-400 mb-4 truncate">{project.audio_file_name}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDuration(project.duration)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Tags className="w-3.5 h-3.5" />
                      {project.annotation_count || 0} 标注
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(project.created_at)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-4">创建新项目</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">项目名称</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="输入项目名称..."
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">上传 WAV 音频文件</label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors">
                  {selectedFile ? (
                    <div className="text-center">
                      <Music className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-300">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">点击或拖拽上传 WAV 文件</p>
                      <p className="text-xs text-slate-500 mt-1">最大 100MB</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept=".wav"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setProjectName('');
                  setSelectedFile(null);
                  setError(null);
                }}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!projectName.trim() || !selectedFile || isCreating}
                className={cn(
                  'flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg transition-all flex items-center justify-center gap-2',
                  (!projectName.trim() || !selectedFile || isCreating)
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/30'
                )}
              >
                {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                {isCreating ? '创建中...' : '创建项目'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
