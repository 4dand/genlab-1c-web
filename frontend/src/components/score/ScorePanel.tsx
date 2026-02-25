import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { useEvaluationStore } from '@/store/evaluationStore';
import { SMOP_CRITERIA, SMOP_COLORS, calculateQ, getQualityColor, getQualityLabel } from '@/types/smop';
import type { SMOPValue, SMOPScores, RunEvaluation } from '@/types';
import { Save, RotateCcw, HelpCircle, Info } from 'lucide-react';

interface ScorePanelProps {
  evaluation: RunEvaluation | undefined;
  runIndex: number;
}

// Кнопка выбора оценки
function ScoreButton({ 
  value, 
  selected, 
  onClick 
}: { 
  value: SMOPValue; 
  selected: boolean; 
  onClick: () => void;
}) {
  const color = SMOP_COLORS[value];
  
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-10 h-8 rounded-md text-sm font-mono font-medium transition-all',
        'border-2',
        selected 
          ? 'scale-110 shadow-lg' 
          : 'opacity-60 hover:opacity-100 hover:scale-105'
      )}
      style={{
        backgroundColor: selected ? color : 'transparent',
        borderColor: color,
        color: selected ? '#0d1117' : color,
      }}
    >
      {value}
    </button>
  );
}

// Ряд оценок для одного критерия
function CriterionRow({
  criterion,
  value,
  onChange,
  showHelp
}: {
  criterion: typeof SMOP_CRITERIA[0];
  value: SMOPValue | null;
  onChange: (value: SMOPValue) => void;
  showHelp: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="py-3 border-b border-border-muted last:border-b-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-accent-blue">{criterion.id}</span>
          <span className="text-sm text-text-primary">{criterion.name}</span>
          
          {showHelp && (
            <button 
              className="text-text-muted hover:text-text-secondary"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {value !== null && (
          <span 
            className="text-xs font-mono px-2 py-0.5 rounded"
            style={{ 
              backgroundColor: `${SMOP_COLORS[value]}20`,
              color: SMOP_COLORS[value] 
            }}
          >
            {value}/10
          </span>
        )}
      </div>
      
      {showTooltip && (
        <div className="mb-2 p-2 bg-bg-tertiary rounded text-xs text-text-secondary">
          {criterion.description}
        </div>
      )}
      
      <div className="flex items-center gap-1.5">
        {([10, 8, 6, 4, 2, 0] as SMOPValue[]).map((score) => (
          <ScoreButton
            key={score}
            value={score}
            selected={value === score}
            onClick={() => onChange(score)}
          />
        ))}
      </div>
    </div>
  );
}

// Индикатор качества Q
function QualityIndicator({ scores }: { scores: SMOPScores | null }) {
  if (!scores) {
    return (
      <div className="p-4 bg-bg-tertiary rounded-lg text-center">
        <div className="text-2xl text-text-muted">—</div>
        <div className="text-xs text-text-muted mt-1">Оцените все критерии</div>
      </div>
    );
  }
  
  const q = scores.Q;
  const color = getQualityColor(q);
  const label = getQualityLabel(q);
  
  return (
    <div className="p-4 bg-bg-tertiary rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-text-muted mb-1">Интегральная оценка</div>
          <div 
            className="text-3xl font-bold font-mono"
            style={{ color }}
          >
            Q = {q.toFixed(2)}
          </div>
          <div className="text-sm mt-1" style={{ color }}>
            {label}
          </div>
        </div>
        
        <div className="text-right text-xs text-text-muted">
          <div>S = {scores.S}</div>
          <div>M = {scores.M}</div>
          <div>O = {scores.O}</div>
          <div>P = {scores.P}</div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3 h-2 bg-bg-primary rounded-full overflow-hidden">
        <div 
          className="h-full transition-all duration-300 rounded-full"
          style={{ 
            width: `${(q / 10) * 100}%`,
            backgroundColor: color 
          }}
        />
      </div>
    </div>
  );
}

export function ScorePanel({ evaluation, runIndex }: ScorePanelProps) {
  const { updateRunScore, saveEvaluation } = useEvaluationStore();
  
  // Локальное состояние для редактирования
  const [localScores, setLocalScores] = useState<{
    S: SMOPValue | null;
    M: SMOPValue | null;
    O: SMOPValue | null;
    P: SMOPValue | null;
  }>({
    S: evaluation?.scores?.S ?? null,
    M: evaluation?.scores?.M ?? null,
    O: evaluation?.scores?.O ?? null,
    P: evaluation?.scores?.P ?? null,
  });
  
  const [comment, setComment] = useState(evaluation?.comment || '');
  const [showHelp, setShowHelp] = useState(true);

  // Синхронизация localScores и comment при смене evaluation (переключение задачи/рана)
  useEffect(() => {
    setLocalScores({
      S: evaluation?.scores?.S ?? null,
      M: evaluation?.scores?.M ?? null,
      O: evaluation?.scores?.O ?? null,
      P: evaluation?.scores?.P ?? null,
    });
    setComment(evaluation?.comment || '');
  }, [evaluation]);

  // Вычисляем Q если все оценки заполнены
  const allScoresSet = localScores.S !== null && localScores.M !== null && 
                       localScores.O !== null && localScores.P !== null;
  
  const computedScores: SMOPScores | null = allScoresSet ? {
    S: localScores.S!,
    M: localScores.M!,
    O: localScores.O!,
    P: localScores.P!,
    Q: calculateQ(localScores as { S: number; M: number; O: number; P: number }),
  } : null;
  
  // Обработчик изменения оценки
  const handleScoreChange = (criterion: 'S' | 'M' | 'O' | 'P', value: SMOPValue) => {
    setLocalScores(prev => ({ ...prev, [criterion]: value }));
  };
  
  // Сохранение
  const handleSave = () => {
    if (computedScores) {
      updateRunScore(runIndex, computedScores, comment);
      saveEvaluation();
    }
  };
  
  // Сброс
  const handleReset = () => {
    setLocalScores({ S: null, M: null, O: null, P: null });
    setComment('');
  };
  
  // Проверка на изменения
  const hasChanges = 
    localScores.S !== (evaluation?.scores?.S ?? null) ||
    localScores.M !== (evaluation?.scores?.M ?? null) ||
    localScores.O !== (evaluation?.scores?.O ?? null) ||
    localScores.P !== (evaluation?.scores?.P ?? null) ||
    comment !== (evaluation?.comment || '');

  return (
    <div className="h-full flex flex-col bg-bg-secondary overflow-hidden min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-text-primary">SMOP Оценка</h3>
          <span className="text-xs text-text-muted">Run {runIndex + 1}</span>
        </div>
        
        <button
          onClick={() => setShowHelp(!showHelp)}
          className={clsx(
            'p-1.5 rounded-md transition-colors',
            showHelp ? 'bg-accent-blue/20 text-accent-blue' : 'hover:bg-bg-tertiary text-text-muted'
          )}
          title="Показать подсказки"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
      
      {/* Quality indicator */}
      <div className="p-4 flex-shrink-0">
        <QualityIndicator scores={computedScores} />
      </div>
      
      {/* Criteria */}
      <div className="flex-1 overflow-y-auto px-4 min-h-0">
        {SMOP_CRITERIA.map((criterion) => (
          <CriterionRow
            key={criterion.id}
            criterion={criterion}
            value={localScores[criterion.id]}
            onChange={(value) => handleScoreChange(criterion.id, value)}
            showHelp={showHelp}
          />
        ))}
      </div>
      
      {/* Comment */}
      <div className="p-4 border-t border-border-muted flex-shrink-0">
        <label className="block text-sm text-text-secondary mb-2">
          Комментарий эксперта
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Опишите причины оценки, найденные проблемы, рекомендации..."
          className="w-full h-24 px-3 py-2 bg-bg-primary border border-border-default rounded-md text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-accent-blue"
        />
      </div>
      
      {/* Actions */}
      <div className="p-4 border-t border-border-default flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleSave}
          disabled={!allScoresSet}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            allScoresSet && hasChanges
              ? 'bg-accent-green text-bg-primary hover:bg-accent-green/90'
              : 'bg-bg-tertiary text-text-muted cursor-not-allowed'
          )}
        >
          <Save className="w-4 h-4" />
          Сохранить
        </button>
        
        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-md text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
