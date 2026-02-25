import { useState } from 'react';
import { Plus, Trash2, Save, FileText } from 'lucide-react';
import { useAppStore, PromptConfig } from '@/store/appStore';
import { clsx } from 'clsx';

function PromptEditor({ prompt, onUpdate, onDelete }: { 
  prompt: PromptConfig; 
  onUpdate: (updates: Partial<PromptConfig>) => void;
  onDelete: () => void;
}) {
  const [localPrompt, setLocalPrompt] = useState(prompt);
  const hasChanges = JSON.stringify(localPrompt) !== JSON.stringify(prompt);

  return (
    <div className="border border-border-default rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-bg-secondary flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-accent-blue" />
          <input
            type="text"
            value={localPrompt.name}
            onChange={(e) => setLocalPrompt({ ...localPrompt, name: e.target.value })}
            className="bg-transparent text-text-primary font-medium border-none outline-none"
          />
          <span className={clsx(
            'px-2 py-0.5 text-xs rounded',
            localPrompt.category === 'A' ? 'bg-accent-blue/20 text-accent-blue' :
            localPrompt.category === 'B' ? 'bg-accent-purple/20 text-accent-purple' :
            'bg-bg-tertiary text-text-muted'
          )}>
            {localPrompt.category === 'A' ? 'Категория A' :
             localPrompt.category === 'B' ? 'Категория B' : 'Кастомный'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={() => onUpdate(localPrompt)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-accent-green text-bg-primary rounded hover:bg-accent-green/90 transition-colors"
            >
              <Save className="w-3 h-3" />
              Сохранить
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 text-text-muted hover:text-accent-red hover:bg-bg-tertiary rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            Системный промпт
          </label>
          <textarea
            value={localPrompt.systemPrompt}
            onChange={(e) => setLocalPrompt({ ...localPrompt, systemPrompt: e.target.value })}
            rows={6}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-md text-sm font-mono resize-none focus:outline-none focus:border-accent-blue"
          />
        </div>
        
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            Шаблон пользовательского промпта
            <span className="text-text-muted ml-2">(используйте {'{prompt}'} для подстановки)</span>
          </label>
          <textarea
            value={localPrompt.userTemplate}
            onChange={(e) => setLocalPrompt({ ...localPrompt, userTemplate: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border-default rounded-md text-sm font-mono resize-none focus:outline-none focus:border-accent-blue"
          />
        </div>
        
        <div>
          <label className="block text-sm text-text-secondary mb-2">Категория</label>
          <div className="flex gap-2">
            {(['A', 'B', 'custom'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setLocalPrompt({ ...localPrompt, category: cat })}
                className={clsx(
                  'px-3 py-1.5 text-sm rounded-md transition-colors',
                  localPrompt.category === cat
                    ? 'bg-accent-blue text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-bg-overlay'
                )}
              >
                {cat === 'A' ? 'Категория A' : cat === 'B' ? 'Категория B' : 'Кастомный'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PromptsPage() {
  const { prompts, activePromptId, addPrompt, updatePrompt, deletePrompt, setActivePrompt } = useAppStore();

  const handleAddPrompt = () => {
    addPrompt({
      name: 'Новый промпт',
      category: 'custom',
      systemPrompt: 'Ты — эксперт по разработке на платформе 1С:Предприятие 8.3.',
      userTemplate: '{prompt}',
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-border-default bg-bg-secondary">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Настройка промптов</h1>
          <p className="text-xs text-text-muted">Системные и пользовательские промпты для генерации</p>
        </div>
        
        <button
          onClick={handleAddPrompt}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue text-white text-sm font-medium rounded-md hover:bg-accent-blue/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Новый промпт
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl space-y-4">
          {/* Active prompt selector */}
          <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
            <label className="block text-sm text-text-secondary mb-2">
              Активный промпт для генерации
            </label>
            <div className="flex flex-wrap gap-2">
              {prompts.map(prompt => (
                <button
                  key={prompt.id}
                  onClick={() => setActivePrompt(prompt.id)}
                  className={clsx(
                    'px-3 py-1.5 text-sm rounded-md transition-colors border',
                    activePromptId === prompt.id
                      ? 'bg-accent-blue text-white border-accent-blue'
                      : 'bg-bg-tertiary text-text-secondary border-border-default hover:border-accent-blue'
                  )}
                >
                  {prompt.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Prompt list */}
          {prompts.map(prompt => (
            <PromptEditor
              key={prompt.id}
              prompt={prompt}
              onUpdate={(updates) => updatePrompt(prompt.id, updates)}
              onDelete={() => deletePrompt(prompt.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
