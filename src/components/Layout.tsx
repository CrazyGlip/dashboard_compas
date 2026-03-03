import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    GraduationCap,
    BookOpen,
    CalendarDays,
    Newspaper,
    Video,
    HelpCircle,
    Briefcase,
    LayoutDashboard,
    LogOut
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth, type Role } from '../contexts/AuthContext';

interface NavItem {
  to: string;
  icon: any;
  label: string;
  roles?: Role[]; // If not specified, available to everyone who is logged in
}

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Дашборд' },
  { to: '/news', icon: Newspaper, label: 'Новости', roles: ['news_editor'] },
  { to: '/colleges', icon: GraduationCap, label: 'Колледжи', roles: ['content_editor'] },
  { to: '/specialties', icon: BookOpen, label: 'Специальности', roles: ['content_editor'] },
  { to: '/events', icon: CalendarDays, label: 'События', roles: ['content_editor'] },
  { to: '/shorts', icon: Video, label: 'Shorts', roles: ['content_editor'] },
  { to: '/quizzes', icon: HelpCircle, label: 'Тесты', roles: ['content_editor'] },
  { to: '/professions', icon: Briefcase, label: 'Профессии', roles: ['content_editor'] },
];

export default function Layout() {
  const { signOut, user, role, hasAccess } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter(item =>
    !item.roles || hasAccess(item.roles)
  );

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col transition-all duration-300">
                <div className="h-16 flex items-center px-6 border-b border-slate-200">
                    <GraduationCap className="w-8 h-8 text-primary-600 mr-3" />
                    <span className="text-xl font-bold text-slate-800">Admin Panel</span>
                </div>

                <nav className="flex-1 overflow-y-auto py-4">
                    <ul className="space-y-1 px-3">
                        {filteredNavItems.map((item) => (
                            <li key={item.to}>
                                <NavLink
                                    to={item.to}
                                    end={item.to === '/'}
                                    className={({ isActive }) => clsx(
                                        "flex items-center px-3 py-2.5 rounded-lg transition-colors group",
                                        isActive
                                            ? "bg-primary-50 text-primary-700 font-medium"
                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                    )}
                                >
                                    <item.icon className={clsx(
                                        "w-5 h-5 mr-3 transition-colors",
                                        "group-hover:text-primary-600",
                                        // Active state color implies standard Link doesn't match easily without standard react-router tricks, 
                                        // but we can rely on parent text color to cascade.
                                    )} />
                                    {item.label}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2.5 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Выйти
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10">
          <h2 className="text-lg font-semibold text-slate-800">Карьерный Компас</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase">
              {role || 'Viewer'}
            </span>
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold" title={user?.email || ''}>
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-slate-50/50">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
