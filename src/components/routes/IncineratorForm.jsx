import { useForm } from 'react-hook-form';
import { Loader2, X, FileText, Upload, File } from 'lucide-react';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

const IncineratorForm = ({ isOpen, onClose, onSubmit, initialData, isSubmitting }) => {
    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    const [licenseFile, setLicenseFile] = useState(null);
    const [contractFile, setContractFile] = useState(null);
    const [existingLicenseUrl, setExistingLicenseUrl] = useState(null);
    const [existingContractUrl, setExistingContractUrl] = useState(null);

    useEffect(() => {
        if (isOpen) {
            reset(initialData || {
                name: '',
                location: '',
                capacity_per_day: '',
                cost_per_kg: '',
                insurance_amount: '',
                commercial_register: '',
                tax_card: '',
                license_number: '',
                license_expiry_date: '',
                contract_expiry_date: '',
                is_active: true
            });
            
            if (initialData) {
                setExistingLicenseUrl(initialData.license_file_url || null);
                setExistingContractUrl(initialData.contract_file_url || null);
            } else {
                setLicenseFile(null);
                setContractFile(null);
                setExistingLicenseUrl(null);
                setExistingContractUrl(null);
            }
        }
    }, [isOpen, initialData, reset]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">
                        {initialData ? 'تعديل بيانات المحرقة' : 'إضافة محرقة جديدة'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit((data) => {
                    // إضافة الملفات للبيانات
                    const formDataWithFiles = {
                        ...data,
                        licenseFile: licenseFile,
                        contractFile: contractFile,
                        license_file_url: existingLicenseUrl,
                        contract_file_url: existingContractUrl
                    };
                    onSubmit(formDataWithFiles);
                })} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">اسم المحرقة</label>
                        <input
                            type="text"
                            {...register('name', { required: 'اسم المحرقة مطلوب' })}
                            className={clsx(
                                "block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none",
                                errors.name ? "border-red-300 bg-red-50" : "border-gray-200"
                            )}
                            placeholder="مثال: محرقة القاهرة الرئيسية"
                        />
                        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الموقع</label>
                        <input
                            type="text"
                            {...register('location', { required: 'الموقع مطلوب' })}
                            className={clsx(
                                "block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none",
                                errors.location ? "border-red-300 bg-red-50" : "border-gray-200"
                            )}
                            placeholder="مثال: القاهرة - مدينة نصر"
                        />
                        {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">السعة اليومية (كجم)</label>
                            <input
                                type="number"
                                step="0.01"
                                {...register('capacity_per_day', { min: 0 })}
                                className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="1000"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">التكلفة للكيلو (ج.م)</label>
                            <input
                                type="number"
                                step="0.01"
                                {...register('cost_per_kg', { required: 'التكلفة مطلوبة', min: 0 })}
                                className={clsx(
                                    "block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none",
                                    errors.cost_per_kg ? "border-red-300 bg-red-50" : "border-gray-200"
                                )}
                                placeholder="5.00"
                            />
                            {errors.cost_per_kg && <p className="mt-1 text-sm text-red-600">{errors.cost_per_kg.message}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ التأمين (ج.م)</label>
                        <input
                            type="number"
                            step="0.01"
                            {...register('insurance_amount', { min: 0 })}
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="0.00"
                        />
                    </div>

                    {/* قسم المستندات والوثائق */}
                    <div className="pt-4 border-t border-gray-200 space-y-4">
                        <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-brand-600" />
                            المستندات والوثائق
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">السجل التجاري</label>
                                <input
                                    type="text"
                                    {...register('commercial_register')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="رقم السجل التجاري"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">البطاقة الضريبية</label>
                                <input
                                    type="text"
                                    {...register('tax_card')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="رقم البطاقة الضريبية"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الرخصة</label>
                                <input
                                    type="text"
                                    {...register('license_number')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="رقم رخصة التشغيل"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ انتهاء الرخصة</label>
                                <input
                                    type="date"
                                    {...register('license_expiry_date')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                صورة أو ملف الرخصة (PDF, JPG, PNG)
                            </label>
                            
                            {existingLicenseUrl && !licenseFile ? (
                                <div className="border border-green-300 bg-green-50 rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <File className="w-4 h-4 text-green-600" />
                                            <div>
                                                <p className="text-sm font-medium text-green-900">ملف موجود</p>
                                                <a
                                                    href={existingLicenseUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-green-600 hover:underline"
                                                >
                                                    عرض الملف
                                                </a>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setExistingLicenseUrl(null)}
                                            className="text-gray-400 hover:text-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : licenseFile ? (
                                <div className="border border-blue-300 bg-blue-50 rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <File className="w-4 h-4 text-blue-600" />
                                            <div>
                                                <p className="text-sm font-medium text-blue-900">{licenseFile.name}</p>
                                                <p className="text-xs text-blue-600">{(licenseFile.size / 1024).toFixed(2)} KB</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setLicenseFile(null)}
                                            className="text-gray-400 hover:text-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-brand-400 transition-colors">
                                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <label className="cursor-pointer">
                                        <span className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                                            اختر ملف
                                        </span>
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    if (file.size > 5 * 1024 * 1024) {
                                                        alert('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت');
                                                        return;
                                                    }
                                                    setLicenseFile(file);
                                                }
                                            }}
                                            className="hidden"
                                        />
                                    </label>
                                    <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (حد أقصى 5 ميجا)</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ انتهاء عقد المحرقة</label>
                            <input
                                type="date"
                                {...register('contract_expiry_date')}
                                className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                صورة العقد (PDF, JPG, PNG)
                            </label>
                            
                            {existingContractUrl && !contractFile ? (
                                <div className="border border-green-300 bg-green-50 rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <File className="w-4 h-4 text-green-600" />
                                            <div>
                                                <p className="text-sm font-medium text-green-900">ملف موجود</p>
                                                <a
                                                    href={existingContractUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-green-600 hover:underline"
                                                >
                                                    عرض الملف
                                                </a>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setExistingContractUrl(null)}
                                            className="text-gray-400 hover:text-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : contractFile ? (
                                <div className="border border-blue-300 bg-blue-50 rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <File className="w-4 h-4 text-blue-600" />
                                            <div>
                                                <p className="text-sm font-medium text-blue-900">{contractFile.name}</p>
                                                <p className="text-xs text-blue-600">{(contractFile.size / 1024).toFixed(2)} KB</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setContractFile(null)}
                                            className="text-gray-400 hover:text-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-brand-400 transition-colors">
                                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <label className="cursor-pointer">
                                        <span className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                                            اختر ملف
                                        </span>
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    if (file.size > 5 * 1024 * 1024) {
                                                        alert('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت');
                                                        return;
                                                    }
                                                    setContractFile(file);
                                                }
                                            }}
                                            className="hidden"
                                        />
                                    </label>
                                    <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (حد أقصى 5 ميجا)</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                        <input
                            type="checkbox"
                            id="is_active"
                            {...register('is_active')}
                            className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                        />
                        <label htmlFor="is_active" className="text-sm text-gray-700">المحرقة نشطة حالياً</label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
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
                            {initialData ? 'حفظ التعديلات' : 'إضافة المحرقة'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default IncineratorForm;
