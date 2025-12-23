import { useForm } from 'react-hook-form';
import { Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import clsx from 'clsx';

const VehicleForm = ({ isOpen, onClose, onSubmit, initialData, isSubmitting }) => {
    const [representatives, setRepresentatives] = useState([]);
    const [loadingReps, setLoadingReps] = useState(false);
    const { register, handleSubmit, reset, formState: { errors } } = useForm();

    useEffect(() => {
        if (isOpen) {
            // Fetch representatives
            const fetchRepresentatives = async () => {
                setLoadingReps(true);
                try {
                    const { data, error } = await supabase
                        .from('representatives')
                        .select(`
                            id,
                            users!user_id (
                                full_name
                            )
                        `)
                        .order('created_at', { ascending: false });

                    if (error) throw error;
                    setRepresentatives(data || []);
                } catch (error) {
                    console.error('Error fetching representatives:', error);
                } finally {
                    setLoadingReps(false);
                }
            };

            fetchRepresentatives();

            reset(initialData || {
                plate_number: '',
                model: '',
                capacity_kg: '',
                owner_representative_id: '',
                license_renewal_date: '',
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
                        {initialData ? 'تعديل مركبة' : 'إضافة مركبة جديدة'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">رقم اللوحة</label>
                        <input
                            type="text"
                            {...register('plate_number', { required: 'رقم اللوحة مطلوب' })}
                            className={clsx(
                                "block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-right",
                                errors.plate_number ? "border-red-300 bg-red-50" : "border-gray-200"
                            )}
                            placeholder="أ ب ج 123"
                        />
                        {errors.plate_number && <p className="mt-1 text-sm text-red-600">{errors.plate_number.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الموديل / النوع</label>
                        <input
                            type="text"
                            {...register('model')}
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="مثال: شيفروليه جامبو 2023"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الحمولة القصوى (كجم)</label>
                        <input
                            type="number"
                            {...register('capacity_kg', { required: 'الحمولة مطلوبة', min: 1 })}
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="5000"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">مالك المركبة (المندوب)</label>
                        <select
                            {...register('owner_representative_id')}
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                            disabled={loadingReps}
                        >
                            <option value="">اختر المندوب...</option>
                            {representatives.map(rep => (
                                <option key={rep.id} value={rep.id}>
                                    {rep.users?.full_name || 'مندوب'}
                                </option>
                            ))}
                        </select>
                        {loadingReps && <p className="text-xs text-gray-500 mt-1">جاري تحميل المندوبين...</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ تجديد الرخصة</label>
                        <input
                            type="date"
                            {...register('license_renewal_date')}
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">سيتم تنبيهك قبل انتهاء الرخصة</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_active"
                            {...register('is_active')}
                            className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                        />
                        <label htmlFor="is_active" className="text-sm text-gray-700">المركبة جاهزة للعمل</label>
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

export default VehicleForm;
