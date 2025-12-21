import { useForm } from 'react-hook-form';
import { Loader2, X } from 'lucide-react';
import { useEffect } from 'react';
import clsx from 'clsx';

const IncineratorForm = ({ isOpen, onClose, onSubmit, initialData, isSubmitting }) => {
    const { register, handleSubmit, reset, formState: { errors } } = useForm();

    useEffect(() => {
        if (isOpen) {
            reset(initialData || {
                name: '',
                location: '',
                capacity_per_day: '',
                cost_per_kg: '',
                is_active: true
            });
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

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
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

                    <div className="flex items-center gap-2">
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
