import { useState, useEffect, useCallback } from 'react';
import {
  Save,
  Server,
  Cpu,
  Hash,
  RefreshCcw,
  DollarSign,
  Key,
  Bot,
  Loader2,
  FileText,
  Plus,
  Trash2,
  ChevronDown,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wifi,
} from 'lucide-react';
import { useAppStore, type PromptConfig } from '@/store/appStore';
import { getSettings } from '@/api/client';
import { clsx } from 'clsx';

// ─── Типы серверных настроек ───

interface ServerSettings {
  openrouter: {
    api_key: string | null;
    base_url: string;
    http_referer: string;
    app_title: string;
    timeout: number;
  };
  mcp: {
    url: string;
    timeout: number;
  };
  agent: {
    model: string;
    max_iterations: number;
    max_context_lines: number;
    max_total_context_chars: number;
    max_objects: number;
    cache: {
      enabled: boolean;
      dir: string;
      ttl_hours: number;
    };
    prompts: {
      system: string;
      user_template: string;
    };
  };
  hashing: {
    algorithm: string;
    normalize: boolean;
    extract_code: boolean;
  };
}

// ─── Переключатель (Toggle) ───

function Toggle({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className={clsx(
          'relative w-9 h-5 rounded-full flex-shrink-0',
          checked ? 'bg-accent-blue' : 'bg-bg-overlay'
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
            checked && 'translate-x-4'
          )}
        />
      </div>
      <span className="text-sm text-text-secondary">{label}</span>
    </div>
  );
}

// ─── Секция-аккордеон ───

function SettingsSection({
  icon: Icon,
  iconColor,
  title,
  description,
  defaultOpen = false,
  children,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className={clsx('p-1.5 rounded-lg', iconColor)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-text-primary text-sm">{title}</h3>
          {description && (
            <p className="text-[11px] text-text-muted mt-0.5">{description}</p>
          )}
        </div>
        <ChevronDown
          className={clsx(
            'w-4 h-4 text-text-muted transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border-muted">
          <div className="pt-4 space-y-4">{children}</div>
        </div>
      )}
    </div>
  );
}

// ─── Редактор промпта (inline) ───

function PromptEditor({
  prompt,
  isActive,
  onActivate,
  onUpdate,
  onDelete,
}: {
  prompt: PromptConfig;
  isActive: boolean;
  onActivate: () => void;
  onUpdate: (updates: Partial<PromptConfig>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [local, setLocal] = useState(prompt);
  const hasChanges = JSON.stringify(local) !== JSON.stringify(prompt);

  return (
    <div
      className={clsx(
        'rounded-lg border overflow-hidden transition-colors',
        isActive ? 'border-accent-blue/30 bg-accent-blue/[0.03]' : 'border-border-default bg-bg-primary'
      )}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          onClick={onActivate}
          className={clsx(
            'w-3 h-3 rounded-full border-2 flex-shrink-0 transition-colors',
            isActive
              ? 'border-accent-blue bg-accent-blue'
              : 'border-text-muted hover:border-accent-blue'
          )}
        />
        <span className="text-sm text-text-primary font-medium flex-1 truncate">
          {prompt.name}
        </span>
        <span
          className={clsx(
            'px-1.5 py-0.5 text-[9px] font-semibold rounded uppercase',
            prompt.category === 'A'
              ? 'bg-accent-blue/15 text-accent-blue'
              : prompt.category === 'B'
                ? 'bg-accent-purple/15 text-accent-purple'
                : 'bg-bg-tertiary text-text-muted'
          )}
        >
          {prompt.category === 'A' ? 'Кат. A' : prompt.category === 'B' ? 'Кат. B' : 'Кастом'}
        </span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-text-muted hover:text-text-primary rounded transition-colors"
        >
          <ChevronDown
            className={clsx('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')}
          />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-border-muted space-y-3 pt-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Название</label>
            <input
              type="text"
              value={local.name}
              onChange={e => setLocal({ ...local, name: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-bg-tertiary border border-border-default rounded-md text-sm focus:outline-none focus:border-accent-blue"
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Категория</label>
            <div className="flex gap-1.5">
              {(['A', 'B', 'custom'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setLocal({ ...local, category: cat })}
                  className={clsx(
                    'px-2.5 py-1 text-xs rounded-md transition-colors',
                    local.category === cat
                      ? 'bg-accent-blue text-white'
                      : 'bg-bg-tertiary text-text-secondary hover:bg-bg-overlay'
                  )}
                >
                  {cat === 'A' ? 'Кат. A' : cat === 'B' ? 'Кат. B' : 'Кастомный'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">Системный промпт</label>
            <textarea
              value={local.systemPrompt}
              onChange={e => setLocal({ ...local, systemPrompt: e.target.value })}
              rows={4}
              className="w-full px-2.5 py-1.5 bg-bg-tertiary border border-border-default rounded-md text-xs font-mono resize-none focus:outline-none focus:border-accent-blue"
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1">
              Шаблон промпта
              <span className="text-text-muted/60 ml-1">({'{prompt}'} для подстановки)</span>
            </label>
            <textarea
              value={local.userTemplate}
              onChange={e => setLocal({ ...local, userTemplate: e.target.value })}
              rows={3}
              className="w-full px-2.5 py-1.5 bg-bg-tertiary border border-border-default rounded-md text-xs font-mono resize-none focus:outline-none focus:border-accent-blue"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={onDelete}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-accent-red transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Удалить
            </button>
            {hasChanges && (
              <button
                onClick={() => onUpdate(local)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs bg-accent-green text-bg-primary rounded-md hover:bg-accent-green/90 transition-colors font-medium"
              >
                <Save className="w-3 h-3" />
                Сохранить
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Основная страница настроек
// ═══════════════════════════════════════════════════════════════════════

export function SettingsPage() {
  const {
    models,
    toggleModel,
    apiConnected,
    apiError,
    balance,
    refreshBalance,
    isLoading,
    loadConfig,
    prompts,
    activePromptId,
    addPrompt,
    updatePrompt,
    deletePrompt,
    setActivePrompt,
  } = useAppStore();

  const [serverSettings, setServerSettings] = useState<ServerSettings | null>(null);
  const [loadingServer, setLoadingServer] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Загрузка серверных настроек
  const fetchServerSettings = useCallback(async () => {
    setLoadingServer(true);
    const res = await getSettings();
    if (res.success && res.data) {
      setServerSettings(res.data as unknown as ServerSettings);
    }
    setLoadingServer(false);
  }, []);

  useEffect(() => {
    fetchServerSettings();
    refreshBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddPrompt = () => {
    addPrompt({
      name: 'Новый промпт',
      category: 'custom',
      systemPrompt: 'Ты — эксперт по разработке на платформе 1С:Предприятие 8.3.',
      userTemplate: '{prompt}',
    });
  };

  // Маскировка API-ключа
  const rawKey = serverSettings?.openrouter?.api_key;
  const keyDisplay =
    rawKey === '***' ? 'sk-or-••••••••' : rawKey ? rawKey : 'Не задан';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-border-default bg-bg-secondary flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">Параметры системы</span>
          <button
            onClick={() => { loadConfig(); fetchServerSettings(); }}
            disabled={isLoading}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors disabled:opacity-50"
            title="Обновить"
          >
            <RefreshCcw className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0">
        <div className="max-w-5xl mx-auto p-6 space-y-3">

          {/* ── 1. OpenRouter API ── */}
          <SettingsSection
            icon={Key}
            iconColor="bg-accent-yellow/10 text-accent-yellow"
            title="OpenRouter API"
            description="Ключ доступа и баланс"
            defaultOpen
          >
            {/* Статус подключения */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border-default bg-bg-primary">
              <div className="flex items-center gap-2.5">
                {apiConnected ? (
                  <CheckCircle2 className="w-4 h-4 text-accent-green" />
                ) : (
                  <XCircle className="w-4 h-4 text-accent-red" />
                )}
                <div>
                  <div className="text-sm text-text-primary font-medium">
                    {apiConnected ? 'API подключено' : 'API недоступно'}
                  </div>
                  {apiError && <div className="text-[11px] text-accent-red">{apiError}</div>}
                  {!apiError && apiConnected && (
                    <div className="text-[11px] text-text-muted">http://localhost:8000</div>
                  )}
                </div>
              </div>
              <button
                onClick={() => loadConfig()}
                disabled={isLoading}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
              >
                <RefreshCcw className={clsx('w-3 h-3', isLoading && 'animate-spin')} />
                Переподключить
              </button>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-xs text-text-muted mb-1">API Key</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-2.5 py-1.5 bg-bg-primary border border-border-default rounded-md text-sm font-mono text-text-muted flex items-center justify-between">
                  <span>{showApiKey ? (rawKey ?? '—') : keyDisplay}</span>
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-0.5 text-text-muted hover:text-text-primary transition-colors"
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-[10px] text-text-muted whitespace-nowrap">из .env</span>
              </div>
            </div>

            {/* Баланс */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border-default bg-bg-primary">
              <div className="flex items-center gap-2.5">
                <DollarSign className="w-4 h-4 text-accent-yellow" />
                <div>
                  <div className="text-sm text-text-primary font-medium">Баланс</div>
                  {balance ? (
                    <div className="text-[11px] text-text-muted">
                      {balance.error
                        ? balance.error
                        : `$${(balance.balance ?? 0).toFixed(4)} / лимит $${(balance.limit ?? 0).toFixed(2)}`}
                    </div>
                  ) : (
                    <div className="text-[11px] text-text-muted">Загрузка…</div>
                  )}
                </div>
              </div>
              <button
                onClick={() => refreshBalance()}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
              >
                <RefreshCcw className="w-3 h-3" />
                Обновить
              </button>
            </div>

            {/* Параметры OpenRouter */}
            {serverSettings?.openrouter && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Base URL</label>
                  <input
                    type="text"
                    value={serverSettings.openrouter.base_url}
                    disabled
                    className="w-full px-2.5 py-1.5 bg-bg-primary border border-border-default rounded-md text-xs font-mono text-text-muted"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Timeout</label>
                  <input
                    type="text"
                    value={`${serverSettings.openrouter.timeout}с`}
                    disabled
                    className="w-full px-2.5 py-1.5 bg-bg-primary border border-border-default rounded-md text-xs font-mono text-text-muted"
                  />
                </div>
              </div>
            )}
          </SettingsSection>

          {/* ── 2. MCP сервер ── */}
          <SettingsSection
            icon={Server}
            iconColor="bg-accent-purple/10 text-accent-purple"
            title="MCP сервер"
            description="Подключение к серверу метаданных 1С"
          >
            {loadingServer ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-accent-blue animate-spin" />
              </div>
            ) : serverSettings?.mcp ? (
              <>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border-default bg-bg-primary">
                  <div className="flex items-center gap-2.5">
                    <Server className="w-4 h-4 text-accent-purple" />
                    <div>
                      <div className="text-sm text-text-primary font-medium">
                        {serverSettings.mcp.url}
                      </div>
                      <div className="text-[11px] text-text-muted">
                        Timeout: {serverSettings.mcp.timeout}с
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Wifi className="w-3.5 h-3.5 text-accent-green" />
                    <span className="text-accent-green">Настроен</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-text-muted text-center py-4">
                <AlertCircle className="w-5 h-5 mx-auto mb-1 text-text-muted" />
                Не удалось загрузить настройки MCP
              </div>
            )}
          </SettingsSection>

          {/* ── 3. Агент контекста ── */}
          <SettingsSection
            icon={Bot}
            iconColor="bg-accent-green/10 text-accent-green"
            title="Агент контекста"
            description="Agentic Context Loader для задач категории B"
          >
            {loadingServer ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-accent-blue animate-spin" />
              </div>
            ) : serverSettings?.agent ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Модель агента</label>
                    <input type="text" value={serverSettings.agent.model} disabled
                      className="w-full px-2.5 py-1.5 bg-bg-primary border border-border-default rounded-md text-xs font-mono text-text-muted" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Макс. итераций</label>
                    <input type="text" value={serverSettings.agent.max_iterations} disabled
                      className="w-full px-2.5 py-1.5 bg-bg-primary border border-border-default rounded-md text-xs font-mono text-text-muted" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Макс. объектов</label>
                    <input type="text" value={serverSettings.agent.max_objects} disabled
                      className="w-full px-2.5 py-1.5 bg-bg-primary border border-border-default rounded-md text-xs font-mono text-text-muted" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Макс. строк контекста</label>
                    <input type="text" value={serverSettings.agent.max_context_lines} disabled
                      className="w-full px-2.5 py-1.5 bg-bg-primary border border-border-default rounded-md text-xs font-mono text-text-muted" />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Лимит контекста</label>
                    <input type="text" value={`${serverSettings.agent.max_total_context_chars} симв.`} disabled
                      className="w-full px-2.5 py-1.5 bg-bg-primary border border-border-default rounded-md text-xs font-mono text-text-muted" />
                  </div>
                </div>

                {/* Кэш */}
                <div className="rounded-lg border border-border-default bg-bg-primary p-3">
                  <div className="text-xs font-medium text-text-secondary mb-2">Кэширование контекста</div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-text-muted">Включён: </span>
                      <span className={serverSettings.agent.cache.enabled ? 'text-accent-green' : 'text-accent-red'}>
                        {serverSettings.agent.cache.enabled ? 'Да' : 'Нет'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Папка: </span>
                      <span className="text-text-primary font-mono">{serverSettings.agent.cache.dir}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">TTL: </span>
                      <span className="text-text-primary font-mono">{serverSettings.agent.cache.ttl_hours}ч</span>
                    </div>
                  </div>
                </div>

                {/* Промпты агента */}
                <div>
                  <label className="block text-xs text-text-muted mb-1">Системный промпт агента</label>
                  <textarea value={serverSettings.agent.prompts.system} disabled rows={5}
                    className="w-full px-2.5 py-1.5 bg-bg-primary border border-border-default rounded-md text-xs font-mono text-text-muted resize-none" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Шаблон промпта агента</label>
                  <textarea value={serverSettings.agent.prompts.user_template} disabled rows={3}
                    className="w-full px-2.5 py-1.5 bg-bg-primary border border-border-default rounded-md text-xs font-mono text-text-muted resize-none" />
                </div>
              </>
            ) : (
              <div className="text-xs text-text-muted text-center py-4">
                <AlertCircle className="w-5 h-5 mx-auto mb-1 text-text-muted" />
                Не удалось загрузить настройки агента
              </div>
            )}
          </SettingsSection>

          {/* ── 4. Модели генерации ── */}
          <SettingsSection
            icon={Cpu}
            iconColor="bg-accent-blue/10 text-accent-blue"
            title="Модели генерации"
            description={`${models.filter(m => m.enabled).length} из ${models.length} активны`}
            defaultOpen
          >
            <div className="space-y-1.5">
              {models.map(model => (
                <label
                  key={model.id}
                  className={clsx(
                    'flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors',
                    model.enabled
                      ? 'bg-accent-blue/[0.03] border-accent-blue/20'
                      : 'bg-bg-primary border-border-default hover:bg-white/[0.02]'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={model.enabled}
                      onChange={() => toggleModel(model.id)}
                      className="w-3.5 h-3.5 rounded accent-accent-blue"
                    />
                    <div>
                      <div className="text-sm text-text-primary font-medium">{model.name}</div>
                      <div className="text-[10px] text-text-muted font-mono">{model.provider} · {model.id}</div>
                    </div>
                  </div>
                  <span
                    className={clsx(
                      'px-1.5 py-0.5 text-[9px] font-semibold rounded',
                      model.enabled
                        ? 'bg-accent-green/15 text-accent-green'
                        : 'bg-bg-overlay text-text-muted'
                    )}
                  >
                    {model.enabled ? 'Активна' : 'Выкл'}
                  </span>
                </label>
              ))}
            </div>
          </SettingsSection>

          {/* ── 5. Промпты ── */}
          <SettingsSection
            icon={FileText}
            iconColor="bg-accent-pink/10 text-accent-pink"
            title="Шаблоны промптов"
            description={`${prompts.length} промптов, активный: ${prompts.find(p => p.id === activePromptId)?.name ?? '—'}`}
          >
            <div className="space-y-2">
              {prompts.map(prompt => (
                <PromptEditor
                  key={prompt.id}
                  prompt={prompt}
                  isActive={activePromptId === prompt.id}
                  onActivate={() => setActivePrompt(prompt.id)}
                  onUpdate={updates => updatePrompt(prompt.id, updates)}
                  onDelete={() => deletePrompt(prompt.id)}
                />
              ))}
            </div>

            <button
              onClick={handleAddPrompt}
              className="flex items-center gap-1.5 w-full justify-center py-2 border border-dashed border-border-default rounded-lg text-xs text-text-muted hover:text-accent-blue hover:border-accent-blue/30 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Добавить промпт
            </button>
          </SettingsSection>

          {/* ── 7. Хеширование ── */}
          <SettingsSection
            icon={Hash}
            iconColor="bg-accent-green/10 text-accent-green"
            title="Хеширование"
            description="Настройки хеширования ответов для оценки детерминизма"
          >
            {serverSettings?.hashing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Алгоритм</label>
                  <input
                    type="text"
                    value={serverSettings.hashing.algorithm.toUpperCase()}
                    disabled
                    className="w-40 px-2.5 py-1.5 bg-bg-primary border border-border-default rounded-md text-xs font-mono text-text-muted"
                  />
                </div>
                <div className="flex items-center gap-6">
                  <Toggle
                    checked={serverSettings.hashing.normalize}
                    label="Нормализация (убрать пробелы/переносы)"
                  />
                  <Toggle
                    checked={serverSettings.hashing.extract_code}
                    label="Извлечение кода из markdown"
                  />
                </div>
              </div>
            ) : (
              <div className="text-xs text-text-muted text-center py-4">
                <Loader2 className="w-4 h-4 mx-auto mb-1 animate-spin" />
                Загрузка…
              </div>
            )}
          </SettingsSection>

        </div>
      </div>
    </div>
  );
}
