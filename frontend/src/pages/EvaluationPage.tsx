import { useEvaluationStore } from '@/store/evaluationStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { MainPanel } from '@/components/layout/MainPanel';
import { useEffect } from 'react';
import { FileSearch, Loader2, AlertCircle } from 'lucide-react';

export function EvaluationPage() {
  const {
    loadExperiment,
    loadExperiments,
    experiment,
    experiments,
    isLoading,
    error,
  } = useEvaluationStore();

  useEffect(() => {
    loadExperiments();
  }, [loadExperiments]);

  // автоматически загрузить первый эксперимент
  useEffect(() => {
    if (!experiment && experiments.length > 0 && !isLoading) {
      loadExperiment(experiments[0].id);
    }
  }, [experiment, experiments, isLoading, loadExperiment]);

  // Состояние загрузки
  if (isLoading && !experiment) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted">
        <Loader2 className="w-8 h-8 animate-spin text-accent-blue" />
        <span>Загрузка эксперимента…</span>
      </div>
    );
  }

  // Ошибка
  if (error && !experiment) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <AlertCircle className="w-8 h-8 text-accent-red" />
        <span className="text-text-primary font-medium">Ошибка загрузки</span>
        <span className="text-sm text-text-muted max-w-md text-center">{error}</span>
        <button
          onClick={() => loadExperiments()}
          className="mt-2 px-4 py-2 text-sm bg-accent-blue/20 text-accent-blue rounded-md hover:bg-accent-blue/30"
        >
          Повторить
        </button>
      </div>
    );
  }

  // Нет экспериментов
  if (!experiment && experiments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted">
        <FileSearch className="w-8 h-8" />
        <span className="text-text-primary font-medium">Нет экспериментов</span>
        <span className="text-sm">Запустите бенчмарк, чтобы создать эксперимент</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Content - reuse existing components */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <Sidebar />
        <div className="flex-1 min-w-0 h-full overflow-hidden">
          <MainPanel />
        </div>
      </div>
    </div>
  );
}
