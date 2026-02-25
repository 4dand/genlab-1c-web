import { 
  MessageSquare, 
  Download, 
  BarChart3,
  LogOut,
} from 'lucide-react';
import { useEvaluationStore } from '@/store/evaluationStore';
import { useAuthStore } from '@/store/authStore';
import { clsx } from 'clsx';

export function Header() {
  const { 
    experiment, 
    toggleChat, 
    isChatOpen,
  } = useEvaluationStore();

  const { user, logout } = useAuthStore();

  return (
    <div className="h-12 bg-bg-secondary/60 backdrop-blur-sm border-b border-white/[0.06] flex items-center justify-between px-4 flex-shrink-0">
      {/* Left section — Experiment info */}
      <div className="flex items-center gap-3">
        {experiment && (
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.04] rounded-lg border border-white/[0.06]">
              <span className="text-[11px] text-text-muted">Эксперимент:</span>
              <span className="text-[12px] text-text-primary font-mono font-medium">
                {experiment.experiment_id}
              </span>
            </div>
            <span className="px-2 py-0.5 bg-accent-blue/10 text-accent-blue text-[11px] font-semibold rounded-md border border-accent-blue/20">
              Кат. {experiment.category}
            </span>
          </div>
        )}
      </div>

      {/* Right section — Actions */}
      <div className="flex items-center gap-1.5">
        <button 
          className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-white/[0.04] rounded-lg transition-colors text-text-secondary text-[12px]"
          title="Статистика"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Статистика</span>
        </button>

        <button 
          className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-white/[0.04] rounded-lg transition-colors text-text-secondary text-[12px]"
          title="Экспорт"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Экспорт</span>
        </button>

        <div className="w-px h-4 bg-white/[0.06] mx-1" />

        <button 
          onClick={toggleChat}
          className={clsx(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors text-[12px]',
            isChatOpen 
              ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20' 
              : 'hover:bg-white/[0.04] text-text-secondary'
          )}
          title="Чат экспертов"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Чат</span>
        </button>

        {/* User badge + logout */}
        {user && (
          <div className="flex items-center gap-1.5 ml-2 pl-2.5 border-l border-white/[0.06]">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center">
              <span className="text-[9px] font-bold text-white">
                {user.full_name?.charAt(0) || user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-[12px] text-text-secondary">
              {user.full_name || user.username}
            </span>
            <span className="text-[10px] text-text-muted px-1.5 py-0.5 bg-white/[0.04] rounded">
              {user.role === 'admin' ? 'Админ' : 'Эксперт'}
            </span>
            <button
              onClick={logout}
              className="ml-1 p-1 hover:bg-white/[0.04] rounded transition-colors text-text-muted hover:text-text-secondary"
              title="Выйти"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
