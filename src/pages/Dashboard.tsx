import { useState, useEffect } from 'react';
import { Building2, GraduationCap, Briefcase, Video, Newspaper, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StatData {
    label: string;
    value: string | number;
    icon: any;
    color: string;
    bg: string;
}

export default function Dashboard() {
    const [stats, setStats] = useState<StatData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            setLoading(true);
            const [
                { count: collegesCount },
                { count: specCount },
                { count: profCount },
                { count: shortsCount },
                { count: newsCount },
                { count: eventsCount },
            ] = await Promise.all([
                supabase.from('colleges').select('*', { count: 'exact', head: true }),
                supabase.from('specialties').select('*', { count: 'exact', head: true }),
                supabase.from('top_professions').select('*', { count: 'exact', head: true }),
                supabase.from('shorts').select('*', { count: 'exact', head: true }),
                supabase.from('news').select('*', { count: 'exact', head: true }),
                supabase.from('events').select('*', { count: 'exact', head: true }),
            ]);

            setStats([
                { label: 'Колледжей', value: collegesCount || 0, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-100' },
                { label: 'Специальностей', value: specCount || 0, icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-100' },
                { label: 'Топ-50 профессий', value: profCount || 0, icon: Briefcase, color: 'text-amber-600', bg: 'bg-amber-100' },
                { label: 'Видео (Shorts)', value: shortsCount || 0, icon: Video, color: 'text-purple-600', bg: 'bg-purple-100' },
                { label: 'Новостей', value: newsCount || 0, icon: Newspaper, color: 'text-green-600', bg: 'bg-green-100' },
                { label: 'Мероприятий', value: eventsCount || 0, icon: Calendar, color: 'text-rose-600', bg: 'bg-rose-100' },
            ]);
            setLoading(false);
        }

        fetchStats();
    }, []);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Добро пожаловать в Админ-Панель</h1>
                <p className="text-slate-500 mt-1">Здесь вы можете управлять контентом приложения "Карьерный Компас".</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between animate-pulse">
                            <div>
                                <div className="h-4 bg-slate-200 rounded w-24 mb-3"></div>
                                <div className="h-8 bg-slate-200 rounded w-16"></div>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-slate-100"></div>
                        </div>
                    ))
                ) : (
                    stats.map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                                    <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
                                </div>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.bg} ${stat.color}`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Быстрые действия</h2>
                <div className="flex flex-wrap gap-4">
                    <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors shadow-sm">
                        Добавить колледж
                    </button>
                    <button className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors">
                        Создать новость
                    </button>
                </div>
            </div>
        </div>
    );
}
