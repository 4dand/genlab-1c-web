import { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, Users, FileCode, ChevronDown, Loader2, Download, RefreshCcw, BarChart3, ImageDown } from 'lucide-react';
import { getExperiments, getStatistics, exportReport, getChartSvg, type ExperimentListItem, type ChartType } from '@/api/client';
import { clsx } from 'clsx';
import { SMOP_COLORS } from '@/types/smop';

// ── Типы, соответствующие реальному ответу бекенда ──

interface MetricStats {
  mean: number;
  std: number;
  median: number;
  min: number;
  max: number;
  count: number;
  ci_lower?: number;
  ci_upper?: number;
}

interface OverallQ extends MetricStats {
  ci_lower: number;
  ci_upper: number;
}

interface BackendModelStats {
  model_id: string;
  model_name: string;
  tasks_count: number;
  runs_count: number;
  S: MetricStats;
  M: MetricStats;
  O: MetricStats;
  P: MetricStats;
  Q: MetricStats & { ci_lower: number; ci_upper: number };
  determinism_mean: number;
}

interface BackendTaskStats {
  task_id: string;
  task_name: string;
  models_count: number;
  runs_count: number;
  Q: MetricStats & { ci_lower: number; ci_upper: number };
  by_model: Record<string, MetricStats & { ci_lower: number; ci_upper: number }>;
}

interface BackendStatsData {
  summary: {
    overall_Q: OverallQ;
    by_metric: Record<string, MetricStats>;
    total_evaluated: number;
    total_runs: number;
    determinism: { mean: number; std: number };
  };
  by_model: BackendModelStats[];
  by_task: BackendTaskStats[];
  correlation_det_quality: number;
  // Возможные статусы
  status?: string;
  message?: string;
}

// ── SVG Графики ──

function BarChartSMOP({ models }: { models: BackendModelStats[] }) {
  if (!models.length) return null;
  const metrics = ['S', 'M', 'O', 'P'] as const;
  const colors = { S: '#58a6ff', M: '#3fb950', O: '#d29922', P: '#bc8cff' };
  const barW = 16;
  const gap = 4;
  const groupW = metrics.length * (barW + gap) + 20;
  const chartW = Math.max(400, models.length * groupW + 60);
  const chartH = 240;
  const maxVal = 10;

  return (
    <svg viewBox={`0 0 ${chartW} ${chartH + 50}`} className="w-full h-full">
      {/* Y-axis */}
      {[0, 2, 4, 6, 8, 10].map(v => {
        const y = chartH - (v / maxVal) * chartH + 10;
        return (
          <g key={v}>
            <line x1="40" y1={y} x2={chartW} y2={y} stroke="rgba(255,255,255,0.06)" />
            <text x="35" y={y + 4} textAnchor="end" fill="#6e7681" fontSize="10">{v}</text>
          </g>
        );
      })}

      {/* Bars */}
      {models.map((m, mi) => {
        const groupX = 50 + mi * groupW;
        return (
          <g key={m.model_id}>
            {metrics.map((metric, idx) => {
              const val = m[metric]?.mean ?? 0;
              const h = (val / maxVal) * chartH;
              const x = groupX + idx * (barW + gap);
              const y = chartH - h + 10;
              return (
                <g key={metric}>
                  <rect x={x} y={y} width={barW} height={h} fill={colors[metric]} rx={3} opacity={0.85} />
                  <text x={x + barW / 2} y={y - 4} textAnchor="middle" fill="#c9d1d9" fontSize="9">
                    {val.toFixed(1)}
                  </text>
                </g>
              );
            })}
            <text
              x={groupX + (metrics.length * (barW + gap)) / 2}
              y={chartH + 28}
              textAnchor="middle"
              fill="#8b949e"
              fontSize="10"
            >
              {m.model_name.length > 15 ? m.model_name.slice(0, 15) + '…' : m.model_name}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      {metrics.map((metric, i) => (
        <g key={metric} transform={`translate(${50 + i * 60}, ${chartH + 42})`}>
          <rect width={10} height={10} fill={colors[metric]} rx={2} />
          <text x={14} y={9} fill="#8b949e" fontSize="10">{metric}</text>
        </g>
      ))}
    </svg>
  );
}

function RadarChart({ models }: { models: BackendModelStats[] }) {
  if (!models.length) return null;
  const metrics = ['S', 'M', 'O', 'P'] as const;
  const modelColors = ['#58a6ff', '#3fb950', '#d29922', '#bc8cff', '#f85149'];
  const cx = 150, cy = 130, r = 100;

  const angleStep = (2 * Math.PI) / metrics.length;
  const pointAt = (angle: number, val: number) => ({
    x: cx + Math.cos(angle - Math.PI / 2) * (val / 10) * r,
    y: cy + Math.sin(angle - Math.PI / 2) * (val / 10) * r,
  });

  return (
    <svg viewBox="0 0 300 280" className="w-full h-full">
      {/* Grid circles */}
      {[2, 4, 6, 8, 10].map(v => (
        <circle key={v} cx={cx} cy={cy} r={(v / 10) * r} fill="none" stroke="rgba(255,255,255,0.06)" />
      ))}

      {/* Axes */}
      {metrics.map((_, i) => {
        const p = pointAt(i * angleStep, 10);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.1)" />;
      })}

      {/* Axis labels */}
      {metrics.map((m, i) => {
        const p = pointAt(i * angleStep, 11.5);
        return <text key={m} x={p.x} y={p.y} textAnchor="middle" fill="#c9d1d9" fontSize="12" fontWeight="600">{m}</text>;
      })}

      {/* Model polygons */}
      {models.map((model, mi) => {
        const points = metrics.map((m, i) => {
          const val = model[m]?.mean ?? 0;
          return pointAt(i * angleStep, val);
        });
        const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + 'Z';
        const color = modelColors[mi % modelColors.length];
        return (
          <g key={model.model_id}>
            <path d={path} fill={color} fillOpacity={0.1} stroke={color} strokeWidth={2} />
            {points.map((p, i) => (
              <circle key={`${model.model_id}-${metrics[i]}`} cx={p.x} cy={p.y} r={3} fill={color} />
            ))}
          </g>
        );
      })}

      {/* Legend */}
      {models.map((m, i) => (
        <g key={m.model_id} transform={`translate(10, ${250 + i * 16})`}>
          <rect width={10} height={10} fill={modelColors[i % modelColors.length]} rx={2} />
          <text x={14} y={9} fill="#8b949e" fontSize="10">{m.model_name}</text>
        </g>
      ))}
    </svg>
  );
}

function QualityBar({ value, label }: { value: number; label: string }) {
  const v = value ?? 0;
  const pct = Math.min(v / 10, 1);
  const color = v >= 8 ? SMOP_COLORS[10] : v >= 5 ? SMOP_COLORS[6] : SMOP_COLORS[2];
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-text-secondary w-36 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-5 bg-bg-tertiary rounded-full overflow-hidden max-w-sm">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-mono text-text-primary w-12 text-right">{v.toFixed(2)}</span>
    </div>
  );
}

function HeatmapChart({ tasks, models }: { tasks: BackendTaskStats[]; models: BackendModelStats[] }) {
  if (!tasks.length || !models.length) return null;

  const getCellStyle = (q: number): { bg: string; text: string } => {
    if (q >= 8) return { bg: 'rgba(63,185,80,0.45)', text: '#c9d1d9' };
    if (q >= 6) return { bg: 'rgba(210,153,34,0.4)', text: '#c9d1d9' };
    if (q >= 4) return { bg: 'rgba(219,109,40,0.35)', text: '#c9d1d9' };
    if (q >= 2) return { bg: 'rgba(248,81,73,0.35)', text: '#c9d1d9' };
    return { bg: 'rgba(110,118,129,0.2)', text: '#6e7681' };
  };

  return (
    <table className="w-full border-separate" style={{ borderSpacing: '4px' }}>
      <thead>
        <tr>
          <th className="w-20" />
          {models.map(m => (
            <th
              key={m.model_id}
              className="text-xs font-medium text-text-muted pb-2 text-center"
            >
              {m.model_name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tasks.map(task => (
          <tr key={task.task_id}>
            <td className="text-xs text-text-muted text-right pr-2 font-mono whitespace-nowrap">
              {task.task_id}
            </td>
            {models.map(model => {
              const data = task.by_model?.[model.model_id];
              const q = data?.mean ?? 0;
              const style = getCellStyle(q);
              return (
                <td
                  key={`${task.task_id}-${model.model_id}`}
                  className="text-center rounded-md font-semibold text-sm py-2.5"
                  style={{ backgroundColor: style.bg, color: style.text }}
                >
                  {q > 0 ? q.toFixed(1) : '—'}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Карточка графика с кнопкой экспорта SVG ──

function ChartCard({
  title,
  chartType,
  experimentId,
  children,
  className,
}: {
  title: string;
  chartType: ChartType;
  experimentId: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadSvg = useCallback(async () => {
    setDownloading(true);
    try {
      const blob = await getChartSvg(experimentId, chartType);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${experimentId}_${chartType}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setDownloading(false);
    }
  }, [experimentId, chartType]);

  return (
    <div className={clsx('bg-bg-secondary border border-border-default rounded-lg', className)}>
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="font-semibold text-text-primary">{title}</h3>
        <button
          onClick={handleDownloadSvg}
          disabled={downloading}
          className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-accent-blue hover:bg-bg-tertiary rounded-md transition-colors disabled:opacity-50"
          title="Экспорт SVG (matplotlib)"
        >
          {downloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ImageDown className="w-3.5 h-3.5" />
          )}
          SVG
        </button>
      </div>
      <div className="px-4 pb-4">
        {children}
      </div>
    </div>
  );
}

// ── Основная страница ──

export function StatisticsPage() {
  const [experiments, setExperiments] = useState<ExperimentListItem[]>([]);
  const [selectedExp, setSelectedExp] = useState<string>('');
  const [showExpSelect, setShowExpSelect] = useState(false);
  const [stats, setStats] = useState<BackendStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузить список экспериментов
  useEffect(() => {
    getExperiments().then(res => {
      if (res.success && res.data) {
        setExperiments(res.data);
        if (res.data.length > 0 && !selectedExp) {
          setSelectedExp(res.data[0].id);
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Загрузить статистику выбранного эксперимента
  useEffect(() => {
    if (!selectedExp) return;
    setIsLoading(true);
    setError(null);
    getStatistics(selectedExp).then(res => {
      if (res.success && res.data) {
        const d = res.data as unknown as BackendStatsData;
        if (d.status === 'no_evaluation') {
          setError(d.message || 'Оценки SMOP ещё не выставлены');
          setStats(null);
        } else {
          setStats(d);
        }
      } else {
        setError(res.error || 'Не удалось загрузить статистику');
        setStats(null);
      }
      setIsLoading(false);
    });
  }, [selectedExp]);

  const modelStats = useMemo(() => stats?.by_model || [], [stats]);
  const taskStats = useMemo(() => stats?.by_task || [], [stats]);
  const summary = stats?.summary;

  const handleRefresh = () => {
    if (!selectedExp) return;
    const current = selectedExp;
    setSelectedExp('');
    setTimeout(() => setSelectedExp(current), 0);
  };

  const handleExport = async (format: 'json' | 'html' | 'latex') => {
    if (!selectedExp) return;
    const blob = await exportReport(selectedExp, format);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedExp}_report.${format === 'latex' ? 'tex' : format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-border-default bg-bg-secondary flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Experiment selector */}
          <div className="relative">
            <button
              onClick={() => setShowExpSelect(!showExpSelect)}
              className="flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary border border-border-default rounded-md text-sm hover:bg-bg-overlay transition-colors"
            >
              <span className="text-text-muted text-xs">Эксперимент:</span>
              <span className="text-text-primary font-mono text-xs">
                {selectedExp || 'Выберите'}
              </span>
              <ChevronDown className={clsx('w-3.5 h-3.5 text-text-muted transition-transform', showExpSelect && 'rotate-180')} />
            </button>

            {showExpSelect && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-bg-secondary border border-border-default rounded-lg shadow-xl z-50 max-h-64 overflow-auto">
                {experiments.map(exp => (
                  <button
                    key={exp.id}
                    onClick={() => {
                      setSelectedExp(exp.id);
                      setShowExpSelect(false);
                    }}
                    className={clsx(
                      'w-full px-3 py-2 text-left text-xs hover:bg-bg-overlay transition-colors',
                      selectedExp === exp.id && 'bg-accent-blue/10 text-accent-blue'
                    )}
                  >
                    <div className="font-mono">{exp.id}</div>
                    <div className="text-text-muted mt-0.5">
                      Кат. {exp.category} · задач: {exp.tasks_count} · моделей: {exp.models.length}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleRefresh}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
            title="Обновить"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Export */}
        <div className="flex items-center gap-1">
          {(['json', 'html', 'latex'] as const).map(fmt => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
            >
              <Download className="w-3 h-3" />
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0">
        <div className="max-w-6xl mx-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-text-muted mb-2">{error}</p>
                <p className="text-xs text-text-muted">Сначала выполните оценку на странице «Экспертиза кода»</p>
              </div>
            </div>
          ) : stats && summary ? (
            <div className="space-y-6">
              {/* Stats cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent-blue/10 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-accent-blue" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-text-primary">
                        {summary.overall_Q.mean.toFixed(2)}
                      </div>
                      <div className="text-xs text-text-muted">Средний Q</div>
                    </div>
                  </div>
                </div>

                <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent-purple/10 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-accent-purple" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-text-primary">
                        ±{summary.overall_Q.std.toFixed(2)}
                      </div>
                      <div className="text-xs text-text-muted">σ (стд. откл.)</div>
                    </div>
                  </div>
                </div>

                <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent-green/10 rounded-lg">
                      <FileCode className="w-5 h-5 text-accent-green" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-text-primary">
                        {summary.total_evaluated}/{summary.total_runs}
                      </div>
                      <div className="text-xs text-text-muted">Оценено / Всего</div>
                    </div>
                  </div>
                </div>

                <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent-yellow/10 rounded-lg">
                      <Users className="w-5 h-5 text-accent-yellow" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-text-primary">
                        [{summary.overall_Q.ci_lower.toFixed(1)}, {summary.overall_Q.ci_upper.toFixed(1)}]
                      </div>
                      <div className="text-xs text-text-muted">95% ДИ</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Model comparison bars + Radar */}
              <div className="grid grid-cols-2 gap-4">
                <ChartCard title="SMOP по моделям" chartType="models_comparison" experimentId={selectedExp}>
                  <div className="h-72">
                    <BarChartSMOP models={modelStats} />
                  </div>
                </ChartCard>

                <ChartCard title="Радарная диаграмма" chartType="radar" experimentId={selectedExp}>
                  <div className="h-72">
                    <RadarChart models={modelStats} />
                  </div>
                </ChartCard>
              </div>

              {/* Q by model */}
              <ChartCard title="Интегральный Q по моделям" chartType="q_by_model" experimentId={selectedExp}>
                <div className="space-y-3">
                  {modelStats.map(m => (
                    <QualityBar key={m.model_id} label={m.model_name} value={m.Q.mean} />
                  ))}
                </div>
              </ChartCard>

              {/* Determinism */}
              <ChartCard title="Детерминизм моделей" chartType="det_vs_quality" experimentId={selectedExp}>
                <div className="space-y-3">
                  {modelStats.map(m => (
                    <div key={m.model_id} className="flex items-center gap-3">
                      <span className="text-sm text-text-secondary w-36 shrink-0 truncate">{m.model_name}</span>
                      <div className="flex-1 h-5 bg-bg-tertiary rounded-full overflow-hidden max-w-sm">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(m.determinism_mean, 100)}%`,
                            backgroundColor: m.determinism_mean >= 80 ? '#3fb950' : m.determinism_mean >= 50 ? '#d29922' : '#f85149',
                          }}
                        />
                      </div>
                      <span className="text-sm font-mono text-text-primary w-16 text-right">
                        {m.determinism_mean.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </ChartCard>

              {/* Heatmap */}
              {taskStats.length > 0 && (
                <ChartCard title="Тепловая карта: задачи × модели (Q)" chartType="heatmap" experimentId={selectedExp}>
                  <div className="overflow-x-auto">
                    <HeatmapChart tasks={taskStats} models={modelStats} />
                  </div>
                </ChartCard>
              )}

              {/* Correlation */}
              {stats.correlation_det_quality != null && (
                <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <h3 className="font-semibold text-text-primary">Корреляция детерминизм ↔ качество</h3>
                    <span className="text-lg font-mono font-bold text-accent-blue">
                      r = {stats.correlation_det_quality.toFixed(3)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-text-muted">
              Выберите эксперимент для просмотра статистики
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
