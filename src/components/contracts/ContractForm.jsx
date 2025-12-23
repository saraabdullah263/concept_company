import { useForm } from 'react-hook-form';
import { Loader2, X, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import clsx from 'clsx';
import { format } from 'date-fns';
import { generateNewContractPDF } from '../../services/pdfGenerator';

const ContractForm = ({ isOpen, onClose, onSubmit, initialData, isSubmitting }) => {
    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
    const [hospitals, setHospitals] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [isPrinting, setIsPrinting] = useState(false);

    const watchHospitalId = watch('hospital_id');

    useEffect(() => {
        if (isOpen) {
            const fetchHospitals = async () => {
                const { data } = await supabase
                    .from('hospitals')
                    .select('*')
                    .eq('is_active', true);
                setHospitals(data || []);
            };

            fetchHospitals();

            reset(initialData || {
                contract_number: `CON-${Date.now().toString().slice(-6)}`,
                hospital_id: '',
                start_date: format(new Date(), 'yyyy-MM-dd'),
                end_date: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd'),
                price_per_kg: '',
                contract_fees: '0',
                contract_duration: 'سنة واحدة',
                status: 'active',
                // حقول العميل الإضافية
                client_activity: '',
                commercial_register: '',
                tax_number: '',
                manager_name: ''
            });
        }
    }, [isOpen, initialData, reset]);

    // تحديث بيانات العميل عند اختياره
    useEffect(() => {
        if (watchHospitalId && hospitals.length > 0) {
            const hospital = hospitals.find(h => h.id === watchHospitalId);
            setSelectedHospital(hospital);
        }
    }, [watchHospitalId, hospitals]);

    const handlePrintContract = async () => {
        const formData = watch();
        
        if (!formData.hospital_id) {
            alert('يرجى اختيار العميل أولاً');
            return;
        }

        setIsPrinting(true);
        try {
            const hospital = hospitals.find(h => h.id === formData.hospital_id);
            
            await generateNewContractPDF({
                contractNumber: formData.contract_number,
                contractDate: format(new Date(formData.start_date), 'yyyy/MM/dd'),
                startDate: format(new Date(formData.start_date), 'yyyy/MM/dd'),
                endDate: format(new Date(formData.end_date), 'yyyy/MM/dd'),
                clientName: hospital?.name || '',
                clientActivity: formData.client_activity || hospital?.activity || '',
                clientAddress: hospital?.address || '',
                commercialRegister: formData.commercial_register || hospital?.commercial_register || '',
                taxNumber: formData.tax_number || hospital?.tax_number || '',
                pricePerKg: formData.price_per_kg || '',
                contractFees: formData.contract_fees || '0',
                contractDuration: formData.contract_duration || 'سنة واحدة',
                phoneNumbers: hospital?.contact_phone || '',
                managerName: formData.manager_name || hospital?.manager_name || '',
                minWeight: formData.min_weight || '15',
                minPrice: formData.min_price || ''
            });
        } catch (error) {
            console.error('Error printing contract:', error);
            alert('حدث خطأ أثناء طباعة العقد');
        } finally {
            setIsPrinting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
                    <h2 className="text-xl font-bold text-gray-900">
                        {initialData ? 'تعديل عقد' : 'إضافة عقد جديد'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                    {/* رقم العقد وتاريخه */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">رقم العقد</label>
                            <input
                                type="text"
                                {...register('contract_number', { required: 'رقم العقد مطلوب' })}
                                className={clsx(
                                    "block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none",
                                    errors.contract_number ? "border-red-300 bg-red-50" : "border-gray-200"
                                )}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ العقد</label>
                            <input
                                type="date"
                                {...register('start_date', { required: 'مطلوب' })}
                                className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* اختيار العميل */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">العميل</label>
                        <select
                            {...register('hospital_id', { required: 'العميل مطلوب' })}
                            className={clsx(
                                "block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white",
                                errors.hospital_id ? "border-red-300 bg-red-50" : "border-gray-200"
                            )}
                        >
                            <option value="">اختر العميل...</option>
                            {hospitals.map(h => (
                                <option key={h.id} value={h.id}>{h.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* بيانات العميل الإضافية */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        <h3 className="font-medium text-gray-900 border-b pb-2">بيانات العميل للعقد</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">نشاط العميل</label>
                                <input
                                    type="text"
                                    {...register('client_activity')}
                                    placeholder={selectedHospital?.activity || 'مثال: مستشفى خاص'}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المدير المسئول</label>
                                <input
                                    type="text"
                                    {...register('manager_name')}
                                    placeholder={selectedHospital?.manager_name || ''}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">السجل التجاري</label>
                                <input
                                    type="text"
                                    {...register('commercial_register')}
                                    placeholder={selectedHospital?.commercial_register || ''}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الرقم الضريبي</label>
                                <input
                                    type="text"
                                    {...register('tax_number')}
                                    placeholder={selectedHospital?.tax_number || ''}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* تفاصيل العقد */}
                    <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                        <h3 className="font-medium text-gray-900 border-b border-blue-200 pb-2">تفاصيل العقد</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">سعر الكيلو (ج.م)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register('price_per_kg', { required: 'السعر مطلوب', min: 0 })}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">رسوم التعاقد (ج.م)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register('contract_fees')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى للنقلة (كجم)</label>
                                <input
                                    type="number"
                                    {...register('min_weight')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="15"
                                    defaultValue="15"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى لسعر النقلة (ج.م)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register('min_price')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">مدة العقد</label>
                                <select
                                    {...register('contract_duration')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                                >
                                    <option value="3 أشهر">3 أشهر</option>
                                    <option value="6 أشهر">6 أشهر</option>
                                    <option value="سنة واحدة">سنة واحدة</option>
                                    <option value="سنتين">سنتين</option>
                                    <option value="3 سنوات">3 سنوات</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء</label>
                                <input
                                    type="date"
                                    {...register('end_date', { required: 'مطلوب' })}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">حالة العقد</label>
                            <select
                                {...register('status')}
                                className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                            >
                                <option value="active">ساري</option>
                                <option value="expired">منتهي</option>
                                <option value="terminated">ملغي (فسخ عقد)</option>
                            </select>
                        </div>
                    </div>

                    {/* ملاحظات */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                        <textarea
                            {...register('notes')}
                            rows={3}
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="أي ملاحظات إضافية..."
                        />
                    </div>

                    {/* الأزرار */}
                    <div className="flex justify-between gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={handlePrintContract}
                            disabled={isPrinting}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 disabled:opacity-70"
                        >
                            {isPrinting ? (
                                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                            ) : (
                                <FileText className="w-4 h-4 ml-2" />
                            )}
                            طباعة العقد PDF
                        </button>
                        
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-600 border border-transparent rounded-lg hover:bg-brand-700 disabled:opacity-70"
                            >
                                {isSubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                                حفظ
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ContractForm;
