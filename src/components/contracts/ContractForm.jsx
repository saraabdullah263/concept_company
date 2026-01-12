import { useForm } from 'react-hook-form';
import { Loader2, X, FileText, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import clsx from 'clsx';
import { format } from 'date-fns';
import { generateNewContractPDF } from '../../services/pdfGenerator';

const ContractForm = ({ isOpen, onClose, onSubmit, initialData, isSubmitting }) => {
    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm();
    const [hospitals, setHospitals] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [customClauses, setCustomClauses] = useState([]);
    const [newClauseTitle, setNewClauseTitle] = useState('');
    const [newClauseContent, setNewClauseContent] = useState('');
    const [hospitalSearch, setHospitalSearch] = useState('');
    const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);

    const watchHospitalId = watch('hospital_id');
    const watchStartDate = watch('start_date');
    const watchEndDate = watch('end_date');

    useEffect(() => {
        if (isOpen) {
            const fetchHospitals = async () => {
                const { data } = await supabase
                    .from('hospitals')
                    .select('*')
                    .eq('is_active', true);
                setHospitals(data || []);
                
                // تحديد العميل المختار إذا كان في وضع التعديل
                if (initialData?.hospital_id && data) {
                    const hospital = data.find(h => h.id === initialData.hospital_id);
                    setSelectedHospital(hospital || null);
                    setHospitalSearch(hospital?.name || '');
                }
            };

            fetchHospitals();

            // Reset البنود المخصصة أولاً
            if (initialData?.custom_clauses) {
                try {
                    const clauses = typeof initialData.custom_clauses === 'string' 
                        ? JSON.parse(initialData.custom_clauses) 
                        : initialData.custom_clauses;
                    setCustomClauses(Array.isArray(clauses) ? clauses : []);
                } catch {
                    setCustomClauses([]);
                }
            } else {
                setCustomClauses([]);
            }

            // Reset النموذج
            reset(initialData || {
                hospital_id: '',
                start_date: format(new Date(), 'yyyy-MM-dd'),
                end_date: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd'),
                price_per_kg: '',
                contract_fees: '0',
                contract_duration: 'سنة واحدة',
                status: 'active',
                // حقول العميل الإضافية
                license_number: '',
                license_expiry_date: '',
                client_activity: '',
                commercial_register: '',
                tax_number: '',
                manager_name: '',
                custom_clauses: []
            });
            
            // Reset حقول البند الجديد
            setNewClauseTitle('');
            setNewClauseContent('');
        } else {
            // عند إغلاق النموذج، نظف كل شيء
            setCustomClauses([]);
            setSelectedHospital(null);
            setNewClauseTitle('');
            setNewClauseContent('');
            setHospitalSearch('');
            setShowHospitalDropdown(false);
        }
    }, [isOpen, initialData, reset]);

    // تحديث بيانات العميل عند اختياره
    useEffect(() => {
        if (watchHospitalId && hospitals.length > 0) {
            const hospital = hospitals.find(h => h.id === watchHospitalId);
            setSelectedHospital(hospital);
            if (hospital) {
                setHospitalSearch(hospital.name);
                // تعبئة حقول الرخصة تلقائياً
                if (hospital.license_number) {
                    setValue('license_number', hospital.license_number);
                }
                if (hospital.license_expiry_date) {
                    setValue('license_expiry_date', hospital.license_expiry_date);
                }
            }
        }
    }, [watchHospitalId, hospitals, setValue]);

    // فلترة العملاء حسب البحث
    const filteredHospitals = hospitals.filter(h => 
        h.name.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
        (h.city && h.city.toLowerCase().includes(hospitalSearch.toLowerCase())) ||
        (h.governorate && h.governorate.toLowerCase().includes(hospitalSearch.toLowerCase()))
    );

    // اختيار عميل من القائمة
    const selectHospital = (hospital) => {
        setValue('hospital_id', hospital.id);
        setSelectedHospital(hospital);
        setHospitalSearch(hospital.name);
        setShowHospitalDropdown(false);
    };

    // إغلاق الـ dropdown عند الضغط خارجه
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.hospital-search-container')) {
                setShowHospitalDropdown(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // تحديث حالة العقد تلقائياً عند انتهاء التاريخ
    useEffect(() => {
        if (watchEndDate) {
            const endDate = new Date(watchEndDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            
            // لو تاريخ الانتهاء النهارده أو قبل كده، يبقى منتهي
            if (endDate <= today) {
                setValue('status', 'expired');
            } else if (watch('status') === 'expired' && endDate > today) {
                // لو الحالة منتهي والتاريخ بعد النهارده، يرجعها ساري
                setValue('status', 'active');
            }
        }
    }, [watchEndDate, setValue, watch]);

    // إضافة بند مخصص جديد
    const addCustomClause = () => {
        if (newClauseTitle.trim() && newClauseContent.trim()) {
            setCustomClauses([...customClauses, {
                id: Date.now(),
                title: newClauseTitle.trim(),
                content: newClauseContent.trim()
            }]);
            setNewClauseTitle('');
            setNewClauseContent('');
        }
    };

    // حذف بند مخصص
    const removeCustomClause = (id) => {
        setCustomClauses(customClauses.filter(c => c.id !== id));
    };

    const handlePrintContract = async () => {
        const formData = watch();
        
        if (!formData.hospital_id) {
            alert('يرجى اختيار العميل أولاً');
            return;
        }

        setIsPrinting(true);
        try {
            const hospital = hospitals.find(h => h.id === formData.hospital_id);
            
            // Debug: تحقق من البنود قبل الإرسال
            console.log('Custom Clauses to send:', customClauses);
            
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
                minPrice: formData.min_price || '',
                customClauses: customClauses
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

                <form onSubmit={handleSubmit((data) => onSubmit({ ...data, custom_clauses: customClauses }))} className="p-6 space-y-6">
                    {/* تاريخ العقد */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ العقد</label>
                        <input
                            type="date"
                            {...register('start_date', { required: 'مطلوب' })}
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>

                    {/* اختيار العميل مع البحث */}
                    <div className="relative hospital-search-container">
                        <label className="block text-sm font-medium text-gray-700 mb-1">العميل</label>
                        <input type="hidden" {...register('hospital_id', { required: 'العميل مطلوب' })} />
                        <div className="relative">
                            <input
                                type="text"
                                value={hospitalSearch}
                                onChange={(e) => {
                                    setHospitalSearch(e.target.value);
                                    setShowHospitalDropdown(true);
                                    if (!e.target.value) {
                                        setValue('hospital_id', '');
                                        setSelectedHospital(null);
                                    }
                                }}
                                onFocus={() => setShowHospitalDropdown(true)}
                                placeholder="ابحث عن العميل..."
                                className={clsx(
                                    "block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none",
                                    errors.hospital_id ? "border-red-300 bg-red-50" : "border-gray-200"
                                )}
                            />
                            {hospitalSearch && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setHospitalSearch('');
                                        setValue('hospital_id', '');
                                        setSelectedHospital(null);
                                    }}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        
                        {/* Dropdown القائمة */}
                        {showHospitalDropdown && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filteredHospitals.length > 0 ? (
                                    filteredHospitals.map(h => (
                                        <button
                                            key={h.id}
                                            type="button"
                                            onClick={() => selectHospital(h)}
                                            className={clsx(
                                                "w-full px-3 py-2 text-right hover:bg-brand-50 transition-colors border-b border-gray-100 last:border-0",
                                                selectedHospital?.id === h.id && "bg-brand-50"
                                            )}
                                        >
                                            <div className="font-medium text-gray-900">{h.name}</div>
                                            {(h.city || h.governorate) && (
                                                <div className="text-xs text-gray-500">
                                                    {h.city}{h.city && h.governorate && ' - '}{h.governorate}
                                                </div>
                                            )}
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-3 py-4 text-center text-gray-500 text-sm">
                                        لا يوجد عملاء مطابقين
                                    </div>
                                )}
                            </div>
                        )}
                        {errors.hospital_id && <p className="mt-1 text-sm text-red-600">{errors.hospital_id.message}</p>}
                    </div>

                    {/* بيانات العميل الإضافية */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        <h3 className="font-medium text-gray-900 border-b pb-2">بيانات العميل للعقد</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الرخصة</label>
                                <input
                                    type="text"
                                    {...register('license_number')}
                                    placeholder={selectedHospital?.license_number || 'رقم رخصة مزاولة المهنة'}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                                    readOnly
                                />
                                <p className="text-xs text-gray-500 mt-1">رخصة مزاولة النشاط الطبي (من بيانات العميل)</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ انتهاء الرخصة</label>
                                <input
                                    type="date"
                                    {...register('license_expiry_date')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                                    readOnly
                                />
                                <p className="text-xs text-gray-500 mt-1">تاريخ انتهاء صلاحية الرخصة (من بيانات العميل)</p>
                            </div>
                        </div>

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
                                    {...register('end_date', { 
                                        required: 'مطلوب',
                                        validate: (value) => {
                                            if (!watchStartDate) return true;
                                            return new Date(value) >= new Date(watchStartDate) || 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية';
                                        }
                                    })}
                                    min={watchStartDate}
                                    className={clsx(
                                        "block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none",
                                        errors.end_date ? "border-red-300 bg-red-50" : "border-gray-200"
                                    )}
                                />
                                {errors.end_date && <p className="mt-1 text-sm text-red-600">{errors.end_date.message}</p>}
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
                                <option value="renewal">تجديد</option>
                                <option value="terminated">ملغي (فسخ عقد)</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                اختر "تجديد" للعقود المنتهية التي تريد تجديدها
                            </p>
                        </div>
                    </div>

                    {/* البنود المخصصة */}
                    <div className="bg-amber-50 p-4 rounded-lg space-y-4">
                        <h3 className="font-medium text-gray-900 border-b border-amber-200 pb-2">بنود إضافية مخصصة</h3>
                        <p className="text-sm text-gray-600">يمكنك إضافة بنود خاصة تظهر في العقد المطبوع</p>
                        
                        {/* البنود المضافة */}
                        {customClauses.length > 0 && (
                            <div className="space-y-3">
                                {customClauses.map((clause, index) => (
                                    <div key={clause.id} className="bg-white p-3 rounded-lg border border-amber-200">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-900 text-sm">
                                                    بند إضافي ({index + 1}): {clause.title}
                                                </h4>
                                                <p className="text-sm text-gray-600 mt-1">{clause.content}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeCustomClause(clause.id)}
                                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* إضافة بند جديد */}
                        <div className="bg-white p-3 rounded-lg border border-dashed border-amber-300">
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={newClauseTitle}
                                    onChange={(e) => setNewClauseTitle(e.target.value)}
                                    placeholder="عنوان البند (مثال: شروط خاصة بالدفع)"
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                                />
                                <textarea
                                    value={newClauseContent}
                                    onChange={(e) => setNewClauseContent(e.target.value)}
                                    placeholder="محتوى البند..."
                                    rows={2}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={addCustomClause}
                                    disabled={!newClauseTitle.trim() || !newClauseContent.trim()}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Plus className="w-4 h-4" />
                                    إضافة البند
                                </button>
                            </div>
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
