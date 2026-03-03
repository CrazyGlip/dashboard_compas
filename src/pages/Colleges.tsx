import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { StorageService } from '../lib/storage';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Save } from 'lucide-react';

interface College {
    id: string;
    name: string;
    full_name?: string;
    city: string;
    description: string;
    activity_info?: string;
    address: string;
    phone?: string;
    passing_score?: number;
    education_forms?: string[];
    tags?: string[];
    specialty_ids?: string[];
    logo_url: string;
    image_url?: string;
    gallery?: string[];
    admission_link?: string;
    epgu_link?: string;
    vk_url?: string;
    max_url?: string;
    website_url?: string;
    geo_tag?: string;
    has_dormitory?: boolean;
    is_accessible?: boolean;
    accessibility_notes?: string;
    contacts?: any;
    info?: any;
    created_at?: string;
}

export default function Colleges() {
    const [colleges, setColleges] = useState<College[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCollege, setEditingCollege] = useState<College | null>(null);

    // Using any for formData to avoid excessive typing for all new fields for now,
    // we'll initialize it properly.
    const [formData, setFormData] = useState<any>({});
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
    const [saving, setSaving] = useState(false);

    const [specialties, setSpecialties] = useState<{ id: string, title: string }[]>([]);
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
    const [scoresDict, setScoresDict] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchColleges();
    }, []);

    const fetchColleges = async () => {
        setLoading(true);
        const [colRes, specRes] = await Promise.all([
            supabase.from('colleges').select('*').order('created_at', { ascending: false }),
            supabase.from('specialties').select('id, title').order('title', { ascending: true })
        ]);

        if (colRes.error) console.error('Error fetching colleges:', colRes.error);
        else setColleges(colRes.data || []);

        if (specRes.data) setSpecialties(specRes.data);

        setLoading(false);
    };

    const openModal = async (college?: College) => {
        if (college) {
            setEditingCollege(college);
            setFormData({
                ...college,
                education_forms: college.education_forms?.join(', ') || '',
                tags: college.tags?.join(', ') || '',
                gallery: college.gallery?.join('\n') || '',
                contacts: college.contacts ? JSON.stringify(college.contacts, null, 2) : '{}',
                info: college.info ? JSON.stringify(college.info, null, 2) : '{}',
            });
            setSelectedSpecialties(college.specialty_ids || []);

            // Fetch scores
            const { data } = await supabase.from('college_specialty_scores').select('specialty_id, avg_score_2025').eq('college_id', college.id);
            const initialScores: Record<string, string> = {};
            if (data) {
                data.forEach((row: any) => {
                    if (row.avg_score_2025 !== null) {
                        initialScores[row.specialty_id] = row.avg_score_2025.toString();
                    }
                });
            }
            setScoresDict(initialScores);

        } else {
            setEditingCollege(null);
            setFormData({
                id: '', name: '', full_name: '', city: '', description: '',
                activity_info: '', address: '', phone: '',
                education_forms: '', tags: '', logo_url: '',
                image_url: '', gallery: '', admission_link: '', epgu_link: '',
                vk_url: '', max_url: '', website_url: '', geo_tag: '',
                has_dormitory: false, is_accessible: false, accessibility_notes: '',
                contacts: '{\n  "vk": "",\n  "map": "",\n  "email": "",\n  "phone": "",\n  "website": ""\n}',
                info: '{\n  "hasLibrary": true,\n  "hasDormitory": false,\n  "hasFreeMeals": false,\n  "hasSportsFacilities": true,\n  "isAccessibleForDisabled": true\n}',
            });
            setSelectedSpecialties([]);
            setScoresDict({});
        }
        setLogoFile(null);
        setImageFile(null);
        setGalleryFiles([]);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCollege(null);
        setLogoFile(null);
        setImageFile(null);
        setGalleryFiles([]);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as any;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev: any) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            let finalLogoUrl = formData.logo_url;
            let finalImageUrl = formData.image_url;
            let finalGalleryUrls = formData.gallery ? formData.gallery.split('\n').map((s: string) => s.trim()).filter(Boolean) : [];

            if (logoFile) {
                const { url, error } = await StorageService.uploadFile(logoFile, 'colleges');
                if (error) throw new Error(error);
                if (url) finalLogoUrl = url;
            }
            if (imageFile) {
                const { url, error } = await StorageService.uploadFile(imageFile, 'colleges');
                if (error) throw new Error(error);
                if (url) finalImageUrl = url;
            }

            if (galleryFiles.length > 0) {
                const uploadPromises = galleryFiles.map(file => StorageService.uploadFile(file, 'colleges/gallery'));
                const results = await Promise.all(uploadPromises);

                for (const result of results) {
                    if (result.error) throw new Error(result.error);
                    if (result.url) finalGalleryUrls.push(result.url);
                }
            }

            // Parse arrays and JSON
            const parseArray = (str: string, separator: string = ',') =>
                str ? str.split(separator).map(s => s.trim()).filter(Boolean) : [];
            const parseJson = (str: string) => {
                try { return JSON.parse(str); } catch { return {}; }
            };

            const payload = {
                id: formData.id,
                name: formData.name,
                full_name: formData.full_name,
                city: formData.city,
                description: formData.description,
                activity_info: formData.activity_info,
                address: formData.address,
                phone: formData.phone,
                education_forms: parseArray(formData.education_forms),
                tags: parseArray(formData.tags),
                specialty_ids: selectedSpecialties,
                logo_url: finalLogoUrl,
                image_url: finalImageUrl,
                gallery: finalGalleryUrls,
                admission_link: formData.admission_link,
                epgu_link: formData.epgu_link,
                vk_url: formData.vk_url,
                max_url: formData.max_url,
                website_url: formData.website_url,
                geo_tag: formData.geo_tag,
                has_dormitory: formData.has_dormitory,
                is_accessible: formData.is_accessible,
                accessibility_notes: formData.accessibility_notes,
                contacts: parseJson(formData.contacts),
                info: parseJson(formData.info),
            };

            let savedCollegeId: string | undefined;

            if (editingCollege) {
                // don't update ID if it's the primary key and we can't change it, 
                // but supabase allows updating by id or we just omit ID from payload and eq() it.
                // Let's omit `id` from payload if we are editing.
                const { id, ...updatePayload } = payload;
                const { error } = await supabase.from('colleges').update(updatePayload).eq('id', editingCollege.id);
                if (error) throw error;
                savedCollegeId = editingCollege.id;
            } else {
                const { error } = await supabase.from('colleges').insert([payload]);
                if (error) throw error;
                savedCollegeId = payload.id;
            }

            // Upsert college_specialty_scores
            if (savedCollegeId) {
                // First delete old scores for this college
                await supabase.from('college_specialty_scores').delete().eq('college_id', savedCollegeId);

                const scoresToInsert = selectedSpecialties.map(specId => ({
                    college_id: savedCollegeId,
                    specialty_id: specId,
                    avg_score_2025: scoresDict[specId] ? parseFloat(scoresDict[specId]) : null,
                }));

                if (scoresToInsert.length > 0) {
                    const { error: scoreError } = await supabase.from('college_specialty_scores').insert(scoresToInsert);
                    if (scoreError) console.error("Error saving scores:", scoreError); // Dont block full save, just log
                }
            }

            await fetchColleges();
            closeModal();
        } catch (err: any) {
            console.error('Save error:', err);
            alert(`Ошибка при сохранении колледжа: ${err.message || 'Сбой'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот колледж?')) return;
        try {
            const { error } = await supabase.from('colleges').delete().eq('id', id);
            if (error) throw error;
            await fetchColleges();
        } catch (err) {
            console.error('Delete error:', err);
            alert('Ошибка при удалении');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">Колледжи</h1>
                <button
                    onClick={() => openModal()}
                    className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm font-medium"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Добавить колледж
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Лого</th>
                                <th className="px-6 py-4">ID (Код)</th>
                                <th className="px-6 py-4">Название</th>
                                <th className="px-6 py-4">Город</th>
                                <th className="px-6 py-4">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        Загрузка...
                                    </td>
                                </tr>
                            ) : colleges.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        Нет данных. Добавьте первый колледж.
                                    </td>
                                </tr>
                            ) : (
                                colleges.map((college) => (
                                    <tr key={college.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            {college.logo_url ? (
                                                <img src={college.logo_url} alt={college.name} className="w-10 h-10 object-cover rounded-md border border-slate-200" />
                                            ) : (
                                                <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center border border-slate-200 text-slate-400">
                                                    <ImageIcon className="w-5 h-5" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs">{college.id}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{college.name}</td>
                                        <td className="px-6 py-4">{college.city}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openModal(college)}
                                                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(college.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
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
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">
                                {editingCollege ? `Редактировать колледж: ${editingCollege.name}` : 'Новый колледж'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto bg-slate-50/50">
                            <form id="college-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">

                                {/* Left Column: Basic Info & Lists */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-1">Основное</h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">ID (Слаг) *</label>
                                            <input required type="text" name="id" value={formData.id} onChange={handleChange} disabled={!!editingCollege} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 disabled:bg-slate-100" placeholder="e.g. kkat" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Короткое название *</label>
                                            <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Полное название</label>
                                        <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Город</label>
                                            <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Адрес</label>
                                        <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Описание</label>
                                        <textarea rows={3} name="description" value={formData.description} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 resize-none" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Активность (activity_info)</label>
                                        <textarea rows={3} name="activity_info" value={formData.activity_info} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 resize-none" />
                                    </div>

                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-1 mt-6">Списки (через запятую)</h4>

                                    <div className="flex flex-col">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Связанные Специальности И Баллы (2025)</label>
                                        <div className="border border-slate-200 rounded-lg p-3 max-h-64 overflow-y-auto bg-slate-50 space-y-3">
                                            {specialties.map(s => {
                                                const isChecked = selectedSpecialties.includes(s.id);
                                                return (
                                                    <div key={s.id} className="flex flex-col gap-1 pb-2 border-b border-slate-200/50 last:border-0 last:pb-0">
                                                        <label className="flex items-start gap-2 text-sm cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                className="mt-1 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                                checked={isChecked}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setSelectedSpecialties([...selectedSpecialties, s.id]);
                                                                    else {
                                                                        setSelectedSpecialties(selectedSpecialties.filter(id => id !== s.id));
                                                                        // Optional: clear score when unchecked
                                                                        const newScores = { ...scoresDict };
                                                                        delete newScores[s.id];
                                                                        setScoresDict(newScores);
                                                                    }
                                                                }}
                                                            />
                                                            <span className="text-slate-700 leading-tight">{s.title} <span className="text-xs text-slate-400">({s.id})</span></span>
                                                        </label>
                                                        {isChecked && (
                                                            <div className="ml-6 flex items-center gap-2">
                                                                <span className="text-xs text-slate-500 uppercase font-medium">Проходной балл:</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="Балл (напр. 4.3)"
                                                                    value={scoresDict[s.id] || ''}
                                                                    onChange={(e) => setScoresDict({ ...scoresDict, [s.id]: e.target.value })}
                                                                    className="w-24 px-2 py-1 text-xs border border-slate-200 rounded focus:ring-2 focus:ring-primary-500/20"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {specialties.length === 0 && <span className="text-xs text-slate-400">Нет данных о специальностях</span>}
                                        </div>
                                    </div>

                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-1 mt-6">Списки (через запятую)</h4>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Формы обучения</label>
                                        <input type="text" name="education_forms" value={formData.education_forms} onChange={handleChange} placeholder="очная, заочная" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Теги</label>
                                        <input type="text" name="tags" value={formData.tags} onChange={handleChange} placeholder="сельское хозяйство, ветеринария" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20" />
                                    </div>

                                </div>

                                {/* Right Column: Media, Links & JSON */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-1">Медиа</h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Логотип (Иконка)</label>
                                            {formData.logo_url && !logoFile && <img src={formData.logo_url} className="h-10 mb-2 rounded border" alt="logo" />}
                                            <input type="file" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="text-xs" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Главное фото (Обложка)</label>
                                            {formData.image_url && !imageFile && <img src={formData.image_url} className="h-10 mb-2 rounded border" alt="image" />}
                                            <input type="file" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="text-xs" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Галерея (Загрузите фото ИЛИ введите URL)</label>
                                        <div className="space-y-2">
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={(e) => setGalleryFiles(Array.from(e.target.files || []))}
                                                className="text-xs mb-2 block"
                                            />
                                            {galleryFiles.length > 0 && (
                                                <div className="text-xs text-primary-600 mb-2">
                                                    Выбрано файлов: {galleryFiles.length} (будут добавлены к текущим)
                                                </div>
                                            )}
                                            <textarea rows={3} name="gallery" value={formData.gallery} onChange={handleChange} placeholder="https://example.com/img1.jpg&#10;https://example.com/img2.jpg" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 font-mono text-xs resize-none" />
                                        </div>
                                    </div>

                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-1 mt-6">Ссылки и Контакты</h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-xs text-slate-500">Телефон</label><input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                        <div><label className="block text-xs text-slate-500">Website URL</label><input type="text" name="website_url" value={formData.website_url} onChange={handleChange} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                        <div><label className="block text-xs text-slate-500">VK URL</label><input type="text" name="vk_url" value={formData.vk_url} onChange={handleChange} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                        <div><label className="block text-xs text-slate-500">Admission Link</label><input type="text" name="admission_link" value={formData.admission_link} onChange={handleChange} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                        <div><label className="block text-xs text-slate-500">EPGU Link</label><input type="text" name="epgu_link" value={formData.epgu_link} onChange={handleChange} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                        <div><label className="block text-xs text-slate-500">Яндекс MAX URL</label><input type="text" name="max_url" value={formData.max_url} onChange={handleChange} className="w-full px-2 py-1 text-sm border rounded" /></div>
                                    </div>
                                    <div><label className="block text-xs text-slate-500">Geo Tag (Карта)</label><input type="text" name="geo_tag" value={formData.geo_tag} onChange={handleChange} className="w-full px-2 py-1 text-sm border rounded" /></div>

                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-1 mt-6">Доп. параметры и JSON</h4>

                                    <div className="flex gap-4">
                                        <label className="flex items-center text-sm"><input type="checkbox" name="has_dormitory" checked={formData.has_dormitory} onChange={handleChange} className="mr-2" /> Есть общежитие</label>
                                        <label className="flex items-center text-sm"><input type="checkbox" name="is_accessible" checked={formData.is_accessible} onChange={handleChange} className="mr-2" /> Доступная среда</label>
                                    </div>
                                    <div><label className="block text-xs text-slate-500">Заметки по доступности</label><input type="text" name="accessibility_notes" value={formData.accessibility_notes} onChange={handleChange} className="w-full px-2 py-1 text-sm border rounded" /></div>

                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Contacts (JSON)</label>
                                            <textarea rows={4} name="contacts" value={formData.contacts} onChange={handleChange} className="w-full p-2 border rounded font-mono text-xs bg-slate-100" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Info (JSON)</label>
                                            <textarea rows={4} name="info" value={formData.info} onChange={handleChange} className="w-full p-2 border rounded font-mono text-xs bg-slate-100" />
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                            >
                                Отмена
                            </button>
                            <button
                                type="submit"
                                form="college-form"
                                disabled={saving}
                                className="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50 flex items-center"
                            >
                                {saving ? 'Сохранение...' : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Сохранить
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
