import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ListTodo,
  ClipboardCheck,
  BarChart3,
  Settings,
  Users,
  LogOut,
  User,
  Bell,
  HelpCircle,
  BookOpen,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  Server
} from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';

const navigation = [
  { 
    name: 'Эксперименты', 
    href: '/queue', 
    icon: ListTodo, 
    description: 'Создание и запуск экспериментов',
    badge: null,
    gradient: 'from-amber-500 to-orange-500'
  },
  {
    name: 'Экспертиза кода',
    href: '/evaluation',
    icon: ClipboardCheck,
    description: 'Экспертная оценка SMOP',
    badge: null,
    gradient: 'from-emerald-500 to-teal-500'
  },
  { 
    name: 'Статистика', 
    href: '/statistics', 
    icon: BarChart3, 
    description: 'Анализ результатов',
    badge: null,
    gradient: 'from-sky-500 to-blue-500'
  },
  { 
    name: 'Настройки', 
    href: '/settings', 
    icon: Settings, 
    description: 'Параметры системы',
    badge: null,
    gradient: 'from-slate-400 to-zinc-500'
  },
  {
    name: 'Документация',
    href: '/docs',
    icon: BookOpen,
    description: 'Методика оценки SMOP',
    badge: null,
    gradient: 'from-indigo-400 to-violet-500'
  },
];

// Пункты навигации только для администраторов
const adminNavigation: typeof navigation = [
  {
    name: 'Эксперты',
    href: '/experts',
    icon: Users,
    description: 'Управление экспертами и доступом',
    badge: null,
    gradient: 'from-fuchsia-500 to-pink-500'
  },
];

/* ─── Sidebar Navigation Item ─── */
function NavItem({ item, collapsed }: { item: typeof navigation[0]; collapsed: boolean }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(item.href);
  
  return (
    <NavLink
      to={item.href}
      title={collapsed ? item.name : undefined}
      className={clsx(
        'group relative flex items-center rounded-lg transition-all duration-200',
        collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
        isActive 
          ? 'bg-white/[0.08] text-text-primary shadow-sm' 
          : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
      )}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-accent-blue to-accent-purple" />
      )}
      
      {/* Icon with gradient background on active */}
      <div className={clsx(
        'flex items-center justify-center flex-shrink-0 rounded-md transition-all duration-200',
        collapsed ? 'w-9 h-9' : 'w-8 h-8',
        isActive 
          ? `bg-gradient-to-br ${item.gradient} shadow-lg shadow-accent-blue/20` 
          : 'bg-transparent group-hover:bg-white/[0.06]'
      )}>
        <item.icon className={clsx(
          'transition-colors duration-200',
          collapsed ? 'w-[18px] h-[18px]' : 'w-4 h-4',
          isActive ? 'text-white' : 'text-text-muted group-hover:text-text-secondary'
        )} />
      </div>
      
      {/* Label and badge */}
      {!collapsed && (
        <>
          <span className="flex-1 text-[13px] font-medium">{item.name}</span>
          {item.badge && (
            <span className={clsx(
              'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
              isActive 
                ? 'bg-accent-blue/20 text-accent-blue' 
                : 'bg-white/[0.06] text-text-muted'
            )}>
              {item.badge}
            </span>
          )}
        </>
      )}
      
      {/* Tooltip for collapsed state */}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-bg-overlay border border-border-default rounded-md text-xs text-text-primary whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 shadow-xl">
          {item.name}
          {item.badge && <span className="ml-1.5 text-text-muted">({item.badge})</span>}
        </div>
      )}
    </NavLink>
  );
}

/* ─── User Menu Dropdown ─── */
function UserMenu({ collapsed }: { collapsed: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const displayName = user?.full_name?.trim() || user?.username || '—';
  const roleLabel = user?.role === 'admin' ? 'Админ' : 'Эксперт';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center rounded-lg hover:bg-white/[0.04] transition-all duration-200 w-full',
          collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2'
        )}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center flex-shrink-0 ring-2 ring-white/10">
          <User className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="text-left min-w-0 flex-1">
            <div className="text-[13px] font-medium text-text-primary truncate">{displayName}</div>
            <div className="text-[10px] text-text-muted capitalize">
              {roleLabel}
            </div>
          </div>
        )}
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={clsx(
            'absolute bottom-full mb-2 w-56 bg-bg-secondary/95 backdrop-blur-xl border border-border-default rounded-xl shadow-2xl z-50 py-1 overflow-hidden',
            collapsed ? 'left-full ml-2 bottom-0' : 'left-0'
          )}>
            <div className="px-3 py-3 border-b border-border-muted bg-gradient-to-r from-accent-blue/5 to-accent-purple/5">
              <div className="text-sm font-medium text-text-primary">{displayName}</div>
              <div className="text-xs text-text-muted">@{user?.username}</div>
            </div>
            <div className="py-1">
              <NavLink 
                to="/settings" 
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-white/[0.04] hover:text-text-primary transition-colors"
              >
                <Settings className="w-4 h-4" />
                Настройки
              </NavLink>
              <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-white/[0.04] hover:text-text-primary transition-colors">
                <HelpCircle className="w-4 h-4" />
                Документация
              </button>
            </div>
            <div className="border-t border-border-muted py-1">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-accent-red hover:bg-accent-red/5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Выйти
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Connection Status Indicator ─── */
function ConnectionStatus({ collapsed }: { collapsed: boolean }) {
  const { apiConnected } = useAppStore();
  
  if (collapsed) {
    return (
      <div className="flex justify-center py-1 gap-1.5" title={apiConnected ? 'API подключено' : 'Нет соединения'}>
        <div className={clsx(
          'w-2 h-2 rounded-full',
          apiConnected ? 'bg-accent-green animate-pulse' : 'bg-accent-red'
        )} />
        <div className="w-2 h-2 rounded-full bg-accent-purple/60" title="MCP" />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-1 px-3 py-1.5 text-[11px]">
      <div className="flex items-center gap-2">
        {apiConnected ? (
          <>
            <Wifi className="w-3 h-3 text-accent-green" />
            <span className="text-text-muted">OpenRouter API</span>
            <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse ml-auto" />
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3 text-accent-red" />
            <span className="text-accent-red">API недоступно</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Server className="w-3 h-3 text-accent-purple" />
        <span className="text-text-muted">MCP сервер</span>
        <div className="w-1.5 h-1.5 rounded-full bg-accent-purple/60 ml-auto" />
      </div>
    </div>
  );
}

/* ─── Top Header Bar ─── */
function Header({ sidebarCollapsed: _sidebarCollapsed }: { sidebarCollapsed: boolean }) {
  const location = useLocation();
  const [isDark, setIsDark] = useState(true);
  
  const currentSection = [...navigation, ...adminNavigation].find(item => location.pathname.startsWith(item.href));

  return (
    <header className="h-14 bg-bg-secondary/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-5 flex-shrink-0 z-10">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-3">
        {currentSection && (
          <div className="flex items-center gap-2">
            <div className={clsx(
              'w-7 h-7 rounded-md bg-gradient-to-br flex items-center justify-center',
              currentSection.gradient
            )}>
              <currentSection.icon className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-text-primary leading-tight">
                {currentSection.name}
              </h1>
              <p className="text-[11px] text-text-muted leading-tight">
                {currentSection.description}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-white/[0.04] transition-colors text-text-muted hover:text-text-primary">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-red rounded-full ring-2 ring-bg-secondary" />
        </button>
        
        {/* Theme toggle */}
        <button 
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-lg hover:bg-white/[0.04] transition-colors text-text-muted hover:text-text-primary"
        >
          {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </button>
        
        {/* Version badge */}
        <div className="hidden lg:flex items-center ml-2 px-2 py-1 bg-white/[0.03] rounded-md text-[10px] text-text-muted font-mono">
          v1.0.0
        </div>
      </div>
    </header>
  );
}

/* ─── Main App Layout ─── */
export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const role = useAuthStore((s) => s.user?.role);
  const navItems = role === 'admin' ? [...navigation, ...adminNavigation] : navigation;

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      {/* ── Sidebar ── */}
      <aside 
        className={clsx(
          'flex-shrink-0 bg-bg-secondary/60 backdrop-blur-sm border-r border-white/[0.06] flex flex-col transition-all duration-300 relative',
          sidebarCollapsed ? 'w-[68px]' : 'w-[240px]'
        )}
      >
        {/* Logo area */}
        <div className={clsx(
          'h-14 flex items-center border-b border-white/[0.06] flex-shrink-0',
          sidebarCollapsed ? 'justify-center px-2' : 'px-4 gap-3'
        )}>
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-accent-blue via-accent-purple to-accent-pink flex items-center justify-center flex-shrink-0 shadow-lg shadow-accent-purple/20">
            <span className="text-[11px] font-extrabold text-white tracking-tight">1С</span>
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple opacity-40 animate-ping" style={{ animationDuration: '3s' }} />
          </div>
          
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-text-primary tracking-tight">
                GenLab-1C
              </div>
              <div className="text-[10px] text-text-muted font-medium">
                Экспертная оценка SMOP
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation section label */}
        {!sidebarCollapsed && (
          <div className="px-4 pt-5 pb-2">
            <span className="text-[10px] font-semibold text-text-muted/60 uppercase tracking-[0.08em]">
              Навигация
            </span>
          </div>
        )}
        
        {/* Navigation links */}
        <nav className={clsx(
          'flex-1 space-y-0.5 overflow-y-auto',
          sidebarCollapsed ? 'px-2 pt-4' : 'px-3'
        )}>
          {navItems.map((item) => (
            <NavItem key={item.href} item={item} collapsed={sidebarCollapsed} />
          ))}
        </nav>
        
        {/* Sidebar bottom section */}
        <div className={clsx(
          'border-t border-white/[0.06] flex flex-col gap-1',
          sidebarCollapsed ? 'p-2' : 'p-3'
        )}>
          <ConnectionStatus collapsed={sidebarCollapsed} />
          <UserMenu collapsed={sidebarCollapsed} />
        </div>
        
        {/* Collapse toggle button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-bg-secondary border border-white/[0.08] rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all z-20 shadow-lg"
        >
          {sidebarCollapsed 
            ? <ChevronRight className="w-3 h-3" /> 
            : <ChevronLeft className="w-3 h-3" />
          }
        </button>
      </aside>
      
      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header sidebarCollapsed={sidebarCollapsed} />
        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
