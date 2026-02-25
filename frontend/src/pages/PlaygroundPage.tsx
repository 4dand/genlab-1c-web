import { useState } from 'react';
import { Send, Loader2, Copy, Check, RotateCcw, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { generateCode, type GenerateResponse } from '@/api/client';
import { clsx } from 'clsx';

export function PlaygroundPage() {
  const { models, generationSettings, prompts, activePromptId } = useAppStore();

  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState(generationSettings.selectedModels[0] || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [genMeta, setGenMeta] = useState<GenerateResponse | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showModelSelect, setShowModelSelect] = useState(false);

  const activePrompt = prompts.find(p => p.id === activePromptId);
  const enabledModels = models.filter(m => m.enabled);
  const currentModel = models.find(m => m.id === selectedModel);

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedModel) return;

    setIsGenerating(true);
    setGeneratedCode('');
    setGenMeta(null);
    setGenError(null);

    const res = await generateCode({
      model_id: selectedModel,
      prompt: activePrompt
        ? activePrompt.userTemplate.replace('{prompt}', prompt)
        : prompt,
      system_prompt: activePrompt?.systemPrompt,
      temperature: generationSettings.temperature,
      max_tokens: generationSettings.maxTokens,
    });

    if (res.success && res.data) {
      setGeneratedCode(res.data.response);
      setGenMeta(res.data);
    } else {
      setGenError(res.error || 'Ошибка генерации');
    }

    setIsGenerating(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setPrompt('');
    setGeneratedCode('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-border-default bg-bg-secondary">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Генерация кода</h1>
          <p className="text-xs text-text-muted">Свободная генерация кода 1С из промпта</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Model selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelSelect(!showModelSelect)}
              className="flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary rounded-md text-sm hover:bg-bg-overlay transition-colors"
            >
              <span className="text-text-secondary">Модель:</span>
              <span className="text-text-primary font-medium">
                {currentModel?.name || 'Выберите'}
              </span>
              <ChevronDown className="w-4 h-4 text-text-muted" />
            </button>
            
            {showModelSelect && (
              <div className="absolute top-full right-0 mt-1 w-64 bg-bg-secondary border border-border-default rounded-lg shadow-lg z-10">
                {enabledModels.map(model => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model.id);
                      setShowModelSelect(false);
                    }}
                    className={clsx(
                      'w-full px-3 py-2 text-left text-sm hover:bg-bg-tertiary transition-colors',
                      selectedModel === model.id && 'bg-bg-tertiary'
                    )}
                  >
                    <div className="font-medium text-text-primary">{model.name}</div>
                    <div className="text-xs text-text-muted">{model.provider}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Temperature badge */}
          <div className="px-2 py-1 bg-bg-tertiary rounded text-xs text-text-muted">
            T={generationSettings.temperature}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Input panel */}
        <div className="w-1/2 flex flex-col border-r border-border-default">
          <div className="px-4 py-2 border-b border-border-muted bg-bg-secondary">
            <span className="text-xs text-text-muted">Промпт</span>
          </div>
          
          <div className="flex-1 p-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Опишите, какой код 1С вы хотите сгенерировать...

Например:
- Функция сортировки массива методом пузырька
- Процедура загрузки данных из Excel
- Запрос к регистру накопления с отбором по периоду"
              className="w-full h-full px-4 py-3 bg-bg-tertiary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-accent-blue"
            />
          </div>
          
          {/* Actions */}
          <div className="px-4 py-3 border-t border-border-muted flex items-center justify-between">
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Очистить
            </button>
            
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || !selectedModel || isGenerating}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                prompt.trim() && selectedModel && !isGenerating
                  ? 'bg-accent-blue text-white hover:bg-accent-blue/90'
                  : 'bg-bg-tertiary text-text-muted cursor-not-allowed'
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Генерация...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Сгенерировать
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Output panel */}
        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-2 border-b border-border-muted bg-bg-secondary flex items-center justify-between">
            <span className="text-xs text-text-muted">Результат</span>
            
            {generatedCode && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-accent-green" />
                    Скопировано
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Копировать
                  </>
                )}
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            {isGenerating ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-accent-blue animate-spin mx-auto mb-3" />
                  <p className="text-sm text-text-muted">Генерация кода...</p>
                  <p className="text-xs text-text-muted mt-1">{currentModel?.name}</p>
                </div>
              </div>
            ) : genError ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="text-4xl mb-3">⚠️</div>
                  <p className="text-sm text-accent-red font-medium mb-1">Ошибка генерации</p>
                  <p className="text-xs text-text-muted">{genError}</p>
                </div>
              </div>
            ) : generatedCode ? (
              <div className="flex flex-col h-full">
                <pre className="flex-1 font-mono text-sm text-text-primary whitespace-pre-wrap overflow-auto">
                  <code>{generatedCode}</code>
                </pre>
                {genMeta && (
                  <div className="mt-3 pt-3 border-t border-border-muted flex items-center gap-4 text-xs text-text-muted">
                    <span>⏱ {genMeta.elapsed_time.toFixed(2)}с</span>
                    <span>📥 {genMeta.tokens_input} tok</span>
                    <span>📤 {genMeta.tokens_output} tok</span>
                    <span>💰 ${genMeta.cost_total.toFixed(4)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-text-muted">
                  <p className="text-sm">Результат генерации появится здесь</p>
                  <p className="text-xs mt-1">Введите промпт и нажмите "Сгенерировать"</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
