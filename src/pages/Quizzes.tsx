import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { StorageService } from '../lib/storage';
import { Plus, Edit2, Trash2, X, Image as ImageIcon } from 'lucide-react';

interface Quiz {
    id: string;
    title: string;
    description: string;
    image_url: string;
    type: string;
    is_published: boolean;
    created_at?: string;
}

export default function Quizzes() {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        image_url: '',
        type: 'battle',
        is_published: false,
    });
    const [file, setFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('quizzes').select('*').order('created_at', { ascending: true });
        if (error) console.error('Error fetching quizzes:', error);
        else setQuizzes(data || []);
        setLoading(false);
    };

    const openModal = (item?: Quiz) => {
        if (item) {
            setEditingQuiz(item);
            setFormData({
                title: item.title || '',
                description: item.description || '',
                image_url: item.image_url || '',
                type: item.type || 'battle',
                is_published: item.is_published || false,
            });
        } else {
            setEditingQuiz(null);
            setFormData({
                title: '',
                description: '',
                image_url: '',
                type: 'battle',
                is_published: false
            });
        }
        setFile(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingQuiz(null);
        setFile(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            let finalImageUrl = formData.image_url;

            if (file) {
                const { url, error } = await StorageService.uploadFile(file, 'quizzes');
                if (error) throw new Error(error);
                if (url) finalImageUrl = url;
            }

            const payload = {
                title: formData.title,
                description: formData.description,
                image_url: finalImageUrl,
                type: formData.type,
                is_published: formData.is_published,
            };

            if (editingQuiz) {
                const { error } = await supabase.from('quizzes').update(payload).eq('id', editingQuiz.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('quizzes').insert([payload]);
                if (error) throw error;
            }

            await fetchQuizzes();
            closeModal();
        } catch (err) {
            console.error(err);
            alert('Ошибка при сохранении теста');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот тест?')) return;
        try {
            const { error } = await supabase.from('quizzes').delete().eq('id', id);
            if (error) throw error;
            await fetchQuizzes();
        } catch (err) {
            console.error(err);
            alert('Ошибка при удалении');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">Профориентационные тесты</h1>
                <button
                    onClick={() => openModal()}
                    className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm font-medium"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Добавить тест
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Обложка</th>
                                <th className="px-6 py-4">Название</th>
                                <th className="px-6 py-4">Тип</th>
                                <th className="px-6 py-4">Статус</th>
                                <th className="px-6 py-4">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Загрузка...</td>
                                </tr>
                            ) : quizzes.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Нет тестов.</td>
                                </tr>
                            ) : (
                                quizzes.map((q) => (
                                    <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            {q.image_url ? (
                                                <img src={q.image_url} alt={q.title} className="w-16 h-10 object-cover rounded-md border border-slate-200" />
                                            ) : (
                                                <div className="w-16 h-10 bg-slate-100 rounded-md flex items-center justify-center border border-slate-200 text-slate-400">
                                                    <ImageIcon className="w-5 h-5" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{q.title}</td>
                                        <td className="px-6 py-4">{q.type}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center justify-center px-2 py-1 rounded font-medium text-xs ${q.is_published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {q.is_published ? 'Опубликован' : 'Черновик'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => openModal(q)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(q.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
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
                                {editingQuiz ? 'Редактировать тест' : 'Новый тест'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="quiz-form" onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Название *</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-lg font-medium"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Тип теста</label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                        >
                                            <option value="battle">Битва (battle)</option>
                                            <option value="standard">Стандартный</option>
                                            <option value="holland">По Голланду</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center pt-6 space-x-2">
                                        <input
                                            type="checkbox"
                                            id="publish-toggle"
                                            checked={formData.is_published}
                                            onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                                            className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                                        />
                                        <label htmlFor="publish-toggle" className="text-sm font-medium text-slate-700">Опубликовать</label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Описание</label>
                                    <textarea
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Обложка</label>
                                    <div className="flex items-center gap-4">
                                        {formData.image_url && !file && (
                                            <img src={formData.image_url} alt="Current cover" className="w-16 h-10 rounded-lg border border-slate-200 object-cover" />
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                                            className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-colors"
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200/50 rounded-lg">Отмена</button>
                            <button type="submit" form="quiz-form" disabled={saving} className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50">
                                {saving ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
