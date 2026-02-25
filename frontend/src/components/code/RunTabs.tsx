import { clsx } from 'clsx';
import { useEvaluationStore } from '@/store/evaluationStore';
import { CheckCircle2, Circle, Hash } from 'lucide-react';
import { QualityBadge } from '@/components/ui/QualityBadge';

export function RunTabs() {
  const { 
    experiment,
    taskEvaluations,
    currentTaskId,
    currentModelId,
    currentRun,
    selectRun 
  } = useEvaluationStore();

  const currentTaskResult = experiment?.task_results.find(
    tr => tr.task_id === currentTaskId && tr.model_id === currentModelId
  );
  const currentTaskEvaluation = taskEvaluations.find(
    te => te.task_id === currentTaskId && te.model_id === currentModelId
  );

  const runs = currentTaskResult?.runs || [];
  const evaluations = currentTaskEvaluation?.runs || [];

  if (runs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-bg-secondary border-b border-border-muted flex-shrink-0">
      <span className="text-xs text-text-muted mr-2">Запуски:</span>
      
      {runs.map((_run, index) => {
        const evaluation = evaluations[index];
        const isEvaluated = evaluation?.scores !== null;
        const isSelected = currentRun === index;
        const q = evaluation?.scores?.Q;
        
        return (
          <button
            key={index}
            onClick={() => selectRun(index)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
              isSelected 
                ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30' 
                : 'hover:bg-bg-tertiary text-text-secondary border border-transparent'
            )}
          >
            {isEvaluated ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-text-muted" />
            )}
            
            <span>Run {index + 1}</span>
            
            {q != null && (
              <QualityBadge value={q} />
            )}
          </button>
        );
      })}

      {/* Determinism indicator */}
      {currentTaskResult?.determinism && (
        <div className="ml-auto flex items-center gap-2 text-xs text-text-muted">
          <Hash className="w-3.5 h-3.5" />
          <span>
            Детерминизм: {(currentTaskResult.determinism.match_rate * 100).toFixed(0)}%
          </span>
          <span className="text-text-secondary">
            ({currentTaskResult.determinism.unique_responses} уникальных)
          </span>
        </div>
      )}
    </div>
  );
}
