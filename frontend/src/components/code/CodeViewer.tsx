import { useMemo } from 'react';
import { Copy, Check, Clock, Coins, Hash, Cpu, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

export interface CodeViewerMeta {
  taskId?: string;
  taskName?: string;
  modelId?: string;
  modelName?: string;
  runIndex?: number;
  totalRuns?: number;
  seed?: number | null;
  temperature?: number;
  tokensInput?: number;
  tokensOutput?: number;
  tokensTotal?: number;
  costTotal?: number;
  elapsedTime?: number;
  determinism?: {
    total_runs: number;
    unique_responses: number;
    match_rate: number;
  } | null;
  timestamp?: string;
}

interface CodeViewerProps {
  code: string;
  hash: string;
  meta?: CodeViewerMeta;
}

// Токенизация 1С кода (упрощённая)
function tokenize1CCode(code: string): { type: string; value: string }[] {
  const tokens: { type: string; value: string }[] = [];
  
  // Ключевые слова 1С
  const keywords = new Set([
    'Процедура', 'КонецПроцедуры', 'Функция', 'КонецФункции',
    'Если', 'Тогда', 'Иначе', 'ИначеЕсли', 'КонецЕсли',
    'Для', 'Каждого', 'Из', 'По', 'Цикл', 'КонецЦикла', 'Пока',
    'Попытка', 'Исключение', 'КонецПопытки', 'ВызватьИсключение',
    'Возврат', 'Прервать', 'Продолжить', 'Перейти',
    'И', 'Или', 'Не', 'Новый', 'Null', 'Неопределено',
    'Истина', 'Ложь', 'Экспорт', 'Знач', 'Перем',
    'Procedure', 'EndProcedure', 'Function', 'EndFunction',
    'If', 'Then', 'Else', 'ElsIf', 'EndIf',
    'For', 'Each', 'In', 'To', 'Do', 'While', 'EndDo',
    'Try', 'Except', 'EndTry', 'Raise',
    'Return', 'Break', 'Continue', 'Goto',
    'And', 'Or', 'Not', 'New', 'Undefined',
    'True', 'False', 'Export', 'Val', 'Var',
  ]);
  
  // Встроенные функции
  const builtins = new Set([
    'Сообщить', 'Строка', 'Число', 'Дата', 'Булево',
    'ТипЗнч', 'Тип', 'ЗначениеЗаполнено', 'НЕ',
    'СтрДлина', 'СтрНайти', 'Сред', 'Лев', 'Прав',
    'ВРег', 'НРег', 'СокрЛП', 'СокрЛ', 'СокрП',
    'Формат', 'ЧислоВСтроку', 'СтрокаВЧисло',
    'Массив', 'Структура', 'Соответствие', 'ТаблицаЗначений',
    'ДобавитьМесяц', 'НачалоМесяца', 'КонецМесяца',
    'НачалоГода', 'КонецГода', 'НачалоДня', 'КонецДня',
    'ТекущаяДата', 'Год', 'Месяц', 'День', 'Час', 'Минута', 'Секунда',
    'Message', 'String', 'Number', 'Date', 'Boolean',
    'TypeOf', 'Type', 'ValueIsFilled',
    'StrLen', 'StrFind', 'Mid', 'Left', 'Right',
    'Upper', 'Lower', 'TrimAll', 'TrimL', 'TrimR',
    'Format', 'NumberToString', 'StringToNumber',
    'Array', 'Structure', 'Map', 'ValueTable',
  ]);

  // Простой токенизатор
  const regex = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\d+(?:\.\d+)?)|([А-Яа-яA-Za-z_][А-Яа-яA-Za-z0-9_]*)|(\/{2}[^\n]*)|([+\-*\/=<>.,;:()[\]{}])|(\s+)/g;
  
  let match;
  while ((match = regex.exec(code)) !== null) {
    const [full, str, num, word, comment, op, space] = match;
    
    if (str) {
      tokens.push({ type: 'string', value: str });
    } else if (num) {
      tokens.push({ type: 'number', value: num });
    } else if (word) {
      if (keywords.has(word)) {
        tokens.push({ type: 'keyword', value: word });
      } else if (builtins.has(word)) {
        tokens.push({ type: 'builtin', value: word });
      } else {
        tokens.push({ type: 'variable', value: word });
      }
    } else if (comment) {
      tokens.push({ type: 'comment', value: comment });
    } else if (op) {
      tokens.push({ type: 'operator', value: op });
    } else if (space) {
      tokens.push({ type: 'space', value: space });
    } else {
      tokens.push({ type: 'text', value: full });
    }
  }
  
  return tokens;
}

// Рендеринг токена
function renderToken(token: { type: string; value: string }, index: number) {
  const classMap: Record<string, string> = {
    keyword: 'token-keyword',
    string: 'token-string',
    number: 'token-number',
    comment: 'token-comment',
    builtin: 'token-builtin',
    function: 'token-function',
    operator: 'token-operator',
    variable: 'token-variable',
  };
  
  const className = classMap[token.type] || '';
  
  return (
    <span key={index} className={className}>
      {token.value}
    </span>
  );
}

export function CodeViewer({ code, hash, meta }: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  
  // Извлекаем код из markdown-блока (```1c ... ```)
  const cleanCode = useMemo(() => {
    if (!code) return '';
    const match = code.match(/^```[\w]*\n([\s\S]*?)```\s*$/);
    return match ? match[1] : code;
  }, [code]);

  // Разбиваем на строки и токенизируем
  const lines = useMemo(() => {
    return cleanCode.split('\n').map(line => tokenize1CCode(line));
  }, [cleanCode]);

  /** Собираем текст для буфера обмена: заголовок-метка + ```1c ... ``` */
  const copyText = useMemo(() => {
    if (!cleanCode) return '';

    // Если метаданные недоступны — просто код
    if (!meta?.taskId) return cleanCode;

    const sep = '// ═══════════════════════════════════════════════════════════════';
    const lines: string[] = [
      sep,
      '// Автоматически сгенерированный код',
      '// AI-1C-Code-Generation-Benchmark',
      sep,
      '//',
    ];

    if (meta.taskId) {
      const taskLabel = meta.taskName
        ? `${meta.taskId.replace('_', '')} - ${meta.taskName}`
        : meta.taskId;
      lines.push(`// Задача: ${taskLabel}`);
    }
    if (meta.modelName) {
      const modelLabel = meta.modelId
        ? `${meta.modelName} (${meta.modelId})`
        : meta.modelName;
      lines.push(`// Модель: ${modelLabel}`);
    }
    if (meta.runIndex != null) {
      lines.push(`// Прогон: ${meta.runIndex + 1}`);
    }
    if (meta.temperature != null) {
      lines.push(`// Temperature: ${meta.temperature}`);
    }
    if (hash) {
      lines.push(`// Hash: ${hash}`);
    }
    if (meta.timestamp) {
      lines.push(`// Время: ${meta.timestamp}`);
    }

    lines.push('//');
    lines.push(sep);
    lines.push('');
    lines.push(cleanCode.replace(/\n$/, ''));

    return lines.join('\n');
  }, [cleanCode, meta, hash]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!cleanCode) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted">
        Нет кода для отображения
      </div>
    );
  }

  const hasMeta = meta && (meta.taskId || meta.modelName || meta.tokensTotal);

  return (
    <div className="h-full flex flex-col bg-bg-primary overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-muted bg-bg-secondary flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted font-mono">
            {hash?.slice(0, 8)}
          </span>
          <span className="text-xs text-text-muted">
            • {lines.length} строк
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {hasMeta && (
            <button
              onClick={() => setMetaOpen(!metaOpen)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Метаданные</span>
              {metaOpen
                ? <ChevronUp className="w-3 h-3" />
                : <ChevronDown className="w-3 h-3" />
              }
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-accent-green" />
                <span>Скопировано</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Копировать</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Meta panel (collapsible) */}
      {hasMeta && metaOpen && (
        <div className="px-4 py-3 border-b border-border-muted bg-bg-secondary/60 flex-shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs">
            {meta.taskId && (
              <MetaItem icon={Hash} label="Задача" value={`${meta.taskId}${meta.taskName ? ` — ${meta.taskName}` : ''}`} />
            )}
            {meta.modelName && (
              <MetaItem icon={Cpu} label="Модель" value={`${meta.modelName}${meta.modelId ? ` (${meta.modelId})` : ''}`} />
            )}
            {meta.runIndex != null && (
              <MetaItem icon={Layers} label="Прогон" value={`${meta.runIndex + 1}${meta.totalRuns ? ` из ${meta.totalRuns}` : ''}`} />
            )}
            {meta.seed != null && (
              <MetaItem icon={Hash} label="Seed" value={String(meta.seed)} />
            )}
            {meta.temperature != null && (
              <MetaItem icon={Hash} label="Temperature" value={String(meta.temperature)} />
            )}
            {(meta.tokensTotal != null && meta.tokensTotal > 0) && (
              <MetaItem
                icon={Coins}
                label="Токены"
                value={`${meta.tokensTotal?.toLocaleString('ru-RU')}${meta.tokensInput != null ? ` (↓${meta.tokensInput.toLocaleString('ru-RU')} ↑${(meta.tokensOutput ?? 0).toLocaleString('ru-RU')})` : ''}`}
              />
            )}
            {(meta.costTotal != null && meta.costTotal > 0) && (
              <MetaItem icon={Coins} label="Стоимость" value={`$${meta.costTotal.toFixed(4)}`} />
            )}
            {(meta.elapsedTime != null && meta.elapsedTime > 0) && (
              <MetaItem icon={Clock} label="Время" value={`${meta.elapsedTime.toFixed(2)} сек`} />
            )}
            {meta.determinism && (
              <MetaItem
                icon={Hash}
                label="Детерминизм"
                value={`${(meta.determinism.match_rate * 100).toFixed(0)}% (${meta.determinism.unique_responses} уник. из ${meta.determinism.total_runs})`}
                highlight={meta.determinism.match_rate >= 1 ? 'green' : meta.determinism.match_rate >= 0.5 ? 'yellow' : 'red'}
              />
            )}
          </div>
        </div>
      )}
      
      {/* Code content */}
      <div className="flex-1 overflow-auto font-mono text-code min-h-0">
        <pre className="min-w-full">
          <code>
            {lines.map((lineTokens, lineIndex) => (
              <div key={lineIndex} className="flex hover:bg-bg-secondary/50">
                <span className="code-line-number">
                  {lineIndex + 1}
                </span>
                <span className="flex-1 px-4 py-0.5">
                  {lineTokens.map((token, tokenIndex) => 
                    renderToken(token, tokenIndex)
                  )}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

/* ─── Meta item ─── */
function MetaItem({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: 'green' | 'yellow' | 'red';
}) {
  return (
    <div className="flex items-start gap-1.5 min-w-0">
      <Icon className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-px" />
      <div className="min-w-0">
        <span className="text-text-muted">{label}: </span>
        <span
          className={clsx(
            'font-medium',
            highlight === 'green' && 'text-accent-green',
            highlight === 'yellow' && 'text-accent-yellow',
            highlight === 'red' && 'text-accent-red',
            !highlight && 'text-text-secondary'
          )}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
