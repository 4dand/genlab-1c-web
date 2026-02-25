import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function LoginPage() {
  const { login, isLoading, error, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Already logged in (or just logged in) — leave the login screen.
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await login(username, password);
    if (ok) {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary">
            GenLab-1C
          </h1>
          <p className="text-sm text-text-muted mt-1">
            SMOP Expert Platform
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-bg-secondary border border-white/[0.06] rounded-xl p-6 space-y-4"
        >
          <div>
            <label className="block text-xs text-text-muted mb-1.5">
              Логин
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-bg-primary border border-white/[0.08] rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue/50"
              placeholder="username"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-bg-primary border border-white/[0.08] rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue/50"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}
