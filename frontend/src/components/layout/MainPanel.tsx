import { CodeViewer } from '@/components/code/CodeViewer';
import type { CodeViewerMeta } from '@/components/code/CodeViewer';
import { ScorePanel } from '@/components/score/ScorePanel';
import { RunTabs } from '@/components/code/RunTabs';
import { TaskHeader } from '@/components/code/TaskHeader';
import { useEvaluationStore } from '@/store/evaluationStore';
import { useMemo } from 'react';

export function MainPanel() {
  const { 
    currentTaskId, 
    currentModelId,
    currentRun,
    experiment,
    taskEvaluations,
  } = useEvaluationStore();

  // Вычисляем currentTaskResult и currentTaskEvaluation прямо в компоненте,
  // чтобы гарантировать реактивность (zustand getters не реактивны)
  const currentTaskResult = experiment?.task_results.find(
    tr => tr.task_id === currentTaskId && tr.model_id === currentModelId
  );
  const currentTaskEvaluation = taskEvaluations.find(
    te => te.task_id === currentTaskId && te.model_id === currentModelId
  );

  const run = currentTaskResult?.runs?.[currentRun ?? 0];
  const runEval = currentTaskEvaluation?.runs?.[currentRun ?? 0];

  const codeMeta: CodeViewerMeta | undefined = useMemo(() => {
    if (!currentTaskResult || !run) return undefined;
    return {
      taskId: currentTaskResult.task_id,
      taskName: currentTaskResult.task_name,
      modelId: currentTaskResult.model_id,
      modelName: currentTaskResult.model_name,
      runIndex: run.run_index,
      totalRuns: currentTaskResult.runs.length,
      seed: run.seed,
      temperature: run.temperature,
      tokensInput: run.tokens_input,
      tokensOutput: run.tokens_output,
      tokensTotal: run.tokens_total,
      costTotal: run.cost_total,
      elapsedTime: run.elapsed_time,
      determinism: currentTaskResult.determinism ?? null,
      timestamp: experiment?.timestamp ?? currentTaskResult.timestamp,
    };
  }, [currentTaskResult, run]);

  if (!currentTaskId || !currentModelId) {
    return (
      <main className="flex-1 flex items-center justify-center bg-bg-primary h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Выберите задание
          </h2>
          <p className="text-text-secondary max-w-md">
            Выберите задание из списка слева для начала экспертной оценки 
            AI-сгенерированного кода 1С:Предприятие
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-full flex flex-col bg-bg-primary overflow-hidden">
      {/* Task header */}
      <TaskHeader />
      
      {/* Run tabs */}
      <RunTabs />
      
      {/* Content area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Code viewer */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <CodeViewer 
            code={run?.response || ''} 
            hash={run?.response_hash || ''}
            meta={codeMeta}
          />
        </div>
        
        {/* Score panel */}
        <div className="w-96 flex-shrink-0 border-l border-border-default overflow-hidden">
          <ScorePanel 
            evaluation={runEval}
            runIndex={currentRun ?? 0}
          />
        </div>
      </div>
    </main>
  );
}
