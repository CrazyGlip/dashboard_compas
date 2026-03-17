import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { StorageService } from '../lib/storage';
import { Plus, Edit2, Trash2, X, Video as VideoIcon } from 'lucide-react';

interface Short {
    id: string;
    title: string;
    video_url: string;
    description: string;
    college_id: string;
    created_at?: string;
    college?: { name: string };
}

interface College {
    id: string;
    name: string;
}

export default function Shorts() {
    const [shorts, setShorts] = useState<Short[]>([]);
    const [colleges, setColleges] = useState<College[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingShort, setEditingShort] = useState<Short | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        video_url: '',
        description: '',
        college_id: '',
    });
    const [file, setFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchShorts();
        fetchColleges();
    }, []);

    const fetchColleges = async () => {
        const { data } = await supabase.from('colleges').select('id, name');
        setColleges(data || []);
    };

    const fetchShorts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('shorts')
            .select('*, college:colleges(name)')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching shorts:', error);
        else setShorts(data || []);
        setLoading(false);
    };

    const openModal = (item?: Short) => {
        if (item) {
            setEditingShort(item);
            setFormData({
                title: item.title || '',
                video_url: item.video_url || '',
                description: item.description || '',
                college_id: item.college_id || '',
            });
        } else {
            setEditingShort(null);
            setFormData({ title: '', video_url: '', description: '', college_id: '' });
        }
        setFile(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingShort(null);
        setFile(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            let finalVideoUrl = formData.video_url;

            if (file) {
                console.log('Uploading file...', file.name);
                const { url, error } = await StorageService.uploadFile(file, 'shorts');
                if (error) {
                    console.error('Upload failed:', error);
                    throw new Error(`Ошибка загрузки видео: ${error}`);
                }
                if (url) {
                    console.log('Upload successful, URL:', url);
                    finalVideoUrl = url;
                }
            }

            if (!finalVideoUrl) {
                throw new Error('Необходимо загрузить видео или указать URL');
            }

            if (!formData.title.trim()) {
                throw new Error('Пожалуйста, введите название видео');
            }

            const payload: any = {
                title: formData.title,
                video_url: finalVideoUrl,
                description: formData.description,
                college_id: formData.college_id || null,
            };

            console.log('Saving short with payload:', payload);

            if (editingShort) {
                const { error } = await supabase.from('shorts').update(payload).eq('id', editingShort.id);
                if (error) {
                    console.error('Update error:', error);
                    throw error;
                }
            } else {
                // Generate a random ID because the table doesn't have a default id generator
                payload.id = crypto.randomUUID();
                const { error } = await supabase.from('shorts').insert([payload]);
                if (error) {
                    console.error('Insert error:', error);
                    if ((error as any).code === '23502') {
                         throw new Error(`Ошибка базы данных: пропущено обязательное поле (${(error as any).column || 'id'}). Пожалуйста, обратитесь к разработчику.`);
                    }
                    throw error;
                }
            }

            console.log('Save successful');
            await fetchShorts();
            closeModal();
            alert('Видео успешно сохранено');
        } catch (err) {
            console.error('Full save error details:', err);
            alert(err instanceof Error ? err.message : 'Ошибка при сохранении видео');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Вы уверены, что хотите удалить это видео?')) return;
        try {
            const { error } = await supabase.from('shorts').delete().eq('id', id);
            if (error) throw error;
            await fetchShorts();
        } catch (err) {
            console.error(err);
            alert('Ошибка при удалении');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">Видео (Shorts)</h1>
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
                                <th className="px-6 py-4">Название</th>
                                <th className="px-6 py-4">Превью / Ссылка</th>
                                <th className="px-6 py-4">Описание</th>
                                <th className="px-6 py-4">Привязка (Колледж)</th>
                                <th className="px-6 py-4">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Загрузка...</td>
                                </tr>
                            ) : shorts.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Нет видео.</td>
                                </tr>
                            ) : (
                                shorts.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{item.title}</td>
                                        <td className="px-6 py-4">
                                            <a href={item.video_url} target="_blank" rel="noreferrer" className="flex items-center text-primary-600 hover:text-primary-700 font-medium">
                                                <VideoIcon className="w-5 h-5 mr-2" />
                                                Смотреть
                                            </a>
                                        </td>
                                        <td className="px-6 py-4 line-clamp-2 max-w-xs">{item.description}</td>
                                        <td className="px-6 py-4">{item.college?.name || 'Общее'}</td>
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
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">
                                {editingShort ? 'Редактировать видео' : 'Загрузить видео'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="shorts-form" onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Название видео</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                        placeholder="Введите название..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Видео файл</label>
                                    <input
                                        type="file"
                                        accept="video/*"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Или укажите прямую ссылку ниже:</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Прямая ссылка (URL)</label>
                                    <input
                                        type="url"
                                        value={formData.video_url}
                                        onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                        placeholder="https://..."
                                        disabled={!!file}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Описание видео</label>
                                    <textarea
                                        rows={4}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Привязка к колледжу (опционально)</label>
                                    <select
                                        value={formData.college_id}
                                        onChange={(e) => setFormData({ ...formData, college_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                    >
                                        <option value="">Без привязки</option>
                                        {colleges.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </form>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200/50 rounded-lg">Отмена</button>
                            <button type="submit" form="shorts-form" disabled={saving} className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50">
                                {saving ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
