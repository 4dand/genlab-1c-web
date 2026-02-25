/**
 * Базовые типы для GenLab-1C
 * Соответствуют Pydantic схемам из src/evaluator/schemas.py
 */

// Допустимые значения SMOP-оценок
export type SMOPValue = 0 | 2 | 4 | 6 | 8 | 10;

// SMOP оценки с вычисляемым Q
export interface SMOPScores {
  S: SMOPValue;  // Syntax - синтаксическая корректность
  M: SMOPValue;  // Meaning - семантическая корректность
  O: SMOPValue;  // Optimization - оптимизация и качество кода
  P: SMOPValue;  // Platform - соответствие платформе 1С
  Q: number;     // Quality = (S + M + O + P) / 4
}

// Статус оценки
export type EvaluationStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

// Результат запуска (из raw_results)
export interface RunResult {
  run_index: number;
  seed?: number | null;
  temperature?: number;
  response: string;
  response_hash: string;
  tokens_input: number;
  tokens_output: number;
  tokens_total?: number;
  cost_input?: number;
  cost_output?: number;
  cost_total: number;
  elapsed_time: number;
  success?: boolean;
  error?: string | null;
}

// Результат детерминизма
export interface DeterminismResult {
  total_runs: number;
  unique_responses: number;
  match_rate: number;
}

// Оценка одного запуска экспертом
export interface RunEvaluation {
  run_index: number;
  response_hash: string;
  scores: SMOPScores | null;
  comment: string;
  evaluated_at: string | null;
}

// Оценка задания для модели
export interface TaskEvaluation {
  task_id: string;
  model_id: string;
  model_name: string;  // Анонимизированное имя для слепой оценки
  runs: RunEvaluation[];
  average_scores: SMOPScores | null;
}

// Оценка всего эксперимента
export interface ExperimentEvaluation {
  experiment_id: string;
  evaluator_id: string;
  tasks: TaskEvaluation[];
  status: EvaluationStatus;
  created_at: string;
  updated_at: string;
}

// Информация о задании
export interface Task {
  id: string;
  title: string;
  description: string;
  category: 'A' | 'B';
  prompt: string;
  expected_behavior?: string;
}

// Информация о модели
export interface Model {
  id: string;
  name: string;
  provider: string;
  price_prompt: number;
  price_completion: number;
  context_window: number;
}

// Информация об эксперте
export interface Expert {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

// Результат задания из raw_results
export interface TaskResult {
  task_id: string;
  task_name?: string;
  model_id: string;
  model_name?: string;
  runs: RunResult[];
  determinism?: DeterminismResult;
  context_loaded?: boolean;
  context_objects?: string[];
  context_analysis_cost?: number;
  timestamp?: string;
}

// Полный результат эксперимента
export interface ExperimentResult {
  experiment_id: string;
  timestamp: string;
  category: 'A' | 'B';
  config: {
    runs_per_task: number;
    models: string[];
    tasks?: string[];
  };
  models_used?: string[];
  tasks_count?: number;
  runs_per_task?: number;
  task_results: TaskResult[];
}

// Сообщение в чате
export interface ChatMessage {
  id: string;
  author: Expert;
  content: string;
  timestamp: string;
  task_id?: string;
  run_index?: number;
  reactions?: { emoji: string; users: string[] }[];
}

// SMOP критерий с описаниями уровней
export interface SMOPCriterion {
  id: 'S' | 'M' | 'O' | 'P';
  name: string;
  description: string;
  levels: {
    value: SMOPValue;
    label: string;
    description: string;
  }[];
}

// Статистика по модели
export interface ModelStatistics {
  model_id: string;
  tasks_evaluated: number;
  total_runs: number;
  average_Q: number;
  average_S: number;
  average_M: number;
  average_O: number;
  average_P: number;
  std_Q: number;
  confidence_interval: [number, number];
}

// Состояние навигации
export interface NavigationState {
  currentExperiment: string | null;
  currentTask: string | null;
  currentModel: string | null;
  currentRun: number | null;
}
