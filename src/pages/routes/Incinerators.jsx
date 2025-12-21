import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Plus, Search, Loader2, Edit, Trash2, Flame } from 'lucide-react';
import IncineratorForm from '../../components/routes/IncineratorForm';

const Incinerators = () => {
    const [incinerators, setIncinerators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIncinerator, setEditingIncinerator] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchIncinerators = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('incinerators')
                .select('*')
                .order('created_at', { ascending: false });

            if (searchTerm) {
                query = query.ilike('name', `%${searchTerm}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            setIncinerators(data || []);
        } catch (error) {
            console.error('Error fetching incinerators:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIncinerators();
    }, [searchTerm]);

    const handleCreate = () => {
        setEditingIncinerator(null);
        setIsModalOpen(true);
    };

    const handleEdit = (incinerator) => {
        setEditingIncinerator(incinerator);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('هل أنت متأكد من حذف هذه المحرقة؟')) {
            try {
                const { error } = await supabase.from('incinerators').delete().eq('id', id);
                if (error) throw error;
                setIncinerators(incinerators.filter(i => i.id !== id));
                alert('✅ تم حذف المحرقة بنجاح');
            } catch (error) {
                console.error('Error deleting incinerator:', error);
                alert('حدث خطأ أثناء الحذف: ' + error.message);
            }
        }
    };

    const handleSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            const cleanData = {
                name: data.name,
                location: data.location,
                capacity_per_day: data.capacity_per_day,
                cost_per_kg: data.cost_per_kg,
                is_active: data.is_active
            };

            if (editingIncinerator) {
                const { error } = await supabase
                    .from('incinerators')
                    .update(cleanData)
                    .eq('id', editingIncinerator.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('incinerators')
                    .insert([cleanData]);
                if (error) throw error;
            }

            await fetchIncinerators();
            setIsModalOpen(false);
            alert('✅ تم الحفظ بنجاح');
        } catch (error) {
            console.error('Error saving incinerator:', error);
            alert('حدث خطأ أثناء الحفظ: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">المحارق</h1>
                    <p className="text-sm text-gray-500 mt-1">إدارة المحارق ونقاط التخلص النهائي</p>
                </div>

                <button
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                    onClick={handleCreate}
                >
                    <Plus className="w-5 h-5" />
                    <span>إضافة محرقة</span>
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="بحث باسم المحرقة..."
                        className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {incinerators.map((incinerator) => (
                        <div
                            key={incinerator.id}
                            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 rounded-lg">
                                        <Flame className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{incinerator.name}</h3>
                                        <p className="text-xs text-gray-500">{incinerator.location}</p>
                                    </div>
                                </div>
                                <span
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        incinerator.is_active
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}
                                >
                                    {incinerator.is_active ? 'نشط' : 'غير نشط'}
                                </span>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">السعة اليومية:</span>
                                    <span className="font-medium text-gray-900">
                                        {incinerator.capacity_per_day?.toLocaleString() || '-'} كجم
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">التكلفة للكيلو:</span>
                                    <span className="font-medium text-gray-900">
                                        {incinerator.cost_per_kg?.toLocaleString() || '-'} ج.م
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => handleEdit(incinerator)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <Edit className="w-4 h-4" />
                                    تعديل
                                </button>
                                <button
                                    onClick={() => handleDelete(incinerator.id)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    حذف
                                </button>
                            </div>
                        </div>
                    ))}

                    {incinerators.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            لا توجد محارق مضافة حتى الآن.
                        </div>
                    )}
                </div>
            )}

            <IncineratorForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingIncinerator}
                isSubmitting={isSubmitting}
            />
        </div>
    );
};

export default Incinerators;
