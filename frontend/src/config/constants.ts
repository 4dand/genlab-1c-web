/**
 * Centralized configuration constants.
 * Single source of truth for values used across multiple files.
 */

export const API_BASE = '/api/v1';

export const AUTH_STORAGE_KEY = 'genlab-auth';

export const DIFFICULTY_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  easy:   { bg: 'bg-accent-green/10',  text: 'text-accent-green',  label: 'Простая' },
  medium: { bg: 'bg-accent-yellow/10', text: 'text-accent-yellow', label: 'Средняя' },
  hard:   { bg: 'bg-accent-red/10',    text: 'text-accent-red',    label: 'Сложная' },
};

export const GENERATION_DEFAULTS = {
  temperature: 0.0,
  maxTokens: 4096,
  runsPerTask: 3,
} as const;
