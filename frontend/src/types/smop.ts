import type { SMOPCriterion } from './index';

// Критерии SMOP с описаниями уровней
// Соответствует configs/smop_criteria.yaml
export const SMOP_CRITERIA: SMOPCriterion[] = [
  {
    id: 'S',
    name: 'Syntax',
    description: 'Синтаксическая корректность кода 1С:Предприятие',
    levels: [
      { value: 10, label: 'Отлично', description: 'Код полностью синтаксически корректен, компилируется без ошибок и предупреждений' },
      { value: 8, label: 'Хорошо', description: 'Минимальные синтаксические недочёты, легко исправимые' },
      { value: 6, label: 'Приемлемо', description: 'Есть синтаксические ошибки, но структура кода понятна' },
      { value: 4, label: 'Слабо', description: 'Множественные синтаксические ошибки, требуется существенная доработка' },
      { value: 2, label: 'Плохо', description: 'Критические синтаксические ошибки, код нерабочий' },
      { value: 0, label: 'Провал', description: 'Код не является кодом 1С или полностью нечитаем' },
    ],
  },
  {
    id: 'M',
    name: 'Meaning',
    description: 'Семантическая корректность — соответствие логики кода требованиям задания',
    levels: [
      { value: 10, label: 'Отлично', description: 'Логика полностью соответствует заданию, все требования выполнены' },
      { value: 8, label: 'Хорошо', description: 'Логика в целом верна, незначительные отклонения от требований' },
      { value: 6, label: 'Приемлемо', description: 'Основная логика верна, но есть пропуски или неточности' },
      { value: 4, label: 'Слабо', description: 'Частично верная логика, существенные отклонения от задания' },
      { value: 2, label: 'Плохо', description: 'Логика не соответствует заданию, код делает не то что требуется' },
      { value: 0, label: 'Провал', description: 'Код не имеет отношения к заданию' },
    ],
  },
  {
    id: 'O',
    name: 'Optimization',
    description: 'Качество кода: читаемость, эффективность, идиоматичность',
    levels: [
      { value: 10, label: 'Отлично', description: 'Оптимальный, читаемый, идиоматичный код без избыточности' },
      { value: 8, label: 'Хорошо', description: 'Хороший код с минимальными возможностями улучшения' },
      { value: 6, label: 'Приемлемо', description: 'Рабочий код, но есть возможности оптимизации' },
      { value: 4, label: 'Слабо', description: 'Неэффективный код, плохая читаемость' },
      { value: 2, label: 'Плохо', description: 'Очень неэффективный, нечитаемый код' },
      { value: 0, label: 'Провал', description: 'Код невозможно использовать' },
    ],
  },
  {
    id: 'P',
    name: 'Platform',
    description: 'Соответствие идиомам и практикам платформы 1С:Предприятие',
    levels: [
      { value: 10, label: 'Отлично', description: 'Полное соответствие стандартам 1С, использование типовых паттернов' },
      { value: 8, label: 'Хорошо', description: 'Хорошее знание платформы, минимальные отклонения от стандартов' },
      { value: 6, label: 'Приемлемо', description: 'Базовое понимание платформы, но есть нетипичные решения' },
      { value: 4, label: 'Слабо', description: 'Слабое понимание платформы, много нетипичных конструкций' },
      { value: 2, label: 'Плохо', description: 'Код не учитывает специфику платформы 1С' },
      { value: 0, label: 'Провал', description: 'Код написан без понимания 1С' },
    ],
  },
];

// Цвета для значений SMOP
export const SMOP_COLORS: Record<number, string> = {
  10: '#3fb950', // excellent - зелёный
  8: '#7ee787',  // good - светло-зелёный
  6: '#d29922',  // acceptable - жёлтый
  4: '#db6d28',  // weak - оранжевый
  2: '#f85149',  // bad - красный
  0: '#6e7681',  // fail - серый
};

// Метки для значений
export const SMOP_LABELS: Record<number, string> = {
  10: 'Отлично',
  8: 'Хорошо',
  6: 'Приемлемо',
  4: 'Слабо',
  2: 'Плохо',
  0: 'Провал',
};

// Пороги качества
export const QUALITY_THRESHOLDS = {
  high: 8,       // Q >= 8 - высокое качество
  acceptable: 5, // Q >= 5 - приемлемое качество
  low: 0,        // Q < 5 - низкое качество
};

// Функция для вычисления Q
export function calculateQ(scores: { S: number; M: number; O: number; P: number }): number {
  return (scores.S + scores.M + scores.O + scores.P) / 4;
}

// Функция для определения цвета по значению Q
export function getQualityColor(q: number): string {
  if (q >= QUALITY_THRESHOLDS.high) return SMOP_COLORS[10];
  if (q >= QUALITY_THRESHOLDS.acceptable) return SMOP_COLORS[6];
  return SMOP_COLORS[2];
}

// Функция для определения метки качества
export function getQualityLabel(q: number): string {
  if (q >= QUALITY_THRESHOLDS.high) return 'Высокое качество';
  if (q >= QUALITY_THRESHOLDS.acceptable) return 'Приемлемое качество';
  return 'Низкое качество';
}
