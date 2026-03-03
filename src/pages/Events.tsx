import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

interface Event {
    id: string;
    title: string;
    description: string;
    image_url: string;
    date: string;
    location: string;
    type: string;
    college_id: string;
    is_urgent: boolean;
    created_at?: string;
    college?: { name: string };
}

interface College {
    id: string;
    name: string;
}

export default function Events() {
    const [events, setEvents] = useState<Event[]>([]);
    const [colleges, setColleges] = useState<College[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        time: '', // UI only
        location: '',
        type: '',
        college_id: '',
        image_url: '',
        is_urgent: false,
    });
    const [file, setFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchEvents();
        fetchColleges();
    }, []);

    const fetchColleges = async () => {
        const { data } = await supabase.from('colleges').select('id, name');
        setColleges(data || []);
    };

    const fetchEvents = async () => {
        setLoading(true);
        // Joining colleges to show organizer name
        const { data, error } = await supabase
            .from('events')
            .select('*, college:colleges(name)')
            .order('date', { ascending: true });

        if (error) console.error('Error:', error);
        else setEvents(data || []);
        setLoading(false);
    };

    const openModal = (event?: Event) => {
        if (event) {
            setEditingEvent(event);
            const eventDate = event.date ? new Date(event.date) : null;
            setFormData({
                title: event.title || '',
                description: event.description || '',
                date: eventDate ? eventDate.toISOString().split('T')[0] : '',
                time: eventDate ? eventDate.toISOString().split('T')[1]?.substring(0, 5) : '',
                location: event.location || '',
                type: event.type || '',
                college_id: event.college_id || '',
                image_url: event.image_url || '',
                is_urgent: event.is_urgent || false,
            });
        } else {
            setEditingEvent(null);
            setFormData({ title: '', description: '', date: '', time: '', location: '', type: '', college_id: '', image_url: '', is_urgent: false });
        }
        setFile(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingEvent(null);
        setFile(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            let finalImageUrl = formData.image_url;

            if (file) {
                // Assuming StorageService is used locally, or we use standard supabase
                const { data, error: uploadError } = await supabase.storage.from('career-compass-media').upload(`events/${Date.now()}_${file.name}`, file);
                if (uploadError) throw new Error(uploadError.message);
                if (data) {
                    const { data: urlData } = supabase.storage.from('career-compass-media').getPublicUrl(data.path);
                    finalImageUrl = urlData.publicUrl;
                }
            }

            // Combine date and time to ISO if needed, or just save date. DB might just be text or timestamptz. Let's pass date + time.
            const fullDate = (formData.date && formData.time) ? `${formData.date}T${formData.time}:00Z` : formData.date || null;

            const payload = {
                title: formData.title,
                description: formData.description,
                date: fullDate,
                location: formData.location,
                type: formData.type,
                college_id: formData.college_id || null,
                image_url: finalImageUrl,
                is_urgent: formData.is_urgent,
            };

            if (editingEvent) {
                const { error } = await supabase.from('events').update(payload).eq('id', editingEvent.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('events').insert([payload]);
                if (error) throw error;
            }

            await fetchEvents();
            closeModal();
        } catch (err) {
            console.error(err);
            alert('Ошибка при сохранении события');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Удалить это событие?')) return;
        try {
            const { error } = await supabase.from('events').delete().eq('id', id);
            if (error) throw error;
            await fetchEvents();
        } catch (err) {
            console.error(err);
            alert('Ошибка при удалении');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">События и ДОД</h1>
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
                                <th className="px-6 py-4">Дата / Время</th>
                                <th className="px-6 py-4">Организатор</th>
                                <th className="px-6 py-4">Статус</th>
                                <th className="px-6 py-4">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Загрузка...</td>
                                </tr>
                            ) : events.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Нет данных.</td>
                                </tr>
                            ) : (
                                events.map((ev) => (
                                    <tr key={ev.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{ev.title}</td>
                                        <td className="px-6 py-4">
                                            {ev.date ? new Date(ev.date).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).replace(',', '') : '-'}
                                        </td>
                                        <td className="px-6 py-4">{ev.college?.name || '-'}</td>
                                        <td className="px-6 py-4">
                                            {ev.is_urgent && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    <AlertCircle className="w-3 h-3 mr-1" />
                                                    Важное
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => openModal(ev)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(ev.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
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
                                {editingEvent ? 'Редактировать событие' : 'Новое событие'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="event-form" onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Название *</label>
                                    <input required type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Тип события</label>
                                        <input type="text" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} placeholder="Например: ДОД, Мастер-класс" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Организатор (Колледж)</label>
                                        <select value={formData.college_id} onChange={(e) => setFormData({ ...formData, college_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                                            <option value="">Не выбран</option>
                                            {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Описание</label>
                                    <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Дата</label>
                                        <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Время</label>
                                        <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Картинка</label>
                                    <div className="flex items-center gap-4">
                                        {formData.image_url && !file && (
                                            <img src={formData.image_url} alt="Preview" className="w-16 h-16 rounded border border-slate-200 object-cover" />
                                        )}
                                        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Адрес (Локация)</label>
                                    <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <input
                                        type="checkbox"
                                        id="is_urgent"
                                        checked={formData.is_urgent}
                                        onChange={(e) => setFormData({ ...formData, is_urgent: e.target.checked })}
                                        className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                                    />
                                    <label htmlFor="is_urgent" className="text-sm font-medium text-slate-700">
                                        Важное / Срочное событие
                                    </label>
                                </div>
                            </form>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200/50 rounded-lg">Отмена</button>
                            <button type="submit" form="event-form" disabled={saving} className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50">
                                {saving ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
