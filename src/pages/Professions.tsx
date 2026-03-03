import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, X, TrendingUp } from 'lucide-react';

interface Profession {
    id: string;
    name: string;
    sphere: string;
    salary_from: number | null;
    salary_to: number | null;
    description: string;
    trend: string;
    college_ids: string[];
    related_specialty_ids: string[];
    tags: string[];
    employers: any;
    created_at?: string;
}

export default function Professions() {
    const [professions, setProfessions] = useState<Profession[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProfession, setEditingProfession] = useState<Profession | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        sphere: '',
        salary_from: '',
        salary_to: '',
        description: '',
        trend: '',
        tags: '',
    });
    const [selectedColleges, setSelectedColleges] = useState<string[]>([]);
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
    const [employersData, setEmployersData] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    const [colleges, setColleges] = useState<{ id: string, name: string }[]>([]);
    const [specialties, setSpecialties] = useState<{ id: string, title: string }[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [profRes, colRes, specRes] = await Promise.all([
            supabase.from('top_professions').select('*').order('name', { ascending: true }),
            supabase.from('colleges').select('id, name').order('name', { ascending: true }),
            supabase.from('specialties').select('id, title').order('title', { ascending: true })
        ]);

        if (profRes.error) console.error('Error fetching professions:', profRes.error);
        else setProfessions(profRes.data || []);

        if (colRes.data) setColleges(colRes.data);
        if (specRes.data) setSpecialties(specRes.data);

        setLoading(false);
    };

    const openModal = (item?: Profession) => {
        if (item) {
            setEditingProfession(item);
            setFormData({
                name: item.name || '',
                sphere: item.sphere || '',
                salary_from: item.salary_from?.toString() || '',
                salary_to: item.salary_to?.toString() || '',
                description: item.description || '',
                trend: item.trend || '',
                tags: item.tags?.join(', ') || '',
            });
            setSelectedColleges(item.college_ids || []);
            setSelectedSpecialties(item.related_specialty_ids || []);
            setEmployersData(item.employers || []);
        } else {
            setEditingProfession(null);
            setFormData({
                name: '', sphere: '', salary_from: '', salary_to: '', description: '',
                trend: '', tags: ''
            });
            setSelectedColleges([]);
            setSelectedSpecialties([]);
            setEmployersData([]);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingProfession(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const parseArray = (str: string) => str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];

            const payload = {
                name: formData.name,
                sphere: formData.sphere,
                salary_from: formData.salary_from ? parseInt(formData.salary_from) : null,
                salary_to: formData.salary_to ? parseInt(formData.salary_to) : null,
                description: formData.description,
                trend: formData.trend,
                tags: parseArray(formData.tags),
                college_ids: selectedColleges,
                related_specialty_ids: selectedSpecialties,
                employers: employersData,
            };

            if (editingProfession) {
                const { error } = await supabase.from('top_professions').update(payload).eq('id', editingProfession.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('top_professions').insert([payload]);
                if (error) throw error;
            }

            await fetchData();
            closeModal();
        } catch (err) {
            console.error(err);
            alert('Ошибка при сохранении профессии');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Вы уверены, что хотите удалить эту профессию?')) return;
        try {
            const { error } = await supabase.from('top_professions').delete().eq('id', id);
            if (error) throw error;
            await fetchData();
        } catch (err) {
            console.error(err);
            alert('Ошибка при удалении');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                        Топ-50 профессий
                        <TrendingUp className="w-6 h-6 ml-2 text-green-500" />
                    </h1>
                    <p className="text-slate-500 mt-1">Перспективные профессии региона</p>
                </div>
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
                                <th className="px-6 py-4">Описание</th>
                                <th className="px-6 py-4">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">Загрузка...</td>
                                </tr>
                            ) : professions.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">Особых профессий пока нет.</td>
                                </tr>
                            ) : (
                                professions.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                                        <td className="px-6 py-4 line-clamp-2 max-w-md">{p.description}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => openModal(p)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
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
                                {editingProfession ? 'Редактировать профессию' : 'Новая профессию'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="prof-form" onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Название *</label>
                                    <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Сфера (Sphere)</label>
                                        <input type="text" value={formData.sphere} onChange={(e) => setFormData({ ...formData, sphere: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Тренд (Рынок)</label>
                                        <input type="text" value={formData.trend} onChange={(e) => setFormData({ ...formData, trend: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Зарплата ОТ (₽)</label>
                                        <input type="number" value={formData.salary_from} onChange={(e) => setFormData({ ...formData, salary_from: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Зарплата ДО (₽)</label>
                                        <input type="number" value={formData.salary_to} onChange={(e) => setFormData({ ...formData, salary_to: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Описание / Требования</label>
                                    <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Теги (через запятую)</label>
                                    <input type="text" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Связанные Колледжи</label>
                                        <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto bg-slate-50 space-y-2">
                                            {colleges.map(c => (
                                                <label key={c.id} className="flex items-start gap-2 text-sm cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="mt-1 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                        checked={selectedColleges.includes(c.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedColleges([...selectedColleges, c.id]);
                                                            else setSelectedColleges(selectedColleges.filter(id => id !== c.id));
                                                        }}
                                                    />
                                                    <span className="text-slate-700 leading-tight">{c.name} <span className="text-xs text-slate-400">({c.id})</span></span>
                                                </label>
                                            ))}
                                            {colleges.length === 0 && <span className="text-xs text-slate-400">Нет данных</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Связанные Специальности</label>
                                        <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto bg-slate-50 space-y-2">
                                            {specialties.map(s => (
                                                <label key={s.id} className="flex items-start gap-2 text-sm cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="mt-1 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                        checked={selectedSpecialties.includes(s.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedSpecialties([...selectedSpecialties, s.id]);
                                                            else setSelectedSpecialties(selectedSpecialties.filter(id => id !== s.id));
                                                        }}
                                                    />
                                                    <span className="text-slate-700 leading-tight">{s.title} <span className="text-xs text-slate-400">({s.id})</span></span>
                                                </label>
                                            ))}
                                            {specialties.length === 0 && <span className="text-xs text-slate-400">Нет данных</span>}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-slate-700">Работодатели</label>
                                        <button
                                            type="button"
                                            onClick={() => setEmployersData([...employersData, { name: '', description: '', logo_url: '' }])}
                                            className="text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 px-2 py-1 rounded"
                                        >
                                            + Добавить работодателя
                                        </button>
                                    </div>
                                    {employersData.length === 0 ? (
                                        <div className="text-xs text-slate-500 text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                            Пока нет работодателей
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {employersData.map((emp, idx) => (
                                                <div key={idx} className="flex gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg relative">
                                                    <div className="flex-1 space-y-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Название (например: Яндекс)"
                                                            value={emp.name}
                                                            onChange={(e) => {
                                                                const newData = [...employersData];
                                                                newData[idx].name = e.target.value;
                                                                setEmployersData(newData);
                                                            }}
                                                            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-primary-500/20"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Описание (опционально)"
                                                            value={emp.description || ''}
                                                            onChange={(e) => {
                                                                const newData = [...employersData];
                                                                newData[idx].description = e.target.value;
                                                                setEmployersData(newData);
                                                            }}
                                                            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-primary-500/20"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="URL логотипа (опционально)"
                                                            value={emp.logo_url || ''}
                                                            onChange={(e) => {
                                                                const newData = [...employersData];
                                                                newData[idx].logo_url = e.target.value;
                                                                setEmployersData(newData);
                                                            }}
                                                            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-primary-500/20"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEmployersData(employersData.filter((_, i) => i !== idx))}
                                                        className="text-red-400 hover:text-red-600 p-1 h-fit"
                                                        title="Удалить"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200/50 rounded-lg">Отмена</button>
                            <button type="submit" form="prof-form" disabled={saving} className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50">
                                {saving ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
