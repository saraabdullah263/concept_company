import { useForm } from 'react-hook-form';
import { Loader2, X } from 'lucide-react';
import { useEffect } from 'react';
import clsx from 'clsx';
import { format } from 'date-fns';

const ExpenseForm = ({ isOpen, onClose, onSubmit, initialData, isSubmitting }) => {
    const { register, handleSubmit, reset, formState: { errors } } = useForm();

    useEffect(() => {
        if (isOpen) {
            reset(initialData || {
                description: '',
                amount: '',
                category: 'fuel',
                date: format(new Date(), 'yyyy-MM-dd')
            });
        }
    }, [isOpen, initialData, reset]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">
                        {initialData ? 'تعديل مصروف' : 'إضافة مصروف جديد'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">وصف المصروف</label>
                        <input
                            type="text"
                            {...register('description', { required: 'الوصف مطلوب' })}
                            className={clsx(
                                "block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none",
                                errors.description ? "border-red-300 bg-red-50" : "border-gray-200"
                            )}
                            placeholder="مثال: تموين سيارة رقم 123"
                        />
                        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ</label>
                            <input
                                type="number"
                                step="0.01"
                                {...register('amount', { required: 'المبلغ مطلوب', min: 0 })}
                                className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                            <input
                                type="date"
                                {...register('date', { required: 'التاريخ مطلوب' })}
                                className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
                        <select
                            {...register('category')}
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                        >
                            <option value="fuel">وقود</option>
                            <option value="maintenance">صيانة</option>
                            <option value="salaries">رواتب</option>
                            <option value="office">مكتبية</option>
                            <option value="other">أخرى</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 bg-transparent"
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
                </form>
            </div>
        </div>
    );
};

export default ExpenseForm;
