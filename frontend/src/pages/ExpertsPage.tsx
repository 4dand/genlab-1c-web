import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  Users,
  UserPlus,
  Loader2,
  RefreshCcw,
  UserX,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  getUsers,
  createUser,
  deleteUser,
  type AppUser,
} from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { clsx } from 'clsx';

const inputCls =
  'w-full px-3 py-2 bg-bg-primary border border-white/[0.08] rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue/50';

function RoleBadge({ role }: { role: 'admin' | 'expert' }) {
  const isAdmin = role === 'admin';
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
        isAdmin
          ? 'bg-accent-purple/15 text-accent-purple'
          : 'bg-accent-blue/15 text-accent-blue'
      )}
    >
      {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <Users className="w-3 h-3" />}
      {isAdmin ? 'Админ' : 'Эксперт'}
    </span>
  );
}

export function ExpertsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Форма создания
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'expert' | 'admin'>('expert');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const res = await getUsers();
    if (res.success && res.data) {
      setUsers(res.data);
    } else {
      setLoadError(res.error || 'Не удалось загрузить пользователей');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (username.trim().length < 3) {
      setFormError('Логин должен быть не короче 3 символов');
      return;
    }
    if (password.length < 4) {
      setFormError('Пароль должен быть не короче 4 символов');
      return;
    }

    setSubmitting(true);
    const res = await createUser({
      username: username.trim(),
      password,
      role,
      full_name: fullName.trim(),
    });
    setSubmitting(false);

    if (res.success) {
      setFormSuccess(`Пользователь «${username.trim()}» создан`);
      setUsername('');
      setPassword('');
      setFullName('');
      setRole('expert');
      load();
    } else {
      setFormError(res.error || 'Не удалось создать пользователя');
    }
  };

  const handleDeactivate = async (u: AppUser) => {
    if (!window.confirm(`Деактивировать пользователя «${u.username}»?`)) return;
    const res = await deleteUser(u.id);
    if (res.success) {
      load();
    } else {
      setLoadError(res.error || 'Не удалось деактивировать пользователя');
    }
  };

  // Не-админам страница недоступна
  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <ShieldAlert className="w-10 h-10 text-accent-yellow" />
          <h2 className="text-lg font-semibold text-text-primary">Доступ ограничен</h2>
          <p className="text-sm text-text-muted">
            Управление экспертами доступно только пользователям с ролью «Админ».
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Эксперты и пользователи</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Создание учётных записей экспертов и управление доступом
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary border border-border-default rounded-lg hover:bg-bg-tertiary transition-colors"
        >
          <RefreshCcw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          Обновить
        </button>
      </div>

      {/* Форма создания */}
      <div className="bg-bg-secondary border border-border-default rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-4 h-4 text-accent-blue" />
          <h2 className="text-sm font-semibold text-text-primary">Добавить пользователя</h2>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Логин *</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className={inputCls}
                placeholder="ivanov"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Пароль *</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputCls}
                placeholder="минимум 4 символа"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">ФИО</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className={inputCls}
                placeholder="Иванов Иван Иванович"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Роль</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as 'expert' | 'admin')}
                className={inputCls}
              >
                <option value="expert">Эксперт</option>
                <option value="admin">Админ</option>
              </select>
            </div>
          </div>

          {formError && (
            <div className="flex items-center gap-2 text-xs text-accent-red bg-accent-red/10 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="flex items-center gap-2 text-xs text-accent-green bg-accent-green/10 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              {formSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Создать
          </button>
        </form>
      </div>

      {/* Таблица пользователей */}
      <div className="bg-bg-secondary border border-border-default rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border-muted flex items-center gap-2">
          <Users className="w-4 h-4 text-text-muted" />
          <h2 className="text-sm font-semibold text-text-primary">
            Пользователи {users.length > 0 && <span className="text-text-muted">({users.length})</span>}
          </h2>
        </div>

        {loadError && (
          <div className="flex items-center gap-2 text-xs text-accent-red bg-accent-red/10 m-4 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12 text-text-muted">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-text-muted text-sm">Пользователей нет</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-muted border-b border-border-muted">
                <th className="px-5 py-2.5 font-medium">Логин</th>
                <th className="px-5 py-2.5 font-medium">ФИО</th>
                <th className="px-5 py-2.5 font-medium">Роль</th>
                <th className="px-5 py-2.5 font-medium">Статус</th>
                <th className="px-5 py-2.5 font-medium">Создан</th>
                <th className="px-5 py-2.5 font-medium text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isSelf = u.id === user?.id;
                return (
                  <tr
                    key={u.id}
                    className={clsx(
                      'border-b border-border-muted last:border-0 hover:bg-bg-tertiary/40 transition-colors',
                      !u.is_active && 'opacity-50'
                    )}
                  >
                    <td className="px-5 py-3 font-mono text-text-primary">
                      {u.username}
                      {isSelf && <span className="ml-2 text-[10px] text-text-muted">(вы)</span>}
                    </td>
                    <td className="px-5 py-3 text-text-secondary">{u.full_name || '—'}</td>
                    <td className="px-5 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-5 py-3">
                      {u.is_active ? (
                        <span className="text-xs text-accent-green">активен</span>
                      ) : (
                        <span className="text-xs text-text-muted">деактивирован</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-text-muted text-xs">
                      {new Date(u.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {u.is_active && !isSelf && (
                        <button
                          onClick={() => handleDeactivate(u)}
                          title="Деактивировать"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-accent-red hover:bg-accent-red/10 rounded-md transition-colors"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Деактивировать
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
