import { useForm } from 'react-hook-form';
import { Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import clsx from 'clsx';
import { format } from 'date-fns';

const ContractForm = ({ isOpen, onClose, onSubmit, initialData, isSubmitting }) => {
    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    const [hospitals, setHospitals] = useState([]);

    useEffect(() => {
        if (isOpen) {
            // Fetch Hospitals for Dropdown
            const fetchHospitals = async () => {
                const { data } = await supabase.from('hospitals').select('id, name').eq('is_active', true);
                setHospitals(data || []);
            };

            fetchHospitals();

            // Reset Form
            reset(initialData || {
                contract_number: `CON-${Date.now().toString().slice(-6)}`,
                hospital_id: '',
                start_date: format(new Date(), 'yyyy-MM-dd'),
                end_date: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd'),
                price_per_kg: '',
                status: 'active'
            });
        }
    }, [isOpen, initialData, reset]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">
                        {initialData ? 'تعديل عقد' : 'إضافة عقد جديد'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">رقم العقد</label>
                        <input
                            type="text"
                            {...register('contract_number', { required: 'رقم العقد مطلوب' })}
                            className={clsx(
                                "block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none",
                                errors.contract_number ? "border-red-300 bg-red-50" : "border-gray-200"
                            )}
                            placeholder="مثال: CON-2024-001"
                        />
                        {errors.contract_number && <p className="mt-1 text-sm text-red-600">{errors.contract_number.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">المستشفى</label>
                        <select
                            {...register('hospital_id', { required: 'المستشفى مطلوب' })}
                            className={clsx(
                                "block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white",
                                errors.hospital_id ? "border-red-300 bg-red-50" : "border-gray-200"
                            )}
                        >
                            <option value="">اختر المستشفى...</option>
                            {hospitals.map(h => (
                                <option key={h.id} value={h.id}>{h.name}</option>
                            ))}
                        </select>
                        {errors.hospital_id && <p className="mt-1 text-sm text-red-600">{errors.hospital_id.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البدء</label>
                            <input
                                type="date"
                                {...register('start_date', { required: 'مطلوب' })}
                                className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            />
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

export default ContractForm;
