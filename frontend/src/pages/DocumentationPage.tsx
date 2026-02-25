import { BookOpen, Target, BarChart3, Layers, Cpu, Shield, Zap, Award } from 'lucide-react';
import { clsx } from 'clsx';

// ─── Таблица критериев ───

function CriteriaTable({
  title,
  metric,
  color,
  rows,
}: {
  title: string;
  metric: string;
  color: string;
  rows: { score: number; description: string }[];
}) {
  return (
    <div className="rounded-lg border border-border-default overflow-hidden">
      <div className={clsx('px-4 py-2.5 flex items-center gap-2.5', color)}>
        <span className="text-sm font-bold text-white w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
          {metric}
        </span>
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-default bg-bg-secondary">
            <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted w-16">Балл</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted">Критерий</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.score}
              className={clsx(
                'border-b border-border-muted last:border-0',
                i % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary/50'
              )}
            >
              <td className="px-4 py-2.5">
                <span
                  className={clsx(
                    'inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold',
                    row.score >= 8
                      ? 'bg-accent-green/15 text-accent-green'
                      : row.score >= 4
                        ? 'bg-accent-yellow/15 text-accent-yellow'
                        : 'bg-accent-red/15 text-accent-red'
                  )}
                >
                  {row.score}
                </span>
              </td>
              <td className="px-4 py-2.5 text-text-secondary text-[13px] leading-relaxed">
                {row.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Карточка-секция ───

function DocSection({
  icon: Icon,
  iconColor,
  title,
  children,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border-muted flex items-center gap-3">
        <div className={clsx('p-2 rounded-lg', iconColor)}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Страница документации
// ═══════════════════════════════════════════════════════════════════════

const syntaxRows = [
  { score: 10, description: 'Код компилируется без ошибок и предупреждений' },
  { score: 8, description: 'Код компилируется, присутствуют 1–2 незначительных предупреждения' },
  { score: 6, description: 'Код компилируется после исправления 1–2 очевидных опечаток' },
  { score: 4, description: 'Требуется исправление 3–5 синтаксических ошибок' },
  { score: 2, description: 'Требуется исправление более 5 ошибок, однако общая структура кода понятна' },
  { score: 0, description: 'Код не компилируется, требуется существенная переработка' },
];

const meaningRows = [
  { score: 10, description: 'Код полностью выполняет поставленную задачу, все требования реализованы' },
  { score: 8, description: 'Основная логика реализована верно, не выполнено одно второстепенное требование' },
  { score: 6, description: 'Основная логика верна, не реализованы 2–3 требования или не обработаны краевые случаи' },
  { score: 4, description: 'Реализована только часть требуемой логики (более 50%)' },
  { score: 2, description: 'Реализовано менее 50% требуемой логики' },
  { score: 0, description: 'Код не выполняет поставленную задачу' },
];

const optimizationRows = [
  { score: 10, description: 'Код соответствует стандартам разработки 1С, оптимален по производительности' },
  { score: 8, description: 'Незначительные отклонения от стандартов, не влияющие на производительность' },
  { score: 6, description: 'Код работоспособен, но имеются явные возможности оптимизации' },
  { score: 4, description: 'Присутствуют неэффективные решения: запросы в цикле, избыточные обращения к БД' },
  { score: 2, description: 'Множественные антипаттерны, код будет работать неприемлемо медленно' },
  { score: 0, description: 'Критические проблемы производительности или архитектуры решения' },
];

const platformRows = [
  { score: 10, description: 'Все объекты метаданных и методы платформы использованы корректно' },
  { score: 8, description: 'Присутствуют 1–2 неточности в именах реквизитов или методов, легко исправимые' },
  { score: 6, description: 'Допущены ошибки в работе с типами данных или структурой объектов конфигурации' },
  { score: 4, description: 'Использованы несуществующие реквизиты, регистры или методы (до 30% обращений)' },
  { score: 2, description: 'Более 30% обращений к несуществующим объектам метаданных или методам платформы' },
  { score: 0, description: 'Код построен на полностью вымышленной структуре конфигурации' },
];

export function DocumentationPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="px-6 py-3 flex items-center gap-3 border-b border-border-default bg-bg-secondary flex-shrink-0">
        <BookOpen className="w-4 h-4 text-text-muted" />
        <span className="text-sm text-text-muted">Документация платформы</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0">
        <div className="max-w-5xl mx-auto p-6 space-y-5">

          {/* ── О платформе ── */}
          <DocSection
            icon={Layers}
            iconColor="bg-accent-blue/10 text-accent-blue"
            title="О платформе GenLab-1C"
          >
            <div className="space-y-3 text-[13px] text-text-secondary leading-relaxed">
              <p>
                <span className="font-semibold text-text-primary">GenLab-1C</span> — платформа для проведения
                бенчмарков генерации кода на языке 1С:Предприятие 8.3 с использованием больших языковых моделей (LLM).
                Платформа позволяет автоматически отправлять задачи на генерацию кода через OpenRouter API,
                собирать результаты и проводить экспертную оценку качества сгенерированного кода по методике SMOP.
              </p>
              <p>
                Ключевая особенность — поддержка <span className="font-semibold text-accent-purple">Model Context Protocol (MCP)</span>,
                позволяющего предоставлять LLM актуальную информацию о структуре метаданных конкретной
                конфигурации 1С. Это даёт возможность исследовать влияние контекстной информации на качество
                генерации доменно-специфичного кода.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border-default bg-bg-primary p-3 text-center">
                  <div className="text-2xl font-bold text-accent-blue">A</div>
                  <div className="text-xs text-text-muted mt-1">Категория задач</div>
                  <div className="text-[11px] text-text-muted mt-0.5">Без контекста MCP</div>
                </div>
                <div className="rounded-lg border border-border-default bg-bg-primary p-3 text-center">
                  <div className="text-2xl font-bold text-accent-purple">B</div>
                  <div className="text-xs text-text-muted mt-1">Категория задач</div>
                  <div className="text-[11px] text-text-muted mt-0.5">С контекстом MCP</div>
                </div>
                <div className="rounded-lg border border-border-default bg-bg-primary p-3 text-center">
                  <div className="text-2xl font-bold text-accent-green">SMOP</div>
                  <div className="text-xs text-text-muted mt-1">Методика оценки</div>
                  <div className="text-[11px] text-text-muted mt-0.5">4 метрики × 6 уровней</div>
                </div>
              </div>
            </div>
          </DocSection>

          {/* ── Методика SMOP ── */}
          <DocSection
            icon={Target}
            iconColor="bg-accent-green/10 text-accent-green"
            title="Методика оценки SMOP"
          >
            <div className="space-y-4 text-[13px] text-text-secondary leading-relaxed">
              <p>
                Для оценки качества сгенерированного кода разработана система из четырёх метрик,
                образующих аббревиатуру <span className="font-bold text-text-primary">SMOP</span>:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { letter: 'S', name: 'Syntax', ru: 'Синтаксическая корректность', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Shield },
                  { letter: 'M', name: 'Meaning', ru: 'Семантическая корректность', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: Target },
                  { letter: 'O', name: 'Optimization', ru: 'Оптимальность', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Zap },
                  { letter: 'P', name: 'Platform', ru: 'Платформенная интеграция', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: Cpu },
                ].map(m => (
                  <div key={m.letter} className={clsx('rounded-lg border p-3 text-center', m.color)}>
                    <m.icon className="w-5 h-5 mx-auto mb-1.5 opacity-80" />
                    <div className="text-xl font-extrabold">{m.letter}</div>
                    <div className="text-[11px] font-medium mt-1">{m.name}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{m.ru}</div>
                  </div>
                ))}
              </div>

              <p>
                Выбор именно этих четырёх критериев обусловлен спецификой платформы 1С:Предприятие как
                доменно-специфичной среды.
              </p>

              <ul className="space-y-2 pl-1">
                <li className="flex gap-2">
                  <span className="font-bold text-blue-400 w-4 flex-shrink-0">S</span>
                  <span>Является базовым критерием — код, содержащий синтаксические ошибки, не может быть исполнен платформой.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-emerald-400 w-4 flex-shrink-0">M</span>
                  <span>Отражает понимание моделью поставленной задачи.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-amber-400 w-4 flex-shrink-0">O</span>
                  <span>Дополняет картину, оценивая не только работоспособность, но и качество решения с точки зрения опытного разработчика.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-purple-400 w-4 flex-shrink-0">P</span>
                  <span>Ключевая метрика — демонстрирует способность модели работать с конкретной конфигурацией. Именно по этой метрике ожидается наибольший прирост при использовании MCP.</span>
                </li>
              </ul>
            </div>
          </DocSection>

          {/* ── Шкала оценивания ── */}
          <DocSection
            icon={BarChart3}
            iconColor="bg-accent-yellow/10 text-accent-yellow"
            title="Дискретная шкала оценивания"
          >
            <div className="space-y-4 text-[13px] text-text-secondary leading-relaxed">
              <p>
                Каждая метрика оценивается по дискретной шкале от <span className="font-semibold text-text-primary">0</span> до <span className="font-semibold text-text-primary">10</span> баллов
                с шагом 2 балла:
              </p>

              <div className="flex items-center gap-2 justify-center py-2">
                {[0, 2, 4, 6, 8, 10].map(v => (
                  <div
                    key={v}
                    className={clsx(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border',
                      v >= 8
                        ? 'bg-accent-green/10 text-accent-green border-accent-green/20'
                        : v >= 4
                          ? 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20'
                          : 'bg-accent-red/10 text-accent-red border-accent-red/20'
                    )}
                  >
                    {v}
                  </div>
                ))}
              </div>

              <p>
                Чётная шкала исключает возможность присвоения «среднего» значения и требует от эксперта
                однозначного решения о качестве кода. Шаг в 2 балла выбран намеренно: он вынуждает эксперта
                принимать однозначное решение, избегая соблазна поставить «среднюю» оценку.
              </p>

              <p>
                Для каждого балла определены конкретные критерии, что снижает субъективность экспертной оценки
                и обеспечивает воспроизводимость результатов.
              </p>
            </div>
          </DocSection>

          {/* ── Таблицы критериев ── */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-text-primary px-1">Критерии оценки по метрикам</h2>

            <CriteriaTable
              title="Синтаксическая корректность"
              metric="S"
              color="bg-gradient-to-r from-blue-600 to-blue-500"
              rows={syntaxRows}
            />

            <CriteriaTable
              title="Семантическая корректность"
              metric="M"
              color="bg-gradient-to-r from-emerald-600 to-emerald-500"
              rows={meaningRows}
            />

            <CriteriaTable
              title="Оптимальность"
              metric="O"
              color="bg-gradient-to-r from-amber-600 to-amber-500"
              rows={optimizationRows}
            />

            <CriteriaTable
              title="Платформенная интеграция"
              metric="P"
              color="bg-gradient-to-r from-purple-600 to-purple-500"
              rows={platformRows}
            />
          </div>

          {/* ── Интегральный показатель Q ── */}
          <DocSection
            icon={Award}
            iconColor="bg-accent-pink/10 text-accent-pink"
            title="Интегральный показатель качества Q"
          >
            <div className="space-y-4 text-[13px] text-text-secondary leading-relaxed">
              <p>
                Итоговая оценка качества сгенерированного кода рассчитывается как среднее арифметическое
                четырёх метрик:
              </p>

              <div className="bg-bg-primary border border-border-default rounded-lg p-4 text-center">
                <div className="text-lg font-mono font-bold text-text-primary">
                  Q = (S + M + O + P) / 4
                </div>
                <div className="text-[11px] text-text-muted mt-1">
                  Равные веса — консервативное допущение при отсутствии эмпирических данных
                </div>
              </div>

              <p>
                Интегральный показатель Q принимает значения от 0 до 10 и интерпретируется следующим образом:
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-accent-green/20 bg-accent-green/5 p-3 text-center">
                  <div className="text-lg font-bold text-accent-green">Q ≥ 8</div>
                  <div className="text-xs text-text-muted mt-1">Высокое качество</div>
                  <div className="text-[11px] text-text-muted mt-0.5">Пригоден с минимальными доработками</div>
                </div>
                <div className="rounded-lg border border-accent-yellow/20 bg-accent-yellow/5 p-3 text-center">
                  <div className="text-lg font-bold text-accent-yellow">5 ≤ Q {'<'} 8</div>
                  <div className="text-xs text-text-muted mt-1">Приемлемое качество</div>
                  <div className="text-[11px] text-text-muted mt-0.5">Требуется доработка</div>
                </div>
                <div className="rounded-lg border border-accent-red/20 bg-accent-red/5 p-3 text-center">
                  <div className="text-lg font-bold text-accent-red">Q {'<'} 5</div>
                  <div className="text-xs text-text-muted mt-1">Низкое качество</div>
                  <div className="text-[11px] text-text-muted mt-0.5">Существенная переработка</div>
                </div>
              </div>

              <div className="bg-bg-primary border border-border-default rounded-lg p-4 text-xs text-text-muted">
                <span className="font-semibold text-text-secondary">Валидация шкалы: </span>
                проводилась в ходе пилотного оценивания с участием трёх экспертов — разработчиков 1С
                с опытом от 2 лет. По результатам пилотной сессии в описания были внесены уточнения,
                направленные на повышение однозначности интерпретации.
              </div>
            </div>
          </DocSection>

        </div>
      </div>
    </div>
  );
}
