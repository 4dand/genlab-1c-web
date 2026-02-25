/**
 * API клиент для GenLab-1C
 * Типизированные обёртки для FastAPI бэкенда
 */

import { API_BASE, AUTH_STORAGE_KEY } from '../config/constants';

// ── Auth token helper ──

function getAuthHeaders(): Record<string, string> {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.token;
      if (token) return { Authorization: `Bearer ${token}` };
    }
  } catch { /* ignore */ }
  return {};
}

// ── Обёртка ответа ──

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options?.headers,
      },
      ...options,
    });

    if (response.status === 401) {
      // Token expired or invalid — clear auth and redirect
      localStorage.removeItem(AUTH_STORAGE_KEY);
      window.location.href = '/login';
      return { success: false, error: 'Сессия истекла' };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка сети',
    };
  }
}

// ── Health ──

export async function healthCheck(): Promise<ApiResponse<{ status: string; version: string }>> {
  return apiFetch('/health');
}

// ── Config: Models, Tasks, Settings, SMOP criteria ──

export interface ApiModel {
  key: string;
  id: string;
  name: string;
  meta: Record<string, unknown>;
  generation: Record<string, unknown>;
}

export interface ApiTask {
  id: string;
  name: string;
  difficulty: string;
  prompt: string;
  category: string;
  category_name: string;
  expected_objects: string[];
}

export async function getModels(): Promise<ApiResponse<ApiModel[]>> {
  return apiFetch<ApiModel[]>('/models');
}

export async function getTasks(category?: 'A' | 'B'): Promise<ApiResponse<ApiTask[]>> {
  const params = category ? `?category=${category}` : '';
  return apiFetch<ApiTask[]>(`/tasks${params}`);
}

export async function getSettings(): Promise<ApiResponse<Record<string, unknown>>> {
  return apiFetch('/settings');
}

export async function getSmopCriteria(): Promise<ApiResponse<unknown>> {
  return apiFetch('/smop-criteria');
}

// ── Experiments ──

export interface ExperimentListItem {
  id: string;
  path: string;
  category: string;
  timestamp: string;
  models: string[];
  tasks_count: number;
  runs_per_task: number;
  total_tokens: number;
  total_cost: number;
}

export async function getExperiments(): Promise<ApiResponse<ExperimentListItem[]>> {
  return apiFetch<ExperimentListItem[]>('/experiments');
}

export async function getExperiment(id: string): Promise<ApiResponse<Record<string, unknown>>> {
  return apiFetch(`/experiments/${id}`);
}

// ── Experiment Run ──

export interface ExperimentRunRequest {
  category: string;
  model_keys?: string[] | null;
  task_ids?: string[] | null;
}

export interface ExperimentRunStatus {
  status: 'idle' | 'running' | 'completed' | 'failed';
  experiment_name: string | null;
  category: string | null;
  models: string[];
  tasks_total: number;
  tasks_completed: number;
  current_task: string | null;
  current_model: string | null;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  total_tokens: number;
  total_cost: number;
  total_time: number;
  result_path: string | null;
}

export async function runExperiment(req: ExperimentRunRequest): Promise<ApiResponse<{ message: string }>> {
  return apiFetch('/experiments/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
}

// ── Custom Experiment Run ──

export interface CustomTaskInput {
  name: string;
  prompt: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface CustomExperimentRunRequest {
  model_keys?: string[] | null;
  tasks: CustomTaskInput[];
  system_prompt?: string | null;
  temperature?: number;
  max_tokens?: number;
  runs?: number;
}

export async function runCustomExperiment(
  req: CustomExperimentRunRequest
): Promise<ApiResponse<{ message: string }>> {
  return apiFetch('/experiments/run-custom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
}

export async function getRunningStatus(): Promise<ApiResponse<ExperimentRunStatus>> {
  return apiFetch<ExperimentRunStatus>('/experiments/running');
}

// ── Evaluations ──

export interface SetScoreRequest {
  experiment_id: string;
  evaluator_id?: string;
  task_id: string;
  model_id: string;
  run_index: number;
  metric: 'S' | 'M' | 'O' | 'P';
  score: number;
  comment?: string;
}

export interface SetAllScoresRequest {
  experiment_id: string;
  evaluator_id?: string;
  task_id: string;
  model_id: string;
  run_index: number;
  scores: { S: number; M: number; O: number; P: number };
  comment?: string;
}

export interface EvaluationProgress {
  total_runs: number;
  evaluated_runs: number;
  progress_percent: number;
  status: string;
}

export async function getEvaluations(
  experimentId?: string
): Promise<ApiResponse<unknown[]>> {
  const params = experimentId ? `?experiment_id=${experimentId}` : '';
  return apiFetch(`/evaluations${params}`);
}

export async function getEvaluation(
  experimentId: string,
): Promise<ApiResponse<Record<string, unknown>>> {
  return apiFetch(`/evaluations/${experimentId}`);
}

export async function getEvaluationProgress(
  experimentId: string,
): Promise<ApiResponse<EvaluationProgress>> {
  return apiFetch(`/evaluations/${experimentId}/progress`);
}

export async function setScore(
  data: SetScoreRequest
): Promise<ApiResponse<{ success: boolean; progress: EvaluationProgress }>> {
  return apiFetch('/evaluations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function setAllScores(
  data: SetAllScoresRequest
): Promise<ApiResponse<{ success: boolean; progress: EvaluationProgress }>> {
  return apiFetch('/evaluations/batch', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Generate (Playground) ──

export interface GenerateRequest {
  model_id: string;
  prompt: string;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  seed?: number;
}

export interface GenerateResponse {
  response: string;
  response_hash: string;
  model_id: string;
  tokens_input: number;
  tokens_output: number;
  cost_total: number;
  elapsed_time: number;
}

export async function generateCode(
  data: GenerateRequest
): Promise<ApiResponse<GenerateResponse>> {
  return apiFetch<GenerateResponse>('/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface BalanceInfo {
  balance: number | null;
  limit?: number;
  usage?: number;
  label?: string;
  error?: string;
}

export async function getBalance(): Promise<ApiResponse<BalanceInfo>> {
  return apiFetch<BalanceInfo>('/balance');
}

// ── Statistics ──

export async function getStatistics(
  experimentId: string,
  groupBy?: 'model' | 'task' | 'expert'
): Promise<ApiResponse<Record<string, unknown>>> {
  const params = new URLSearchParams();
  if (groupBy) params.append('group_by', groupBy);
  const qs = params.toString() ? `?${params}` : '';
  return apiFetch(`/statistics/${experimentId}${qs}`);
}

// ── Reports & Export ──

export interface ReportListItem {
  experiment_id: string;
  generated_at: string;
  path: string;
  has_html: boolean;
  has_latex: boolean;
}

export async function getReports(): Promise<ApiResponse<ReportListItem[]>> {
  return apiFetch<ReportListItem[]>('/reports');
}

export async function getReportJson(
  experimentId: string
): Promise<ApiResponse<Record<string, unknown>>> {
  return apiFetch(`/reports/${experimentId}`);
}

export async function getReportHtml(experimentId: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/reports/${experimentId}/html`);
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export async function exportReport(
  experimentId: string,
  format: 'json' | 'html' | 'latex'
): Promise<Blob | null> {
  try {
    const response = await fetch(
      `${API_BASE}/export/${experimentId}?format=${format}`
    );
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

// ── Charts (SVG from matplotlib) ──

export type ChartType =
  | 'radar'
  | 'models_comparison'
  | 'q_by_model'
  | 'distribution'
  | 'boxplot'
  | 'heatmap'
  | 'det_vs_quality'
  | 'dashboard';

/**
 * Скачать SVG-график (publication-quality из matplotlib) как Blob.
 * Возвращает null при ошибке.
 */
export async function getChartSvg(
  experimentId: string,
  chartType: ChartType
): Promise<Blob | null> {
  try {
    const response = await fetch(
      `${API_BASE}/charts/${experimentId}/${chartType}`
    );
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

// ── Users / Experts (только админ) ──

export interface AppUser {
  id: string;
  username: string;
  role: 'admin' | 'expert';
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: 'admin' | 'expert';
  full_name?: string;
}

export async function getUsers(): Promise<ApiResponse<AppUser[]>> {
  return apiFetch<AppUser[]>('/auth/users');
}

export async function createUser(
  data: CreateUserRequest
): Promise<ApiResponse<AppUser>> {
  return apiFetch<AppUser>('/auth/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Деактивировать пользователя (на бэкенде — soft-delete: is_active=false).
 * DELETE отвечает 204 без тела, поэтому не используем apiFetch (он парсит JSON).
 */
export async function deleteUser(userId: string): Promise<ApiResponse<null>> {
  try {
    const response = await fetch(`${API_BASE}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    });

    if (response.status === 401) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      window.location.href = '/login';
      return { success: false, error: 'Сессия истекла' };
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return {
        success: false,
        error: err.detail || err.message || `HTTP ${response.status}`,
      };
    }

    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка сети',
    };
  }
}
