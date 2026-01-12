import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Plus, Search, Loader2, Edit, Trash2, Flame, Eye, MapPin, X, FileText } from 'lucide-react';
import IncineratorForm from '../../components/routes/IncineratorForm';

const Incinerators = () => {
    const [incinerators, setIncinerators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [editingIncinerator, setEditingIncinerator] = useState(null);
    const [viewingIncinerator, setViewingIncinerator] = useState(null);
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

    const handleView = (incinerator) => {
        setViewingIncinerator(incinerator);
        setIsViewModalOpen(true);
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

    const handleSubmit = async (formData) => {
        setIsSubmitting(true);
        try {
            let licenseFileUrl = formData.license_file_url || null;
            let licenseFileName = null;
            let contractFileUrl = formData.contract_file_url || null;
            let contractFileName = null;

            const incineratorId = editingIncinerator?.id || `temp_${Date.now()}`;

            // رفع ملف الرخصة إذا كان موجوداً
            if (formData.licenseFile) {
                const file = formData.licenseFile;
                const fileExt = file.name.split('.').pop();
                const fileName = `license_${Date.now()}.${fileExt}`;
                const filePath = `incinerator-documents/${incineratorId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('medical-waste')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error('Error uploading license file:', uploadError);
                    alert('حدث خطأ أثناء رفع ملف الرخصة');
                    setIsSubmitting(false);
                    return;
                }

                const { data: urlData } = supabase.storage
                    .from('medical-waste')
                    .getPublicUrl(filePath);

                licenseFileUrl = urlData.publicUrl;
                licenseFileName = file.name;
            }

            // رفع ملف العقد إذا كان موجوداً
            if (formData.contractFile) {
                const file = formData.contractFile;
                const fileExt = file.name.split('.').pop();
                const fileName = `contract_${Date.now()}.${fileExt}`;
                const filePath = `incinerator-documents/${incineratorId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('medical-waste')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error('Error uploading contract file:', uploadError);
                    alert('حدث خطأ أثناء رفع ملف العقد');
                    setIsSubmitting(false);
                    return;
                }

                const { data: urlData } = supabase.storage
                    .from('medical-waste')
                    .getPublicUrl(filePath);

                contractFileUrl = urlData.publicUrl;
                contractFileName = file.name;
            }

            const cleanData = {
                name: formData.name,
                location: formData.location,
                capacity_per_day: formData.capacity_per_day,
                cost_per_kg: formData.cost_per_kg,
                insurance_amount: formData.insurance_amount || 0,
                commercial_register: formData.commercial_register || null,
                tax_card: formData.tax_card || null,
                license_number: formData.license_number || null,
                license_expiry_date: formData.license_expiry_date || null,
                license_file_url: licenseFileUrl,
                license_file_name: licenseFileName,
                contract_expiry_date: formData.contract_expiry_date || null,
                contract_file_url: contractFileUrl,
                contract_file_name: contractFileName,
                is_active: formData.is_active
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
                <div className="grid grid-cols-1 gap-4">
                    {incinerators.map((incinerator) => (
                        <div
                            key={incinerator.id}
                            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
                        >
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                {/* Header & Main Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 flex-wrap mb-3">
                                        <div className="p-2 bg-orange-100 rounded-lg">
                                            <Flame className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">{incinerator.name}</h3>
                                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                                <MapPin className="w-4 h-4" />
                                                {incinerator.location}
                                            </p>
                                        </div>
                                        <span
                                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                incinerator.is_active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}
                                        >
                                            {incinerator.is_active ? 'نشط' : 'غير نشط'}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <span className="text-gray-400">السعة اليومية:</span>
                                            <span className="font-bold text-gray-900">
                                                {incinerator.capacity_per_day?.toLocaleString() || '-'} كجم
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-gray-400">التكلفة/كجم:</span>
                                            <span className="font-bold text-gray-900">
                                                {incinerator.cost_per_kg?.toLocaleString() || '-'} ج.م
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-gray-400">التأمين:</span>
                                            <span className="font-bold text-gray-900">
                                                {incinerator.insurance_amount?.toLocaleString() || '0'} ج.م
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleView(incinerator)}
                                        className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                        title="عرض التفاصيل"
                                    >
                                        <Eye className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleEdit(incinerator)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="تعديل"
                                    >
                                        <Edit className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(incinerator.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="حذف"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
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

            {/* View Details Modal */}
            {isViewModalOpen && viewingIncinerator && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
                            <h2 className="text-xl font-bold text-gray-900">تفاصيل المحرقة</h2>
                            <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">المعلومات الأساسية</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-500">اسم المحرقة</label>
                                        <p className="text-base font-medium text-gray-900">{viewingIncinerator.name}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">الموقع</label>
                                        <p className="text-base font-medium text-gray-900">{viewingIncinerator.location}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">السعة اليومية</label>
                                        <p className="text-base font-medium text-gray-900">{viewingIncinerator.capacity_per_day?.toLocaleString() || '-'} كجم</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">التكلفة للكيلو</label>
                                        <p className="text-base font-medium text-gray-900">{viewingIncinerator.cost_per_kg?.toLocaleString() || '-'} ج.م</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">مبلغ التأمين</label>
                                        <p className="text-base font-medium text-gray-900">{viewingIncinerator.insurance_amount?.toLocaleString() || '0'} ج.م</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-500">الحالة</label>
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${viewingIncinerator.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {viewingIncinerator.is_active ? 'نشط' : 'غير نشط'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Documents */}
                            {(viewingIncinerator.commercial_register || viewingIncinerator.tax_card || viewingIncinerator.license_number) && (
                                <div className="space-y-4 pt-4 border-t">
                                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">المستندات والوثائق</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {viewingIncinerator.commercial_register && (
                                            <div>
                                                <label className="text-sm text-gray-500">السجل التجاري</label>
                                                <p className="text-base font-medium text-gray-900">{viewingIncinerator.commercial_register}</p>
                                            </div>
                                        )}
                                        {viewingIncinerator.tax_card && (
                                            <div>
                                                <label className="text-sm text-gray-500">البطاقة الضريبية</label>
                                                <p className="text-base font-medium text-gray-900">{viewingIncinerator.tax_card}</p>
                                            </div>
                                        )}
                                        {viewingIncinerator.license_number && (
                                            <div>
                                                <label className="text-sm text-gray-500">رقم الرخصة</label>
                                                <p className="text-base font-medium text-gray-900">{viewingIncinerator.license_number}</p>
                                            </div>
                                        )}
                                        {viewingIncinerator.license_expiry_date && (
                                            <div>
                                                <label className="text-sm text-gray-500">تاريخ انتهاء الرخصة</label>
                                                <p className="text-base font-medium text-gray-900">{new Date(viewingIncinerator.license_expiry_date).toLocaleDateString('ar-EG')}</p>
                                            </div>
                                        )}
                                        {viewingIncinerator.contract_expiry_date && (
                                            <div>
                                                <label className="text-sm text-gray-500">تاريخ انتهاء العقد</label>
                                                <p className="text-base font-medium text-gray-900">{new Date(viewingIncinerator.contract_expiry_date).toLocaleDateString('ar-EG')}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Files */}
                                    {(viewingIncinerator.license_file_url || viewingIncinerator.contract_file_url) && (
                                        <div className="space-y-2 pt-2">
                                            {viewingIncinerator.license_file_url && (
                                                <a
                                                    href={viewingIncinerator.license_file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    عرض ملف الرخصة
                                                </a>
                                            )}
                                            {viewingIncinerator.contract_file_url && (
                                                <a
                                                    href={viewingIncinerator.contract_file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm text-green-600 bg-green-50 rounded-lg hover:bg-green-100 mr-2"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    عرض ملف العقد
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
                            <button
                                onClick={() => setIsViewModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                إغلاق
                            </button>
                            <button
                                onClick={() => {
                                    setIsViewModalOpen(false);
                                    handleEdit(viewingIncinerator);
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700"
                            >
                                تعديل
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Incinerators;
