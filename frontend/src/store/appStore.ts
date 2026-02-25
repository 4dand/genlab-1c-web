import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getModels as fetchModels,
  getTasks as fetchTasks,
  getBalance as fetchBalance,
  healthCheck,
  type ApiModel,
  type ApiTask,
  type BalanceInfo,
} from '@/api/client';
import { GENERATION_DEFAULTS } from '@/config/constants';

// Модель для генерации
export interface ModelConfig {
  key: string;
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
  meta: Record<string, unknown>;
}

// Настройки генерации
export interface GenerationSettings {
  temperature: number;
  maxTokens: number;
  runsPerTask: number;
  selectedModels: string[];
}

// Настройки промпта
export interface PromptConfig {
  id: string;
  name: string;
  systemPrompt: string;
  userTemplate: string;
  category: 'A' | 'B' | 'custom';
}

// Задача
export interface TaskConfig {
  id: string;
  name: string;
  difficulty: string;
  prompt: string;
  category: string;
  category_name: string;
}

// Задача в очереди
export interface QueueTask {
  id: string;
  name: string;
  prompt: string;
  models: string[];
  runs: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  results?: unknown[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface AppState {
  // Состояние подключения
  apiConnected: boolean;
  apiError: string | null;
  isLoading: boolean;

  // Модели
  models: ModelConfig[];

  // Задачи с сервера
  tasks: TaskConfig[];

  // Баланс
  balance: BalanceInfo | null;

  // Настройки генерации
  generationSettings: GenerationSettings;

  // Промпты
  prompts: PromptConfig[];
  activePromptId: string | null;

  // Очередь задач
  queue: QueueTask[];

  // Actions
  loadConfig: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  updateGenerationSettings: (settings: Partial<GenerationSettings>) => void;
  toggleModel: (modelId: string) => void;

  // Prompts
  addPrompt: (prompt: Omit<PromptConfig, 'id'>) => void;
  updatePrompt: (id: string, updates: Partial<PromptConfig>) => void;
  deletePrompt: (id: string) => void;
  setActivePrompt: (id: string) => void;

  // Queue
  addToQueue: (task: Omit<QueueTask, 'id' | 'status' | 'progress' | 'createdAt'>) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  startQueue: () => void;
  pauseQueue: () => void;
}

// Маппинг ApiModel → ModelConfig
function toModelConfig(m: ApiModel): ModelConfig {
  const provider =
    m.id.startsWith('anthropic/') ? 'Anthropic' :
    m.id.startsWith('openai/') ? 'OpenAI' :
    m.id.startsWith('google/') ? 'Google' : 'Other';
  return {
    key: m.key,
    id: m.id,
    name: m.name,
    provider,
    enabled: true,
    meta: m.meta,
  };
}

function toTaskConfig(t: ApiTask): TaskConfig {
  return {
    id: t.id,
    name: t.name,
    difficulty: t.difficulty,
    prompt: t.prompt,
    category: t.category,
    category_name: t.category_name,
  };
}

// Дефолтные модели (используются если API недоступен)
const defaultModels: ModelConfig[] = [
  { key: 'claude', id: 'anthropic/claude-opus-4-5', name: 'Claude Opus 4.5', provider: 'Anthropic', enabled: true, meta: {} },
  { key: 'gpt', id: 'openai/gpt-5.2-codex', name: 'GPT-5.2 Codex', provider: 'OpenAI', enabled: true, meta: {} },
  { key: 'gemini', id: 'google/gemini-3-flash', name: 'Gemini 3 Flash', provider: 'Google', enabled: true, meta: {} },
];

// Дефолтные промпты
const defaultPrompts: PromptConfig[] = [
  {
    id: 'default-1c',
    name: 'Стандартный 1С',
    category: 'A',
    systemPrompt: `Ты — эксперт по разработке на платформе 1С:Предприятие 8.3.
Генерируй только код на встроенном языке 1С.
Используй русскоязычный синтаксис.
Код должен быть готов к выполнению без дополнительных модификаций.`,
    userTemplate: '{prompt}',
  },
  {
    id: 'detailed-1c',
    name: 'Детальный с комментариями',
    category: 'A',
    systemPrompt: `Ты — эксперт по разработке на платформе 1С:Предприятие 8.3.
Генерируй код на встроенном языке 1С с подробными комментариями.
Объясняй логику работы кода.
Используй русскоязычный синтаксис.`,
    userTemplate: `Задание: {prompt}

Требования:
- Код должен быть с комментариями
- Использовать идиоматичные конструкции 1С
- Обрабатывать граничные случаи`,
  },
  {
    id: 'mcp-context',
    name: 'С контекстом MCP',
    category: 'B',
    systemPrompt: `Ты — эксперт по разработке на платформе 1С:Предприятие 8.3.
Тебе предоставлен контекст метаданных конфигурации через MCP.
Используй эти метаданные для генерации корректного кода.`,
    userTemplate: `Контекст метаданных:
{context}

Задание: {prompt}`,
  },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      apiConnected: false,
      apiError: null,
      isLoading: false,
      models: defaultModels,
      tasks: [],
      balance: null,
      generationSettings: {
        ...GENERATION_DEFAULTS,
        selectedModels: ['anthropic/claude-opus-4-5'],
      },
      prompts: defaultPrompts,
      activePromptId: 'default-1c',
      queue: [],

      loadConfig: async () => {
        set({ isLoading: true, apiError: null });

        // 1) Health check
        const health = await healthCheck();
        if (!health.success) {
          set({ apiConnected: false, apiError: 'API сервер недоступен', isLoading: false });
          return;
        }
        set({ apiConnected: true });

        // 2) Модели
        const modelsRes = await fetchModels();
        if (modelsRes.success && modelsRes.data && modelsRes.data.length > 0) {
          const existing = get().models;
          const mapped = modelsRes.data.map(m => {
            const prev = existing.find(e => e.id === m.id || e.key === m.key);
            return { ...toModelConfig(m), enabled: prev ? prev.enabled : true };
          });
          set({ models: mapped });
        }

        // 3) Задачи
        const tasksRes = await fetchTasks();
        if (tasksRes.success && tasksRes.data) {
          set({ tasks: tasksRes.data.map(toTaskConfig) });
        }

        // 4) Баланс (не блокируем)
        fetchBalance().then(res => {
          if (res.success && res.data) set({ balance: res.data });
        });

        set({ isLoading: false });
      },

      refreshBalance: async () => {
        const res = await fetchBalance();
        if (res.success && res.data) set({ balance: res.data });
      },
      
      updateGenerationSettings: (settings) => {
        set((state) => ({
          generationSettings: { ...state.generationSettings, ...settings },
        }));
      },
      
      toggleModel: (modelId) => {
        set((state) => ({
          models: state.models.map((m) =>
            m.id === modelId ? { ...m, enabled: !m.enabled } : m
          ),
        }));
      },
      
      addPrompt: (prompt) => {
        const id = `prompt-${Date.now()}`;
        set((state) => ({
          prompts: [...state.prompts, { ...prompt, id }],
        }));
      },
      
      updatePrompt: (id, updates) => {
        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },
      
      deletePrompt: (id) => {
        set((state) => ({
          prompts: state.prompts.filter((p) => p.id !== id),
          activePromptId: state.activePromptId === id ? null : state.activePromptId,
        }));
      },
      
      setActivePrompt: (id) => {
        set({ activePromptId: id });
      },
      
      addToQueue: (task) => {
        const id = `task-${Date.now()}`;
        const newTask: QueueTask = {
          ...task,
          id,
          status: 'pending',
          progress: 0,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          queue: [...state.queue, newTask],
        }));
      },
      
      removeFromQueue: (id) => {
        set((state) => ({
          queue: state.queue.filter((t) => t.id !== id),
        }));
      },
      
      clearQueue: () => {
        set({ queue: [] });
      },
      
      startQueue: () => {
        // В реальном приложении — запуск через WebSocket/API
        const { queue } = get();
        const pendingTasks = queue.filter((t) => t.status === 'pending');
        if (pendingTasks.length > 0) {
          set((state) => ({
            queue: state.queue.map((t) =>
              t.id === pendingTasks[0].id
                ? { ...t, status: 'running' as const, startedAt: new Date().toISOString() }
                : t
            ),
          }));
        }
      },
      
      pauseQueue: () => {
        set((state) => ({
          queue: state.queue.map((t) =>
            t.status === 'running' ? { ...t, status: 'pending' as const } : t
          ),
        }));
      },
    }),
    {
      name: 'smop-app-store',
      partialize: (state) => ({
        generationSettings: state.generationSettings,
        prompts: state.prompts,
        activePromptId: state.activePromptId,
        models: state.models.map(m => ({ key: m.key, id: m.id, name: m.name, provider: m.provider, enabled: m.enabled, meta: {} })),
      }),
    }
  )
);
