import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { StorageService } from '../lib/storage';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Pin } from 'lucide-react';

interface NewsItem {
    id: string;
    title: string;
    date: string;
    summary: string;
    content: string;
    image_url: string;
    tags: string[];
    college_id?: string;
    is_pinned?: boolean;
    created_at?: string;
    college?: { name: string };
}

interface College {
    id: string;
    name: string;
}

export default function News() {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [colleges, setColleges] = useState<College[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNews, setEditingNews] = useState<NewsItem | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        date: '',
        summary: '',
        content: '',
        image_url: '',
        tags: '',
        college_id: '',
        is_pinned: false,
    });
    const [file, setFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchNews();
        fetchColleges();
    }, []);

    const fetchColleges = async () => {
        const { data } = await supabase.from('colleges').select('id, name');
        setColleges(data || []);
    };

    const fetchNews = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('news')
            .select('*, college:colleges(name)')
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching news:', error);
        else setNews(data || []);
        setLoading(false);
    };

    const openModal = (item?: NewsItem) => {
        if (item) {
            setEditingNews(item);
            setFormData({
                title: item.title || '',
                date: item.date || '',
                summary: item.summary || '',
                content: item.content || '',
                image_url: item.image_url || '',
                tags: item.tags?.join(', ') || '',
                college_id: item.college_id || '',
                is_pinned: item.is_pinned || false,
            });
        } else {
            setEditingNews(null);
            setFormData({ title: '', date: '', summary: '', content: '', image_url: '', tags: '', college_id: '', is_pinned: false });
        }
        setFile(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingNews(null);
        setFile(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            let finalImageUrl = formData.image_url;

            if (file) {
                const { url, error } = await StorageService.uploadFile(file, 'news');
                if (error) throw new Error(error);
                if (url) finalImageUrl = url;
            }

            const parseArray = (str: string) => str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];

            const payload: any = {
                title: formData.title,
                date: formData.date || new Date().toISOString().split('T')[0],
                summary: formData.summary,
                content: formData.content,
                image_url: finalImageUrl,
                tags: parseArray(formData.tags),
            };

            // Only include these if they are actually used in the schema, but we'll try to add them
            if (formData.college_id) payload.college_id = formData.college_id;
            if (formData.is_pinned !== undefined) payload.is_pinned = formData.is_pinned;

            if (editingNews) {
                const { error } = await supabase.from('news').update(payload).eq('id', editingNews.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('news').insert([payload]);
                if (error) throw error;
            }

            await fetchNews();
            closeModal();
        } catch (err) {
            console.error(err);
            alert('Ошибка при сохранении новости');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Вы уверены, что хотите удалить новость?')) return;
        try {
            const { error } = await supabase.from('news').delete().eq('id', id);
            if (error) throw error;
            await fetchNews();
        } catch (err) {
            console.error(err);
            alert('Ошибка при удалении');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">Новости</h1>
                <button
                    onClick={() => openModal()}
                    className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm font-medium"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Добавить
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Картинка</th>
                                <th className="px-6 py-4">Заголовок</th>
                                <th className="px-6 py-4">Привязка (Колледж)</th>
                                <th className="px-6 py-4">Статус</th>
                                <th className="px-6 py-4">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Загрузка...</td>
                                </tr>
                            ) : news.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Нет новостей.</td>
                                </tr>
                            ) : (
                                news.map((item) => (
                                    <tr key={item.id} className={`transition-colors ${item.is_pinned ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-slate-50/50'}`}>
                                        <td className="px-6 py-4">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt="News" className="w-16 h-10 object-cover rounded shadow-sm border border-slate-200" />
                                            ) : (
                                                <div className="w-16 h-10 bg-slate-100 rounded flex items-center justify-center border border-slate-200 text-slate-400">
                                                    <ImageIcon className="w-4 h-4" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900 line-clamp-2 max-w-xs">{item.title}</td>
                                        <td className="px-6 py-4">{item.college?.name || 'Общая новость'}</td>
                                        <td className="px-6 py-4">
                                            {item.is_pinned && (
                                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                                    <Pin className="w-3 h-3 mr-1" />
                                                    Закреплена
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => openModal(item)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">
                                {editingNews ? 'Редактировать новость' : 'Создать новость'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="news-form" onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Заголовок *</label>
                                    <input required type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Дата</label>
                                        <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Теги (через запятую)</label>
                                        <input type="text" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Краткое описание (Summary)</label>
                                    <textarea rows={2} value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Текст новости</label>
                                    <textarea rows={6} value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Картинка</label>
                                    <div className="flex items-center gap-4">
                                        {formData.image_url && !file && (
                                            <img src={formData.image_url} alt="Preview" className="w-20 h-12 rounded border border-slate-200 object-cover" />
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                                            className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Привязка к колледжу (опционально)</label>
                                    <select
                                        value={formData.college_id}
                                        onChange={(e) => setFormData({ ...formData, college_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                    >
                                        <option value="">Без привязки (Общая новость)</option>
                                        {colleges.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <input
                                        type="checkbox"
                                        id="is_pinned"
                                        checked={formData.is_pinned}
                                        onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                                        className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                                    />
                                    <label htmlFor="is_pinned" className="text-sm font-medium text-slate-700">
                                        Закрепить новость наверху
                                    </label>
                                </div>
                            </form>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200/50 rounded-lg">Отмена</button>
                            <button type="submit" form="news-form" disabled={saving} className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50">
                                {saving ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
