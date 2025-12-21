import { useForm } from 'react-hook-form';
import { Loader2, X, MapPin } from 'lucide-react';
import { useEffect } from 'react';
import clsx from 'clsx';

const HospitalForm = ({ isOpen, onClose, onSubmit, initialData, isSubmitting }) => {
    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
        defaultValues: {
            name: '',
            address: '',
            contact_person: '',
            contact_phone: '',
            contact_email: '',
            is_active: true
        }
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                reset(initialData);
            } else {
                reset({
                    name: '',
                    address: '',
                    contact_person: '',
                    contact_phone: '',
                    contact_email: '',
                    is_active: true
                });
            }
        }
    }, [isOpen, initialData, reset]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">
                        {initialData ? 'تعديل بيانات المستشفى' : 'إضافة مستشفى جديد'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Hospital Name */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستشفى</label>
                            <input
                                type="text"
                                {...register('name', { required: 'اسم المستشفى مطلوب' })}
                                className={clsx(
                                    "block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-colors",
                                    errors.name ? "border-red-300 bg-red-50" : "border-gray-200"
                                )}
                                placeholder="مثال: مستشفى السلام الدولي"
                            />
                            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                        </div>

                        {/* Contact Person */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الشخص المسؤول</label>
                            <input
                                type="text"
                                {...register('contact_person')}
                                className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="مدير العلاقات العامة"
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                            <input
                                type="tel"
                                dir="ltr"
                                {...register('contact_phone', { required: 'رقم الهاتف مطلوب' })}
                                className={clsx(
                                    "block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-colors text-right",
                                    errors.contact_phone ? "border-red-300 bg-red-50" : "border-gray-200"
                                )}
                                placeholder="01xxxxxxxxx"
                            />
                            {errors.contact_phone && <p className="mt-1 text-sm text-red-600">{errors.contact_phone.message}</p>}
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                            <input
                                type="email"
                                dir="ltr"
                                {...register('contact_email')}
                                className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-right"
                                placeholder="info@hospital.com"
                            />
                        </div>

                        {/* Address */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                            <input
                                type="text"
                                {...register('address', { required: 'العنوان مطلوب' })}
                                className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="العنوان بالتفصيل..."
                            />
                        </div>

                        {/* Status */}
                        <div className="col-span-2 flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                {...register('is_active')}
                                className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                            />
                            <label htmlFor="is_active" className="text-sm text-gray-700">المستشفى نشط حالياً</label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-600 border border-transparent rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                            {initialData ? 'حفظ التعديلات' : 'إضافة المستشفى'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default HospitalForm;
