import { useEvaluationStore } from '@/store/evaluationStore';
import { FileCode, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

export function TaskHeader() {
  const { 
    currentTaskId,
    currentModelId,
    experiment,
    taskEvaluations,
    tasks
  } = useEvaluationStore();

  const [showPrompt, setShowPrompt] = useState(false);

  const task = tasks.find(t => t.id === currentTaskId);

  // Берём имя модели из task_results (данные эксперимента), fallback на evaluation

  const currentTaskResult = experiment?.task_results.find(
    tr => tr.task_id === currentTaskId && tr.model_id === currentModelId
  );
  const currentTaskEvaluation = taskEvaluations.find(
    te => te.task_id === currentTaskId && te.model_id === currentModelId
  );
  const modelName = currentTaskEvaluation?.model_name 
    || currentTaskResult?.model_name 
    || currentModelId;

  if (!task) {
    return null;
  }

  return (
    <div className="px-4 py-3 bg-bg-secondary border-b border-border-default flex-shrink-0">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-accent-blue/10 rounded-lg">
            <FileCode className="w-5 h-5 text-accent-blue" />
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-text-primary">
                {task.id}: {task.title}
              </h1>
              <span className="px-2 py-0.5 bg-bg-tertiary text-text-muted text-xs rounded">
                Категория {task.category}
              </span>
            </div>
            
            {(currentTaskEvaluation || currentTaskResult) && (
              <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                <span>Модель:</span>
                <span className="text-accent-purple font-medium">
                  {modelName}
                </span>
              </div>
            )}
          </div>
        </div>

        {task.prompt && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowPrompt(!showPrompt)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors",
                showPrompt 
                  ? "bg-accent-blue/20 text-accent-blue" 
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
              )}
              title="Показать промпт"
            >
              <Info className="w-4 h-4" />
              <span>Промпт</span>
              {showPrompt 
                ? <ChevronUp className="w-3.5 h-3.5" /> 
                : <ChevronDown className="w-3.5 h-3.5" />
              }
            </button>
          </div>
        )}
      </div>

      {/* Expandable prompt */}
      {showPrompt && task.prompt && (
        <div className="mt-3 p-3 bg-bg-tertiary/50 border border-border-muted rounded-lg">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Промпт
          </div>
          <pre className="text-xs text-text-secondary bg-bg-primary p-3 rounded-md overflow-x-auto whitespace-pre-wrap font-mono">
            {task.prompt}
          </pre>
        </div>
      )}
    </div>
  );
}
