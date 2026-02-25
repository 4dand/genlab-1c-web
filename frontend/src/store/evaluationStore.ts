import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Task,
  Expert,
  SMOPScores,
  TaskEvaluation,
  TaskResult,
  ExperimentResult,
  ChatMessage
} from '@/types';
import { calculateQ } from '@/types/smop';
import {
  getExperiment,
  getExperiments,
  getEvaluation,
  getTasks,
  setAllScores,
  getEvaluationProgress,
  type ExperimentListItem,
  type EvaluationProgress,
} from '@/api/client';
import { useAuthStore } from '@/store/authStore';

interface EvaluationState {
  // Data
  experiment: ExperimentResult | null;
  experiments: ExperimentListItem[];
  tasks: Task[];
  taskEvaluations: TaskEvaluation[];
  chatMessages: ChatMessage[];
  currentExpert: Expert | null;
  evaluationProgress: EvaluationProgress | null;

  // Loading
  isLoading: boolean;
  error: string | null;

  // Navigation
  currentTaskId: string | null;
  currentModelId: string | null;
  currentRun: number | null;
  isChatOpen: boolean;

  // Computed (реализовано как функции — см. ниже)
  currentTaskResult: TaskResult | undefined;
  currentTaskEvaluation: TaskEvaluation | undefined;
  getCurrentTaskResult: () => TaskResult | undefined;
  getCurrentTaskEvaluation: () => TaskEvaluation | undefined;

  // Actions
  loadExperiments: () => Promise<void>;
  loadExperiment: (experimentId: string) => Promise<void>;
  selectTask: (taskId: string, modelId: string) => void;
  selectRun: (runIndex: number) => void;
  toggleChat: () => void;
  updateRunScore: (runIndex: number, scores: SMOPScores, comment: string) => void;
  saveEvaluation: () => Promise<void>;
  sendChatMessage: (content: string) => void;
}

export const useEvaluationStore = create<EvaluationState>()(
  persist(
    (set, get) => ({
      // Initial state
      experiment: null,
      experiments: [],
      tasks: [],
      taskEvaluations: [],
      chatMessages: [],
      currentExpert: null,
      evaluationProgress: null,
      isLoading: false,
      error: null,

      currentTaskId: null,
      currentModelId: null,
      currentRun: null,
      isChatOpen: false,

      get currentTaskResult() {
        const { experiment, currentTaskId, currentModelId } = get();
        if (!experiment || !currentTaskId || !currentModelId) return undefined;
        return experiment.task_results.find(
          tr => tr.task_id === currentTaskId && tr.model_id === currentModelId
        );
      },

      get currentTaskEvaluation() {
        const { taskEvaluations, currentTaskId, currentModelId } = get();
        if (!currentTaskId || !currentModelId) return undefined;
        return taskEvaluations.find(
          te => te.task_id === currentTaskId && te.model_id === currentModelId
        );
      },

      getCurrentTaskResult: () => {
        const { experiment, currentTaskId, currentModelId } = get();
        if (!experiment || !currentTaskId || !currentModelId) return undefined;
        return experiment.task_results.find(
          tr => tr.task_id === currentTaskId && tr.model_id === currentModelId
        );
      },

      getCurrentTaskEvaluation: () => {
        const { taskEvaluations, currentTaskId, currentModelId } = get();
        if (!currentTaskId || !currentModelId) return undefined;
        return taskEvaluations.find(
          te => te.task_id === currentTaskId && te.model_id === currentModelId
        );
      },

      // ─── Загрузить список экспериментов ───
      loadExperiments: async () => {
        const res = await getExperiments();
        if (res.success && res.data) {
          set({ experiments: res.data });
        }
      },

      // ─── Загрузить конкретный эксперимент + оценки ───
      loadExperiment: async (experimentId: string) => {
        set({ isLoading: true, error: null });

        // 1) Данные эксперимента
        const expRes = await getExperiment(experimentId);
        if (!expRes.success || !expRes.data) {
          set({ isLoading: false, error: expRes.error || 'Эксперимент не найден' });
          return;
        }

        // Нормализуем: API может вернуть experiment_name вместо experiment_id
        const raw = expRes.data as Record<string, unknown>;
        const expData: ExperimentResult = {
          experiment_id: (raw.experiment_id || raw.experiment_name || experimentId) as string,
          timestamp: (raw.timestamp || '') as string,
          category: (raw.category || 'A') as 'A' | 'B',
          config: (raw.config || {
            runs_per_task: (raw.runs_per_task || 3) as number,
            models: (raw.models_used || []) as string[],
            tasks: [],
          }) as ExperimentResult['config'],
          task_results: (raw.task_results || []) as TaskResult[],
        };
        set({ experiment: expData });

        // Извлекаем задачи (берём task_name из первого task_result для каждого task_id)
        const taskNameMap = new Map<string, string>();
        for (const tr of expData.task_results) {
          if (!taskNameMap.has(tr.task_id) && tr.task_name) {
            taskNameMap.set(tr.task_id, tr.task_name);
          }
        }
        const taskIds = [...new Set(expData.task_results.map(tr => tr.task_id))];

        // Загружаем описания/промпты задач из API
        const tasksRes = await getTasks(expData.category);
        const apiTaskMap = new Map<string, { name: string; prompt: string }>();
        if (tasksRes.success && tasksRes.data) {
          for (const t of tasksRes.data) {
            apiTaskMap.set(t.id, { name: t.name, prompt: t.prompt });
          }
        }

        const tasks: Task[] = taskIds.map(id => {
          const apiTask = apiTaskMap.get(id);
          return {
            id,
            title: apiTask?.name || taskNameMap.get(id) || id,
            description: apiTask?.prompt || '',
            category: expData.category,
            prompt: apiTask?.prompt || '',
          };
        });
        set({ tasks });

        // 2) Оценки экспертов
        const evalRes = await getEvaluation(experimentId);

        if (evalRes.success && evalRes.data) {
          const evalData = evalRes.data as Record<string, unknown>;
          const taskEvals = (evalData.tasks || []) as TaskEvaluation[];
          set({ taskEvaluations: taskEvals });
        } else {
          set({ taskEvaluations: [] });
        }

        // 3) Прогресс
        const progressRes = await getEvaluationProgress(experimentId);
        if (progressRes.success && progressRes.data) {
          set({ evaluationProgress: progressRes.data });
        }

        set({
          isLoading: false,
          currentTaskId: null,
          currentModelId: null,
          currentRun: null,
        });
      },

      selectTask: (taskId: string, modelId: string) => {
        set({
          currentTaskId: taskId,
          currentModelId: modelId,
          currentRun: 0,
        });
      },

      selectRun: (runIndex: number) => {
        set({ currentRun: runIndex });
      },

      toggleChat: () => {
        set(state => ({ isChatOpen: !state.isChatOpen }));
      },

      updateRunScore: (runIndex: number, scores: SMOPScores, comment: string) => {
        const { currentTaskId, currentModelId, taskEvaluations } = get();
        if (!currentTaskId || !currentModelId) return;

        const updatedEvaluations = taskEvaluations.map(te => {
          if (te.task_id !== currentTaskId || te.model_id !== currentModelId) {
            return te;
          }

          const updatedRuns = [...te.runs];
          updatedRuns[runIndex] = {
            ...updatedRuns[runIndex],
            scores,
            comment,
            evaluated_at: new Date().toISOString(),
          };

          // Пересчитываем среднее
          const evaluatedRuns = updatedRuns.filter(r => r.scores !== null);
          let averageScores: SMOPScores | null = null;

          if (evaluatedRuns.length > 0) {
            const avgS = evaluatedRuns.reduce((sum, r) => sum + (r.scores?.S || 0), 0) / evaluatedRuns.length;
            const avgM = evaluatedRuns.reduce((sum, r) => sum + (r.scores?.M || 0), 0) / evaluatedRuns.length;
            const avgO = evaluatedRuns.reduce((sum, r) => sum + (r.scores?.O || 0), 0) / evaluatedRuns.length;
            const avgP = evaluatedRuns.reduce((sum, r) => sum + (r.scores?.P || 0), 0) / evaluatedRuns.length;

            averageScores = {
              S: Math.round(avgS / 2) * 2 as SMOPScores['S'],
              M: Math.round(avgM / 2) * 2 as SMOPScores['M'],
              O: Math.round(avgO / 2) * 2 as SMOPScores['O'],
              P: Math.round(avgP / 2) * 2 as SMOPScores['P'],
              Q: calculateQ({ S: avgS, M: avgM, O: avgO, P: avgP }),
            };
          }

          return {
            ...te,
            runs: updatedRuns,
            average_scores: averageScores,
          };
        });

        set({ taskEvaluations: updatedEvaluations });
      },

      saveEvaluation: async () => {
        const {
          experiment,
          currentTaskId,
          currentModelId,
          currentRun,
          taskEvaluations,
        } = get();

        if (!experiment || !currentTaskId || !currentModelId) return;

        const te = taskEvaluations.find(
          t => t.task_id === currentTaskId && t.model_id === currentModelId
        );
        if (!te) return;

        const runEval = te.runs[currentRun ?? 0];
        if (!runEval?.scores) return;

        const res = await setAllScores({
          experiment_id: experiment.experiment_id,
          task_id: currentTaskId,
          model_id: currentModelId,
          run_index: currentRun ?? 0,
          scores: {
            S: runEval.scores.S,
            M: runEval.scores.M,
            O: runEval.scores.O,
            P: runEval.scores.P,
          },
          comment: runEval.comment || '',
        });

        if (res.success && res.data?.progress) {
          set({ evaluationProgress: res.data.progress });
        }
      },

      sendChatMessage: (content: string) => {
        const { currentTaskId, chatMessages } = get();
        const authUser = useAuthStore.getState().user;
        if (!authUser) return;

        const expert: Expert = {
          id: authUser.id,
          name: authUser.full_name || authUser.username,
        };

        const newMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          author: expert,
          content,
          timestamp: new Date().toISOString(),
          task_id: currentTaskId || undefined,
        };

        set({ chatMessages: [...chatMessages, newMessage] });
      },
    }),
    {
      name: 'smop-evaluation-store',
      partialize: (state) => ({
        chatMessages: state.chatMessages,
      }),
    }
  )
);
