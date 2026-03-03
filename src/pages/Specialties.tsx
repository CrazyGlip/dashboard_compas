import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { StorageService } from '../lib/storage';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Save } from 'lucide-react';

interface Specialty {
    id: string; // "53.02.07"
    type: string;
    title: string;
    description: string;
    full_description?: string;
    image_url?: string;
    duration?: string;
    tags?: string[];
    gallery?: string[];
    details?: any; // JSON
    created_at?: string;
}

export default function Specialties() {
    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null);

    const [formData, setFormData] = useState<any>({});
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

    // Extracted details fields for easier editing
    const [detailsData, setDetailsData] = useState({
        pros: '',
        cons: '',
        skills: '',
        dayInLife: '',
        careerTrack: '',
        salaryNoviceFrom: '',
        salaryNoviceTo: '',
        salaryExperiencedFrom: '',
        salaryExperiencedTo: '',
    });

    const [saving, setSaving] = useState(false);

    const [allColleges, setAllColleges] = useState<any[]>([]);
    const [collegesOfferingThis, setCollegesOfferingThis] = useState<any[]>([]);
    const [scoresDict, setScoresDict] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchSpecialties();
    }, []);

    const fetchSpecialties = async () => {
        setLoading(true);
        const [specRes, colRes] = await Promise.all([
            supabase.from('specialties').select('*').order('created_at', { ascending: false }),
            supabase.from('colleges').select('id, name, specialty_ids')
        ]);
        if (specRes.error) console.error('Error:', specRes.error);
        else setSpecialties(specRes.data || []);

        if (colRes.data) setAllColleges(colRes.data);
        setLoading(false);
    };

    const openModal = async (specialty?: Specialty) => {
        if (specialty) {
            setEditingSpecialty(specialty);

            const details = specialty.details || {};
            setDetailsData({
                pros: (details.pros || []).join('\n'),
                cons: (details.cons || []).join('\n'),
                skills: (details.skills || []).join('\n'),
                dayInLife: details.dayInLife || '',
                careerTrack: (details.careerTrack || []).join('\n'),
                salaryNoviceFrom: details.salary?.novice?.from || '',
                salaryNoviceTo: details.salary?.novice?.to || '',
                salaryExperiencedFrom: details.salary?.experienced?.from || '',
                salaryExperiencedTo: details.salary?.experienced?.to || '',
            });

            setFormData({
                ...specialty,
                tags: specialty.tags?.join(', ') || '',
                gallery: specialty.gallery?.join('\n') || '',
            });

            // Find colleges offering this specialty
            const offeringColleges = allColleges.filter(c => c.specialty_ids && c.specialty_ids.includes(specialty.id));
            setCollegesOfferingThis(offeringColleges);

            // Fetch scores
            const { data: scores } = await supabase.from('college_specialty_scores').select('college_id, avg_score_2025').eq('specialty_id', specialty.id);
            const initialScores: Record<string, string> = {};
            if (scores) {
                scores.forEach(s => {
                    if (s.avg_score_2025 !== null) {
                        initialScores[s.college_id] = s.avg_score_2025.toString();
                    }
                });
            }
            setScoresDict(initialScores);

        } else {
            setDetailsData({
                pros: '', cons: '', skills: '', dayInLife: '', careerTrack: '',
                salaryNoviceFrom: '', salaryNoviceTo: '', salaryExperiencedFrom: '', salaryExperiencedTo: '',
            });
            setFormData({
                id: '', type: 'специальность', title: '', description: '',
                full_description: '', image_url: '', duration: '',
                tags: '', gallery: ''
            });
            setCollegesOfferingThis([]);
            setScoresDict({});
        }
        setImageFile(null);
        setGalleryFiles([]);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingSpecialty(null);
        setImageFile(null);
        setGalleryFiles([]);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name in detailsData) {
            setDetailsData(prev => ({ ...prev, [name]: value }));
        } else {
            setFormData((prev: any) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            let finalImageUrl = formData.image_url;
            let finalGalleryUrls = formData.gallery ? formData.gallery.split('\n').map((s: string) => s.trim()).filter(Boolean) : [];

            if (imageFile) {
                const { url, error } = await StorageService.uploadFile(imageFile, 'specialties');
                if (error) throw new Error(error);
                if (url) finalImageUrl = url;
            }

            if (galleryFiles.length > 0) {
                const uploadPromises = galleryFiles.map(file => StorageService.uploadFile(file, 'specialties/gallery'));
                const results = await Promise.all(uploadPromises);

                for (const result of results) {
                    if (result.error) throw new Error(result.error);
                    if (result.url) finalGalleryUrls.push(result.url);
                }
            }

            const parseArray = (str: string, separator: string = ',') =>
                str ? str.split(separator).map(s => s.trim()).filter(Boolean) : [];
            const parseLines = (str: string) => str ? str.split('\n').map(s => s.trim()).filter(Boolean) : [];

            const constructedDetails = {
                pros: parseLines(detailsData.pros),
                cons: parseLines(detailsData.cons),
                skills: parseLines(detailsData.skills),
                careerTrack: parseLines(detailsData.careerTrack),
                dayInLife: detailsData.dayInLife,
                salary: {
                    novice: {
                        from: detailsData.salaryNoviceFrom ? Number(detailsData.salaryNoviceFrom) : null,
                        to: detailsData.salaryNoviceTo ? Number(detailsData.salaryNoviceTo) : null
                    },
                    experienced: {
                        from: detailsData.salaryExperiencedFrom ? Number(detailsData.salaryExperiencedFrom) : null,
                        to: detailsData.salaryExperiencedTo ? Number(detailsData.salaryExperiencedTo) : null
                    }
                }
            };

            const payload = {
                id: formData.id,
                type: formData.type,
                title: formData.title,
                description: formData.description,
                full_description: formData.full_description,
                duration: formData.duration,
                tags: parseArray(formData.tags),
                gallery: finalGalleryUrls,
                image_url: finalImageUrl,
                details: constructedDetails,
            };

            let savedSpecId: string | undefined;

            if (editingSpecialty) {
                const { id, ...updatePayload } = payload;
                const { error } = await supabase.from('specialties').update(updatePayload).eq('id', editingSpecialty.id);
                if (error) throw error;
                savedSpecId = editingSpecialty.id;
            } else {
                const { error } = await supabase.from('specialties').insert([payload]);
                if (error) throw error;
                savedSpecId = payload.id;
            }

            // Upsert college_specialty_scores
            if (savedSpecId && collegesOfferingThis.length > 0) {
                await supabase.from('college_specialty_scores').delete().eq('specialty_id', savedSpecId);

                const scoresToInsert = collegesOfferingThis.map(c => ({
                    college_id: c.id,
                    specialty_id: savedSpecId,
                    avg_score_2025: scoresDict[c.id] ? parseFloat(scoresDict[c.id]) : null,
                }));

                const { error: scoreError } = await supabase.from('college_specialty_scores').insert(scoresToInsert);
                if (scoreError) console.error("Error saving scores:", scoreError);
            }

            await fetchSpecialties();
            closeModal();
        } catch (err: any) {
            console.error(err);
            alert(`Ошибка при сохранении специальности: ${err.message || 'Сбой'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Удалить эту специальность?')) return;
        try {
            const { error } = await supabase.from('specialties').delete().eq('id', id);
            if (error) throw error;
            await fetchSpecialties();
        } catch (err) {
            console.error(err);
            alert('Ошибка при удалении');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">Специальности и Профессии</h1>
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
                                <th className="px-6 py-4">Обложка</th>
                                <th className="px-6 py-4">Код</th>
                                <th className="px-6 py-4">Название</th>
                                <th className="px-6 py-4">Тип</th>
                                <th className="px-6 py-4">Срок</th>
                                <th className="px-6 py-4">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Загрузка...</td>
                                </tr>
                            ) : specialties.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Нет данных.</td>
                                </tr>
                            ) : (
                                specialties.map((spec) => (
                                    <tr key={spec.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            {spec.image_url ? (
                                                <img src={spec.image_url} alt={spec.title} className="w-12 h-10 object-cover rounded-md border border-slate-200" />
                                            ) : (
                                                <div className="w-12 h-10 bg-slate-100 rounded-md flex items-center justify-center border border-slate-200 text-slate-400">
                                                    <ImageIcon className="w-5 h-5" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs">{spec.id}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{spec.title}</td>
                                        <td className="px-6 py-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs">{spec.type}</span></td>
                                        <td className="px-6 py-4">{spec.duration}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => openModal(spec)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(spec.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
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
                                {editingSpecialty ? `Редактировать: ${editingSpecialty.title}` : 'Новая запись'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto bg-slate-50/50">
                            <form id="spec-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">

                                {/* Left Column: Basic Info */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-1">Основное</h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Код (ID) *</label>
                                            <input required type="text" name="id" value={formData.id} onChange={handleChange} disabled={!!editingSpecialty} placeholder="e.g. 53.02.07" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 disabled:bg-slate-100" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Тип *</label>
                                            <select name="type" value={formData.type} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 bg-white">
                                                <option value="специальность">Специальность (СПО)</option>
                                                <option value="профессия">Профессия (СПО)</option>
                                                <option value="высшее">Высшее образование</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Название *</label>
                                        <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Срок обучения</label>
                                            <input type="text" name="duration" value={formData.duration} onChange={handleChange} placeholder="e.g. 2 года 10 мес." className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Краткое описание</label>
                                        <textarea rows={2} name="description" value={formData.description} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 resize-none" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Полное описание (full_description)</label>
                                        <textarea rows={4} name="full_description" value={formData.full_description} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 resize-none" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Теги (через запятую)</label>
                                        <input type="text" name="tags" value={formData.tags} onChange={handleChange} placeholder="искусство, музыка" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20" />
                                    </div>

                                </div>

                                {/* Right Column: Media & JSON Details */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-1">Медиа</h4>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Обложка (image_url)</label>
                                        <div className="flex items-center gap-4">
                                            {formData.image_url && !imageFile && (
                                                <img src={formData.image_url} alt="Current" className="w-16 h-10 rounded border border-slate-200 object-cover" />
                                            )}
                                            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="text-sm border p-1 rounded" />
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
                                                className="text-xs mb-2 block border p-1 rounded w-full"
                                            />
                                            {galleryFiles.length > 0 && (
                                                <div className="text-xs text-primary-600 mb-2">
                                                    Выбрано файлов: {galleryFiles.length} (будут добавлены к текущим)
                                                </div>
                                            )}
                                            <textarea rows={2} name="gallery" value={formData.gallery} onChange={handleChange} placeholder="https://example.com/img1.jpg&#10;https://example.com/img2.jpg" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 font-mono text-xs resize-none" />
                                        </div>
                                    </div>

                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-1 mt-6">Детали профессии</h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Плюсы (каждый с новой строки)</label>
                                            <textarea rows={3} name="pros" value={detailsData.pros} onChange={handleChange} className="w-full px-2 py-1 text-sm border rounded resize-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Минусы (каждый с новой строки)</label>
                                            <textarea rows={3} name="cons" value={detailsData.cons} onChange={handleChange} className="w-full px-2 py-1 text-sm border rounded resize-none" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Навыки (каждый с новой строки)</label>
                                            <textarea rows={3} name="skills" value={detailsData.skills} onChange={handleChange} className="w-full px-2 py-1 text-sm border rounded resize-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Карьерный трек (каждый с новой строки)</label>
                                            <textarea rows={3} name="careerTrack" value={detailsData.careerTrack} onChange={handleChange} className="w-full px-2 py-1 text-sm border rounded resize-none" />
                                        </div>
                                    </div>

                                    <div className="mt-2">
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Один день из жизни</label>
                                        <textarea rows={2} name="dayInLife" value={detailsData.dayInLife} onChange={handleChange} className="w-full px-2 py-1 text-sm border rounded resize-none" />
                                    </div>

                                    <h5 className="text-xs font-bold text-slate-500 mt-4 mb-2">Зарплата Новичка (₽)</h5>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <input type="number" name="salaryNoviceFrom" value={detailsData.salaryNoviceFrom} onChange={handleChange} placeholder="От..." className="w-full px-2 py-1 text-sm border rounded" />
                                        </div>
                                        <div>
                                            <input type="number" name="salaryNoviceTo" value={detailsData.salaryNoviceTo} onChange={handleChange} placeholder="До..." className="w-full px-2 py-1 text-sm border rounded" />
                                        </div>
                                    </div>

                                    <h5 className="text-xs font-bold text-slate-500 mt-4 mb-2">Зарплата Опытного (₽)</h5>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <input type="number" name="salaryExperiencedFrom" value={detailsData.salaryExperiencedFrom} onChange={handleChange} placeholder="От..." className="w-full px-2 py-1 text-sm border rounded" />
                                        </div>
                                        <div>
                                            <input type="number" name="salaryExperiencedTo" value={detailsData.salaryExperiencedTo} onChange={handleChange} placeholder="До..." className="w-full px-2 py-1 text-sm border rounded" />
                                        </div>
                                    </div>

                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-1 mt-6">Проходные баллы в колледжах</h4>
                                    {collegesOfferingThis.length === 0 ? (
                                        <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200">
                                            Эта специальность пока не добавлена ни в один колледж. Сначала выберите её в карточке нужного колледжа.
                                        </p>
                                    ) : (
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                            {collegesOfferingThis.map(c => (
                                                <div key={c.id} className="flex items-center justify-between text-sm bg-slate-50 py-2 px-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                                                    <span className="text-slate-700 truncate mr-2" title={c.name}>{c.name}</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="Балл"
                                                        value={scoresDict[c.id] || ''}
                                                        onChange={(e) => setScoresDict({ ...scoresDict, [c.id]: e.target.value })}
                                                        className="w-20 px-2 py-1 text-xs border border-slate-200 rounded focus:ring-2 focus:ring-primary-500/20"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                </div>

                            </form>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-2xl">
                            <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
                                Отмена
                            </button>
                            <button type="submit" form="spec-form" disabled={saving} className="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 shadow-sm disabled:opacity-50 flex items-center">
                                {saving ? 'Сохранение...' : <><Save className="w-4 h-4 mr-2" /> Сохранить</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
