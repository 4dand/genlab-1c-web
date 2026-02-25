import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  Plus,
  ChevronDown,
  Loader2,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Zap,
  Layers,
  FlaskConical,
  X,
  AlertCircle,
  Cpu,
  FileCode,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  getExperiments,
  getExperiment,
  runExperiment,
  runCustomExperiment,
  getRunningStatus,
  getTasks,
  getModels,
  type ExperimentListItem,
  type ExperimentRunRequest,
  type CustomExperimentRunRequest,
  type ExperimentRunStatus,
  type ApiTask,
  type ApiModel,
} from '@/api/client';
import { clsx } from 'clsx';
import { DifficultyBadge } from '@/components/ui/DifficultyBadge';

// Модульная переменная — сохраняется при навигации между страницами
let _bannerDismissed = false;

// ─── Типы ───

interface TaskItem {
  id: string;
  name: string;
  difficulty: string;
  prompt: string;
  category: string;
  category_name: string;
}

// ─── Панель статуса запущенного эксперимента ───

function RunningBanner({
  status,
  onRefresh,
  onDismiss,
}: {
  status: ExperimentRunStatus;
  onRefresh: () => void;
  onDismiss?: () => void;
}) {
  if (status.status === 'idle') return null;

  const isRunning = status.status === 'running';
  const isCompleted = status.status === 'completed';
  const isFailed = status.status === 'failed';

  const progress =
    status.tasks_total > 0
      ? Math.round((status.tasks_completed / status.tasks_total) * 100)
      : 0;

  return (
    <div
      className={clsx(
        'border rounded-lg p-4',
        isRunning && 'border-accent-blue/30 bg-accent-blue/5',
        isCompleted && 'border-accent-green/30 bg-accent-green/5',
        isFailed && 'border-accent-red/30 bg-accent-red/5'
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        {isRunning && <Loader2 className="w-5 h-5 text-accent-blue animate-spin" />}
        {isCompleted && <CheckCircle2 className="w-5 h-5 text-accent-green" />}
        {isFailed && <XCircle className="w-5 h-5 text-accent-red" />}

        <div className="flex-1">
          <div className="text-sm font-medium text-text-primary">
            {isRunning && 'Эксперимент выполняется…'}
            {isCompleted && 'Эксперимент завершён'}
            {isFailed && 'Эксперимент завершился с ошибкой'}
          </div>
          {status.experiment_name && (
            <div className="text-xs text-text-muted font-mono mt-0.5">
              {status.experiment_name}
            </div>
          )}
        </div>

        <button
          onClick={onRefresh}
          className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
          title="Обновить статус"
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
        {onDismiss && !isRunning && (
          <button
            onClick={onDismiss}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
            title="Скрыть"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {isRunning && (
        <div className="mb-3">
          <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-blue rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5 text-xs text-text-muted">
            <span>
              {status.tasks_completed}/{status.tasks_total} задач
            </span>
            <span>{progress}%</span>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {status.category && (
          <div>
            <div className="text-text-muted">Категория</div>
            <div className="text-text-primary font-medium">{status.category}</div>
          </div>
        )}
        {status.current_task && (
          <div>
            <div className="text-text-muted">Текущая задача</div>
            <div className="text-text-primary font-medium">{status.current_task}</div>
          </div>
        )}
        {status.current_model && (
          <div>
            <div className="text-text-muted">Текущая модель</div>
            <div className="text-text-primary font-medium">{status.current_model}</div>
          </div>
        )}
        {status.total_cost > 0 && (
          <div>
            <div className="text-text-muted">Стоимость</div>
            <div className="text-text-primary font-medium">
              ${status.total_cost.toFixed(4)}
            </div>
          </div>
        )}
        {status.total_tokens > 0 && (
          <div>
            <div className="text-text-muted">Токены</div>
            <div className="text-text-primary font-medium">
              {status.total_tokens.toLocaleString()}
            </div>
          </div>
        )}
        {status.total_time > 0 && (
          <div>
            <div className="text-text-muted">Время</div>
            <div className="text-text-primary font-medium">
              {status.total_time.toFixed(1)}с
            </div>
          </div>
        )}
      </div>

      {isFailed && status.error && (
        <div className="mt-3 p-2 bg-accent-red/10 border border-accent-red/20 rounded-md text-xs text-accent-red">
          {status.error}
        </div>
      )}
    </div>
  );
}

// ─── Кастомная задача для ручного ввода ───

interface CustomTask {
  tempId: string;
  name: string;
  prompt: string;
  difficulty: string;
}

// ─── Модалка создания эксперимента ───

type CategoryMode = 'A' | 'B' | 'custom';

function CreateExperimentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [categoryMode, setCategoryMode] = useState<CategoryMode>('A');
  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [allModels, setAllModels] = useState<ApiModel[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedModelKeys, setSelectedModelKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  // Custom mode state
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [customSystemPrompt, setCustomSystemPrompt] = useState(
    'Ты — эксперт по разработке на платформе 1С:Предприятие 8.3.\n' +
      'Генерируй только код на встроенном языке 1С.\n' +
      'Используй русскоязычный синтаксис.\n' +
      'Код должен быть готов к выполнению без дополнительных модификаций.'
  );
  const [customTemperature, setCustomTemperature] = useState(0.0);
  const [customMaxTokens, setCustomMaxTokens] = useState(4096);
  const [customRuns, setCustomRuns] = useState(3);

  const isPreset = categoryMode === 'A' || categoryMode === 'B';

  // Загрузить задачи и модели при смене категории (для пресетов)
  useEffect(() => {
    if (!isPreset) return;
    setIsLoading(true);
    setError(null);

    Promise.all([getTasks(categoryMode as 'A' | 'B'), getModels()]).then(
      ([tasksRes, modelsRes]) => {
        if (tasksRes.success && tasksRes.data) {
          const items: TaskItem[] = tasksRes.data.map((t: ApiTask) => ({
            id: t.id,
            name: t.name,
            difficulty: t.difficulty,
            prompt: t.prompt,
            category: t.category,
            category_name: t.category_name,
          }));
          setAllTasks(items);
          setSelectedTaskIds(items.map(t => t.id));
        }
        if (modelsRes.success && modelsRes.data) {
          setAllModels(modelsRes.data);
          setSelectedModelKeys(modelsRes.data.map(m => m.key));
        }
        setIsLoading(false);
      }
    );
  }, [categoryMode, isPreset]);

  // Загрузить модели при переключении на custom
  useEffect(() => {
    if (categoryMode !== 'custom') return;
    if (allModels.length > 0) return;
    getModels().then(res => {
      if (res.success && res.data) {
        setAllModels(res.data);
        setSelectedModelKeys(res.data.map(m => m.key));
      }
    });
  }, [categoryMode, allModels.length]);

  const toggleTask = (id: string) => {
    setSelectedTaskIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleModel = (key: string) => {
    setSelectedModelKeys(prev =>
      prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]
    );
  };

  const selectAllTasks = () =>
    setSelectedTaskIds(allTasks.map(t => t.id));
  const deselectAllTasks = () => setSelectedTaskIds([]);

  // Custom tasks CRUD
  const addCustomTask = () => {
    setCustomTasks(prev => [
      ...prev,
      {
        tempId: `custom-${Date.now()}`,
        name: '',
        prompt: '',
        difficulty: 'medium',
      },
    ]);
  };

  const updateCustomTask = (
    tempId: string,
    field: keyof CustomTask,
    value: string
  ) => {
    setCustomTasks(prev =>
      prev.map(t => (t.tempId === tempId ? { ...t, [field]: value } : t))
    );
  };

  const removeCustomTask = (tempId: string) => {
    setCustomTasks(prev => prev.filter(t => t.tempId !== tempId));
  };

  const handleSubmit = async () => {
    if (isPreset) {
      if (selectedTaskIds.length === 0 || selectedModelKeys.length === 0) return;
      setIsSubmitting(true);
      setError(null);

      const req: ExperimentRunRequest = {
        category: categoryMode as string,
        model_keys:
          selectedModelKeys.length === allModels.length
            ? null
            : selectedModelKeys,
        task_ids:
          selectedTaskIds.length === allTasks.length
            ? null
            : selectedTaskIds,
      };

      const res = await runExperiment(req);
      if (res.success) {
        onCreated();
        onClose();
      } else {
        setError(res.error || 'Не удалось запустить эксперимент');
      }
      setIsSubmitting(false);
    } else {
      // Custom mode — кастомный эксперимент
      const validTasks = customTasks.filter(
        t => t.name.trim() && t.prompt.trim()
      );
      if (validTasks.length === 0 || selectedModelKeys.length === 0) return;
      setIsSubmitting(true);
      setError(null);

      const req: CustomExperimentRunRequest = {
        model_keys:
          selectedModelKeys.length === allModels.length
            ? null
            : selectedModelKeys,
        tasks: validTasks.map(t => ({
          name: t.name.trim(),
          prompt: t.prompt.trim(),
          difficulty: t.difficulty as 'easy' | 'medium' | 'hard',
        })),
        system_prompt: customSystemPrompt.trim() || null,
        temperature: customTemperature,
        max_tokens: customMaxTokens,
        runs: customRuns,
      };

      const res = await runCustomExperiment(req);
      if (res.success) {
        onCreated();
        onClose();
      } else {
        setError(res.error || 'Не удалось запустить кастомный эксперимент');
      }
      setIsSubmitting(false);
    }
  };

  const categoryTasks = allTasks.filter(t => t.category === categoryMode);

  const canSubmit = isPreset
    ? selectedTaskIds.length > 0 && selectedModelKeys.length > 0
    : customTasks.some(t => t.name.trim() && t.prompt.trim()) &&
      selectedModelKeys.length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] bg-bg-secondary border border-border-default rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-muted flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-semibold text-text-primary text-base">
              Новый эксперимент
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Настройте параметры и запустите генерацию
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5 space-y-5">
          {/* Категория — 3 варианта */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Режим эксперимента
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  {
                    key: 'A' as CategoryMode,
                    label: 'Категория A',
                    desc: 'Алгоритмические задачи',
                  },
                  {
                    key: 'B' as CategoryMode,
                    label: 'Категория B',
                    desc: 'Платформенные (MCP)',
                  },
                  {
                    key: 'custom' as CategoryMode,
                    label: 'Кастомный',
                    desc: 'Свои задачи и промпты',
                  },
                ] as const
              ).map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setCategoryMode(cat.key)}
                  className={clsx(
                    'px-3 py-2.5 text-sm font-medium rounded-lg border transition-colors text-left',
                    categoryMode === cat.key
                      ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
                      : 'bg-bg-primary border-border-default text-text-secondary hover:bg-bg-tertiary'
                  )}
                >
                  <div className="font-semibold text-xs">{cat.label}</div>
                  <div className="text-[10px] mt-0.5 opacity-70">
                    {cat.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {isPreset && isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-accent-blue animate-spin" />
            </div>
          ) : isPreset ? (
            <>
              {/* Модели */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Модели генерации
                </label>
                <div className="space-y-1.5">
                  {allModels.map(model => (
                    <label
                      key={model.key}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                        selectedModelKeys.includes(model.key)
                          ? 'bg-accent-blue/5 border-accent-blue/20'
                          : 'bg-bg-primary border-border-default hover:bg-bg-tertiary'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedModelKeys.includes(model.key)}
                        onChange={() => toggleModel(model.key)}
                        className="rounded border-border-default accent-accent-blue"
                      />
                      <div className="flex-1">
                        <div className="text-sm text-text-primary font-medium">
                          {model.name}
                        </div>
                        <div className="text-[10px] text-text-muted font-mono">
                          {model.id}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Задачи */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-text-secondary">
                    Задачи ({selectedTaskIds.length}/{categoryTasks.length})
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllTasks}
                      className="text-[10px] text-accent-blue hover:underline"
                    >
                      Выбрать все
                    </button>
                    <button
                      onClick={deselectAllTasks}
                      className="text-[10px] text-text-muted hover:underline"
                    >
                      Снять все
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {categoryTasks.map(task => {
                    const isSelected = selectedTaskIds.includes(task.id);
                    const isExpanded = expandedTask === task.id;

                    return (
                      <div
                        key={task.id}
                        className={clsx(
                          'rounded-lg border overflow-hidden transition-colors',
                          isSelected
                            ? 'bg-accent-blue/5 border-accent-blue/20'
                            : 'bg-bg-primary border-border-default'
                        )}
                      >
                        <div className="flex items-center gap-3 px-3 py-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTask(task.id)}
                            className="rounded border-border-default accent-accent-blue shrink-0"
                          />
                          <span className="font-mono text-xs text-accent-blue font-semibold w-7 shrink-0">
                            {task.id}
                          </span>
                          <span
                            className="text-sm text-text-primary flex-1 truncate cursor-pointer hover:underline"
                            onClick={() =>
                              setExpandedTask(isExpanded ? null : task.id)
                            }
                          >
                            {task.name}
                          </span>
                          <DifficultyBadge difficulty={task.difficulty} />
                          <button
                            onClick={() =>
                              setExpandedTask(isExpanded ? null : task.id)
                            }
                            className="p-0.5 text-text-muted hover:text-text-primary"
                          >
                            <ChevronDown
                              className={clsx(
                                'w-3.5 h-3.5 transition-transform',
                                isExpanded && 'rotate-180'
                              )}
                            />
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="px-3 pb-3 border-t border-border-muted">
                            <pre className="text-[11px] text-text-muted bg-bg-tertiary p-2 rounded mt-2 whitespace-pre-wrap font-mono leading-relaxed">
                              {task.prompt.trim()}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* ───── Custom mode ───── */
            <>
              {/* Модели */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Модели генерации
                </label>
                <div className="space-y-1.5">
                  {allModels.map(model => (
                    <label
                      key={model.key}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                        selectedModelKeys.includes(model.key)
                          ? 'bg-accent-blue/5 border-accent-blue/20'
                          : 'bg-bg-primary border-border-default hover:bg-bg-tertiary'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedModelKeys.includes(model.key)}
                        onChange={() => toggleModel(model.key)}
                        className="rounded border-border-default accent-accent-blue"
                      />
                      <div className="flex-1">
                        <div className="text-sm text-text-primary font-medium">
                          {model.name}
                        </div>
                        <div className="text-[10px] text-text-muted font-mono">
                          {model.id}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Параметры генерации */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Параметры генерации
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-text-muted mb-1">
                      Temperature
                    </label>
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      max={2}
                      value={customTemperature}
                      onChange={e =>
                        setCustomTemperature(Number(e.target.value))
                      }
                      className="w-full px-2.5 py-1.5 bg-bg-primary border border-border-default rounded-md text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-text-muted mb-1">
                      Max tokens
                    </label>
                    <input
                      type="number"
                      step={256}
                      min={256}
                      max={32768}
                      value={customMaxTokens}
                      onChange={e =>
                        setCustomMaxTokens(Number(e.target.value))
                      }
                      className="w-full px-2.5 py-1.5 bg-bg-primary border border-border-default rounded-md text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-text-muted mb-1">
                      Прогонов на задачу
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={customRuns}
                      onChange={e => setCustomRuns(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-bg-primary border border-border-default rounded-md text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Системный промпт */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Системный промпт
                </label>
                <textarea
                  value={customSystemPrompt}
                  onChange={e => setCustomSystemPrompt(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-xs font-mono resize-none"
                />
              </div>

              {/* Кастомные задачи */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-text-secondary">
                    Задачи ({customTasks.length})
                  </label>
                  <button
                    onClick={addCustomTask}
                    className="flex items-center gap-1 text-[11px] text-accent-blue hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    Добавить задачу
                  </button>
                </div>

                {customTasks.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-border-default rounded-lg">
                    <Pencil className="w-5 h-5 text-text-muted mx-auto mb-2" />
                    <p className="text-xs text-text-muted mb-2">
                      Нет задач. Добавьте хотя бы одну.
                    </p>
                    <button
                      onClick={addCustomTask}
                      className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      Добавить задачу
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customTasks.map((task, idx) => (
                      <div
                        key={task.tempId}
                        className="bg-bg-primary border border-border-default rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] text-text-muted font-mono">
                            #{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={task.name}
                            onChange={e =>
                              updateCustomTask(
                                task.tempId,
                                'name',
                                e.target.value
                              )
                            }
                            placeholder="Название задачи"
                            className="flex-1 px-2.5 py-1 bg-bg-tertiary border border-border-default rounded text-sm"
                          />
                          <select
                            value={task.difficulty}
                            onChange={e =>
                              updateCustomTask(
                                task.tempId,
                                'difficulty',
                                e.target.value
                              )
                            }
                            className="px-2 py-1 bg-bg-tertiary border border-border-default rounded text-[11px]"
                          >
                            <option value="easy">Простая</option>
                            <option value="medium">Средняя</option>
                            <option value="hard">Сложная</option>
                          </select>
                          <button
                            onClick={() => removeCustomTask(task.tempId)}
                            className="p-1 text-text-muted hover:text-accent-red transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <textarea
                          value={task.prompt}
                          onChange={e =>
                            updateCustomTask(
                              task.tempId,
                              'prompt',
                              e.target.value
                            )
                          }
                          placeholder="Промпт задания…"
                          rows={3}
                          className="w-full px-2.5 py-1.5 bg-bg-tertiary border border-border-default rounded text-xs font-mono resize-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg text-sm text-accent-red">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border-muted flex items-center justify-between shrink-0">
          <div className="text-xs text-text-muted">
            {selectedModelKeys.length} модел
            {selectedModelKeys.length === 1 ? 'ь' : 'и'} ×{' '}
            {isPreset
              ? `${selectedTaskIds.length} задач`
              : `${customTasks.filter(t => t.name.trim() && t.prompt.trim()).length} задач`}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:bg-bg-tertiary rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !canSubmit}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                canSubmit && !isSubmitting
                  ? 'bg-accent-blue text-white hover:bg-accent-blue/90'
                  : 'bg-bg-tertiary text-text-muted cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Запустить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Типы для данных эксперимента ───

interface RunData {
  run_index: number;
  seed: number | null;
  temperature: number;
  tokens_input: number;
  tokens_output: number;
  cost_total: number;
  elapsed_time: number;
  response_hash: string;
  success?: boolean;
}

interface DeterminismData {
  total_runs: number;
  unique_responses: number;
  match_percent: number;
  is_deterministic: boolean;
}

interface TaskResultData {
  task_id: string;
  task_name: string;
  model_id: string;
  model_name: string;
  runs: RunData[];
  determinism?: DeterminismData;
  total_tokens: number;
  total_cost: number;
  avg_time?: number;
}

interface GroupedTask {
  id: string;
  name: string;
  models: {
    model_id: string;
    model_name: string;
    temperature: number;
    seeds: (number | null)[];
    runs_count: number;
    determinism?: DeterminismData;
    total_tokens: number;
    total_cost: number;
    avg_time: number;
  }[];
}

// ─── Раскрываемая задача эксперимента ───

function ExperimentTaskRow({
  task,
  taskPrompt,
  taskDifficulty,
}: {
  task: GroupedTask;
  taskPrompt?: string;
  taskDifficulty?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border-default rounded-lg overflow-hidden bg-bg-primary">
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="font-mono text-xs text-accent-blue font-semibold w-8 shrink-0">
          {task.id}
        </span>
        <span className="text-sm text-text-primary flex-1 truncate">
          {task.name}
        </span>
        {taskDifficulty && (
          <DifficultyBadge difficulty={taskDifficulty} />
        )}
        <span className="text-xs text-text-muted hidden sm:inline">
          {task.models.map(m => m.model_name).join(', ')}
        </span>
        <ChevronDown
          className={clsx(
            'w-3.5 h-3.5 text-text-muted transition-transform shrink-0',
            expanded && 'rotate-180'
          )}
        />
      </div>

      {expanded && (
        <div className="border-t border-border-muted">
          {/* Промпт */}
          {taskPrompt && (
            <div className="px-3 py-3 border-b border-border-muted">
              <div className="text-[11px] text-text-muted mb-1.5 font-medium uppercase tracking-wide">
                Промпт задания
              </div>
              <pre className="text-[11px] text-text-secondary bg-bg-tertiary p-2.5 rounded-md whitespace-pre-wrap font-mono leading-relaxed">
                {taskPrompt.trim()}
              </pre>
            </div>
          )}

          {/* Результаты по моделям */}
          <div className="px-3 py-3">
            <div className="text-[11px] text-text-muted mb-2 font-medium uppercase tracking-wide">
              Параметры генерации по моделям
            </div>
            <div className="space-y-2">
              {task.models.map(m => (
                <div
                  key={m.model_id}
                  className="bg-bg-tertiary rounded-md px-3 py-2"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-text-primary font-medium">
                      {m.model_name}
                    </span>
                    {m.determinism && (
                      <span
                        className={clsx(
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                          m.determinism.match_percent >= 80
                            ? 'bg-accent-green/10 text-accent-green'
                            : m.determinism.match_percent >= 50
                              ? 'bg-accent-yellow/10 text-accent-yellow'
                              : 'bg-accent-red/10 text-accent-red'
                        )}
                      >
                        Детерминизм: {m.determinism.match_percent.toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px]">
                    <div>
                      <span className="text-text-muted">Temperature: </span>
                      <span className="text-text-primary font-mono">
                        {m.temperature}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Seeds: </span>
                      <span className="text-text-primary font-mono">
                        {m.seeds.some(s => s != null)
                          ? m.seeds.map(s => s ?? '—').join(', ')
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Прогонов: </span>
                      <span className="text-text-primary font-mono">
                        {m.runs_count}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Ср. время: </span>
                      <span className="text-text-primary font-mono">
                        {m.avg_time.toFixed(2)}с
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Токены: </span>
                      <span className="text-text-primary font-mono">
                        {m.total_tokens.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Стоимость: </span>
                      <span className="text-text-primary font-mono">
                        ${m.total_cost.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Просмотр существующего эксперимента ───

function ExperimentView({ experimentId }: { experimentId: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [tasksCatalog, setTasksCatalog] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!experimentId) return;
    setIsLoading(true);
    setError(null);

    getExperiment(experimentId).then(res => {
      if (res.success && res.data) {
        setData(res.data);
        // Загружаем каталог задач чтобы получить промпты и сложность
        const cat = (res.data.category as string) ?? 'A';
        getTasks(cat as 'A' | 'B').then(tasksRes => {
          if (tasksRes.success && tasksRes.data) {
            setTasksCatalog(
              tasksRes.data.map((t: ApiTask) => ({
                id: t.id,
                name: t.name,
                difficulty: t.difficulty,
                prompt: t.prompt,
                category: t.category,
                category_name: t.category_name,
              }))
            );
          }
        });
      } else {
        setError(res.error || 'Не удалось загрузить эксперимент');
      }
      setIsLoading(false);
    });
  }, [experimentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-accent-red mx-auto mb-2" />
          <p className="text-text-muted text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const category = (data.category as string) ?? '—';
  const modelsUsed = (data.models_used as string[]) ?? [];
  const tasksCount = (data.tasks_count as number) ?? 0;
  const runsPerTask = (data.runs_per_task as number) ?? 0;
  const totalTokens = (data.total_tokens as number) ?? 0;
  const totalCost = (data.total_cost as number) ?? 0;
  const totalTime = (data.total_time as number) ?? 0;
  const taskResults = (data.task_results as TaskResultData[]) ?? [];

  // Группируем task_results по task_id
  const grouped = new Map<string, GroupedTask>();
  for (const tr of taskResults) {
    if (!grouped.has(tr.task_id)) {
      grouped.set(tr.task_id, { id: tr.task_id, name: tr.task_name, models: [] });
    }
    const avgTime =
      tr.runs.length > 0
        ? tr.runs.reduce((s, r) => s + r.elapsed_time, 0) / tr.runs.length
        : 0;
    grouped.get(tr.task_id)!.models.push({
      model_id: tr.model_id,
      model_name: tr.model_name,
      temperature: tr.runs[0]?.temperature ?? 0,
      seeds: tr.runs.map(r => r.seed),
      runs_count: tr.runs.length,
      determinism: tr.determinism,
      total_tokens: tr.total_tokens,
      total_cost: tr.total_cost,
      avg_time: tr.avg_time ?? avgTime,
    });
  }
  const groupedTasks = Array.from(grouped.values());

  // Собираем параметры генерации по моделям (для summary)
  const modelParams = new Map<
    string,
    { name: string; temperature: number; seeds: Set<number | null>; runs: number }
  >();
  for (const tr of taskResults) {
    const key = tr.model_id;
    if (!modelParams.has(key)) {
      modelParams.set(key, {
        name: tr.model_name,
        temperature: tr.runs[0]?.temperature ?? 0,
        seeds: new Set(),
        runs: tr.runs.length,
      });
    }
    for (const r of tr.runs) {
      modelParams.get(key)!.seeds.add(r.seed);
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-blue/10 rounded-lg">
              <Layers className="w-5 h-5 text-accent-blue" />
            </div>
            <div>
              <div className="text-xl font-bold text-text-primary">
                Кат. {category}
              </div>
              <div className="text-xs text-text-muted">
                {category === 'A' ? 'Алгоритмические' : 'Платформенные'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-purple/10 rounded-lg">
              <Cpu className="w-5 h-5 text-accent-purple" />
            </div>
            <div>
              <div className="text-xl font-bold text-text-primary">
                {modelsUsed.length}
              </div>
              <div className="text-xs text-text-muted">Моделей</div>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-green/10 rounded-lg">
              <FileCode className="w-5 h-5 text-accent-green" />
            </div>
            <div>
              <div className="text-xl font-bold text-text-primary">
                {tasksCount} × {runsPerTask}
              </div>
              <div className="text-xs text-text-muted">Задач × Прогонов</div>
            </div>
          </div>
        </div>

        <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-yellow/10 rounded-lg">
              <Zap className="w-5 h-5 text-accent-yellow" />
            </div>
            <div>
              <div className="text-xl font-bold text-text-primary">
                ${totalCost.toFixed(2)}
              </div>
              <div className="text-xs text-text-muted">
                {totalTokens.toLocaleString()} токенов · {totalTime.toFixed(1)}с
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Параметры генерации по моделям */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
        <h3 className="font-semibold text-text-primary text-sm mb-3">
          Параметры генерации
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-muted">
                <th className="text-left py-2 pr-4 text-text-muted font-medium">
                  Модель
                </th>
                <th className="text-left py-2 pr-4 text-text-muted font-medium">
                  Temperature
                </th>
                <th className="text-left py-2 pr-4 text-text-muted font-medium">
                  Seeds
                </th>
                <th className="text-left py-2 text-text-muted font-medium">
                  Прогонов
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from(modelParams.values()).map(mp => {
                const seedArr = Array.from(mp.seeds).filter(
                  (s): s is number => s != null
                );
                return (
                  <tr
                    key={mp.name}
                    className="border-b border-border-muted last:border-0"
                  >
                    <td className="py-2 pr-4 text-text-primary font-medium">
                      {mp.name}
                    </td>
                    <td className="py-2 pr-4 font-mono text-text-secondary">
                      {mp.temperature}
                    </td>
                    <td className="py-2 pr-4 font-mono text-text-secondary">
                      {seedArr.length > 0 ? seedArr.join(', ') : '—'}
                    </td>
                    <td className="py-2 font-mono text-text-secondary">
                      {mp.runs}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tasks breakdown — раскрываемые */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
        <h3 className="font-semibold text-text-primary text-sm mb-3">
          Задачи эксперимента ({groupedTasks.length})
        </h3>
        <div className="space-y-2">
          {groupedTasks.map(task => {
            const catalogItem = tasksCatalog.find(t => t.id === task.id);
            return (
              <ExperimentTaskRow
                key={task.id}
                task={task}
                taskPrompt={catalogItem?.prompt}
                taskDifficulty={catalogItem?.difficulty}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Основная страница
// ═══════════════════════════════════════════════════════════════════════

export function QueuePage() {
  const [experiments, setExperiments] = useState<ExperimentListItem[]>([]);
  const [selectedExp, setSelectedExp] = useState<string>('');
  const [showExpSelect, setShowExpSelect] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [runStatus, setRunStatus] = useState<ExperimentRunStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bannerDismissed, setBannerDismissedState] = useState(_bannerDismissed);

  const setBannerDismissed = (val: boolean) => {
    _bannerDismissed = val;
    setBannerDismissedState(val);
  };

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Загрузить список экспериментов
  const loadExperiments = useCallback(async () => {
    const res = await getExperiments();
    if (res.success && res.data) {
      setExperiments(res.data);
      if (res.data.length > 0 && !selectedExp) {
        setSelectedExp(res.data[0].id);
      }
    }
  }, [selectedExp]);

  // Загрузить статус запуска
  const loadRunStatus = useCallback(async () => {
    const res = await getRunningStatus();
    if (res.success && res.data) {
      setRunStatus(prev => {
        if (prev?.status !== 'running' && res.data!.status === 'running') {
          setBannerDismissed(false);
        }
        return res.data!;
      });
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadExperiments(), loadRunStatus()]).finally(() =>
      setIsLoading(false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Автообновление при запущенном эксперименте
  useEffect(() => {
    if (runStatus?.status !== 'running') return;
    const interval = setInterval(loadRunStatus, 3000);
    return () => clearInterval(interval);
  }, [runStatus?.status, loadRunStatus]);

  // Закрывать dropdown при клике снаружи
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowExpSelect(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    Promise.all([loadExperiments(), loadRunStatus()]).finally(() =>
      setIsLoading(false)
    );
  };

  const handleExperimentCreated = () => {
    loadRunStatus();
    setTimeout(() => loadExperiments(), 2000);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar — как в StatisticsPage */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-border-default bg-bg-secondary flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Experiment selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowExpSelect(!showExpSelect)}
              className="flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary border border-border-default rounded-md text-sm hover:bg-bg-overlay transition-colors"
            >
              <span className="text-text-muted text-xs">Эксперимент:</span>
              <span className="text-text-primary font-mono text-xs">
                {selectedExp || 'Выберите'}
              </span>
              <ChevronDown
                className={clsx(
                  'w-3.5 h-3.5 text-text-muted transition-transform',
                  showExpSelect && 'rotate-180'
                )}
              />
            </button>

            {showExpSelect && (
              <div className="absolute top-full left-0 mt-1 w-96 bg-bg-secondary border border-border-default rounded-lg shadow-xl z-50 max-h-64 overflow-auto">
                {experiments.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-text-muted text-center">
                    Нет экспериментов
                  </div>
                ) : (
                  experiments.map(exp => (
                    <button
                      key={exp.id}
                      onClick={() => {
                        setSelectedExp(exp.id);
                        setShowExpSelect(false);
                      }}
                      className={clsx(
                        'w-full px-3 py-2 text-left text-xs hover:bg-bg-overlay transition-colors',
                        selectedExp === exp.id &&
                          'bg-accent-blue/10 text-accent-blue'
                      )}
                    >
                      <div className="font-mono font-medium">{exp.id}</div>
                      <div className="text-text-muted mt-0.5">
                        Кат. {exp.category} · задач: {exp.tasks_count} ·
                        моделей: {exp.models.length} · прогонов:{' '}
                        {exp.runs_per_task}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors disabled:opacity-50"
            title="Обновить"
          >
            <RefreshCcw
              className={clsx('w-4 h-4', isLoading && 'animate-spin')}
            />
          </button>
        </div>

        {/* Create experiment */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue text-white text-sm font-medium rounded-md hover:bg-accent-blue/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Новый эксперимент
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {/* Running experiment banner */}
          {runStatus && runStatus.status !== 'idle' && !bannerDismissed && (
            <RunningBanner status={runStatus} onRefresh={loadRunStatus} onDismiss={() => setBannerDismissed(true)} />
          )}

          {/* Experiment details or empty state */}
          {isLoading && !selectedExp ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
            </div>
          ) : selectedExp ? (
            <ExperimentView experimentId={selectedExp} />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FlaskConical className="w-10 h-10 text-text-muted mb-3" />
              <h3 className="text-lg font-medium text-text-primary mb-1">
                Нет экспериментов
              </h3>
              <p className="text-sm text-text-muted mb-4">
                Создайте новый эксперимент для пакетной генерации кода
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Новый эксперимент
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <CreateExperimentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleExperimentCreated}
        />
      )}
    </div>
  );
}
