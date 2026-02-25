import { 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  Clock,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { useEvaluationStore } from '@/store/evaluationStore';
import type { EvaluationStatus } from '@/types';
import { clsx } from 'clsx';
import { useState } from 'react';
import { QualityBadge } from '@/components/ui/QualityBadge';

// Получение иконки статуса
function StatusIcon({ status }: { status: EvaluationStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-accent-green" />;
    case 'in_progress':
      return <Clock className="w-4 h-4 text-accent-yellow" />;
    case 'skipped':
      return <AlertCircle className="w-4 h-4 text-text-muted" />;
    default:
      return <Circle className="w-4 h-4 text-text-muted" />;
  }
}

// Задание в списке
interface TaskItemProps {
  taskId: string;
  taskTitle: string;
  modelName: string;
  status: EvaluationStatus;
  averageQ: number | null;
  isSelected: boolean;
  onClick: () => void;
}

function TaskItem({ 
  taskId: _taskId, 
  taskTitle: _taskTitle, 
  modelName, 
  status, 
  averageQ, 
  isSelected, 
  onClick 
}: TaskItemProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full px-3 py-2 text-left transition-colors rounded-md',
        'hover:bg-bg-tertiary group',
        isSelected && 'bg-bg-tertiary border-l-2 border-accent-blue'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon status={status} />
          <div className="text-sm font-medium text-text-primary truncate">
            {modelName}
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {averageQ !== null && (
            <QualityBadge value={averageQ} prefix="Q=" className="px-1.5 py-0.5" />
          )}
          <ChevronRight className={clsx(
            'w-4 h-4 text-text-muted transition-transform',
            'group-hover:translate-x-0.5',
            isSelected && 'text-accent-blue'
          )} />
        </div>
      </div>
    </button>
  );
}

export function Sidebar() {
  const { 
    taskEvaluations, 
    currentTaskId, 
    currentModelId,
    selectTask,
    experiment,
    experiments,
    loadExperiment,
    evaluationProgress,
  } = useEvaluationStore();

  const [expDropdownOpen, setExpDropdownOpen] = useState(false);

  // Используем task_results из эксперимента как основу для списка задач,
  // а taskEvaluations — только для статуса оценки
  const taskResults = experiment?.task_results || [];

  // Группируем по заданиям
  const taskGroups = taskResults.reduce((acc, tr) => {
    if (!acc[tr.task_id]) {
      acc[tr.task_id] = [];
    }
    acc[tr.task_id].push(tr);
    return acc;
  }, {} as Record<string, typeof taskResults>);

  // Подсчёт статистики: задание считаем оценённым, если для него есть evaluation со всеми scores
  const totalTasks = taskResults.length;
  const completedTasks = taskResults.filter(tr => {
    const te = taskEvaluations.find(
      e => e.task_id === tr.task_id && e.model_id === tr.model_id
    );
    return te && te.runs.every(r => r.scores !== null);
  }).length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <aside className="w-sidebar flex-shrink-0 bg-bg-secondary border-r border-border-default flex flex-col h-full overflow-hidden">
      {/* Experiment selector */}
      <div className="p-3 border-b border-border-muted flex-shrink-0">
        <div className="relative">
          <button
            onClick={() => setExpDropdownOpen(!expDropdownOpen)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-bg-tertiary border border-border-default rounded-md hover:bg-bg-overlay transition-colors"
          >
            <div className="min-w-0">
              <div className="text-[10px] text-text-muted uppercase tracking-wider">Эксперимент</div>
              <div className="font-mono text-text-primary text-xs truncate">
                {experiment?.experiment_id ?? '—'}
              </div>
            </div>
            <ChevronDown className={clsx(
              'w-3.5 h-3.5 text-text-muted flex-shrink-0 transition-transform',
              expDropdownOpen && 'rotate-180'
            )} />
          </button>

          {expDropdownOpen && experiments.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-bg-secondary border border-border-default rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
              {experiments.map((exp) => (
                <button
                  key={exp.id}
                  onClick={() => {
                    setExpDropdownOpen(false);
                    loadExperiment(exp.id);
                  }}
                  className={clsx(
                    'w-full text-left px-3 py-2 text-xs hover:bg-bg-overlay transition-colors',
                    experiment?.experiment_id === exp.id
                      ? 'bg-accent-blue/10 text-accent-blue'
                      : 'text-text-secondary'
                  )}
                >
                  <div className="font-mono truncate">{exp.id}</div>
                  <div className="text-text-muted mt-0.5">
                    Кат. {exp.category} · задач: {exp.tasks_count} · моделей: {exp.models.length}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category + progress badges */}
        <div className="flex items-center gap-2 mt-2">
          {experiment && (
            <span className="px-2 py-0.5 bg-accent-blue/20 text-accent-blue text-xs rounded">
              Кат. {experiment.category}
            </span>
          )}
          {evaluationProgress && (
            <span className="px-2 py-0.5 bg-accent-green/20 text-accent-green text-xs rounded">
              {evaluationProgress.evaluated_runs}/{evaluationProgress.total_runs}
            </span>
          )}
        </div>
      </div>

      {/* Header with progress */}
      <div className="px-4 py-3 border-b border-border-muted flex-shrink-0">
        <h2 className="text-sm font-semibold text-text-primary mb-2">
          Задания для оценки
        </h2>
        
        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent-green transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-text-muted">
            {completedTasks}/{totalTasks}
          </span>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(taskGroups).map(([taskId, results]) => (
          <div key={taskId} className="mb-3">
            <div className="px-3 py-1">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                {taskId}
              </div>
              <div className="text-xs text-text-muted truncate">
                {results[0]?.task_name || taskId}
              </div>
            </div>
            {results.map((tr) => {
              // Ищем evaluation для этого task+model (если уже оценён)
              const te = taskEvaluations.find(
                e => e.task_id === tr.task_id && e.model_id === tr.model_id
              );
              const avgQ = te?.average_scores?.Q ?? null;
              const status: EvaluationStatus = te
                ? te.runs.every(r => r.scores) 
                  ? 'completed' 
                  : te.runs.some(r => r.scores) 
                    ? 'in_progress' 
                    : 'pending'
                : 'pending';

              return (
                <TaskItem
                  key={`${tr.task_id}-${tr.model_id}`}
                  taskId={tr.task_id}
                  taskTitle={tr.task_name || tr.task_id}
                  modelName={tr.model_name || tr.model_id}
                  status={status}
                  averageQ={avgQ}
                  isSelected={currentTaskId === tr.task_id && currentModelId === tr.model_id}
                  onClick={() => selectTask(tr.task_id, tr.model_id)}
                />
              );
            })}
          </div>
        ))}

        {taskResults.length === 0 && (
          <div className="text-center py-8 text-text-muted text-sm">
            Нет заданий для оценки
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border-muted flex-shrink-0">
        <div className="text-xs text-text-muted">
          Запусков на задание: <span className="text-text-primary">{experiment?.config?.runs_per_task || 3}</span>
        </div>
      </div>
    </aside>
  );
}
