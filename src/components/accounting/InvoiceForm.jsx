import { useForm } from 'react-hook-form';
import { Loader2, X, Calculator } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import clsx from 'clsx';
import { format } from 'date-fns';

const InvoiceForm = ({ isOpen, onClose, onSubmit, initialData, isSubmitting }) => {
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
    const [hospitals, setHospitals] = useState([]);
    const [calculating, setCalculating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Fetch Hospitals
            const fetchHospitals = async () => {
                const { data } = await supabase.from('hospitals').select('id, name').eq('is_active', true);
                setHospitals(data || []);
            };

            fetchHospitals();

            // Set Defaults
            reset(initialData || {
                hospital_id: '',
                invoice_number: `INV-${Date.now().toString().slice(-6)}`, // Auto-generate simple ID
                invoice_date: format(new Date(), 'yyyy-MM-dd'),
                due_date: format(new Date(new Date().setDate(new Date().getDate() + 30)), 'yyyy-MM-dd'),
                total_amount: '',
                status: 'paid',
                notes: ''
            });
        }
    }, [isOpen, initialData, reset]);

    // Calculate total from routes
    const calculateTotal = async () => {
        const hospitalId = watch('hospital_id');
        if (!hospitalId) {
            alert('برجاء اختيار العميل أولاً');
            return;
        }

        setCalculating(true);
        try {
            // 1. Get active contract for this hospital
            const { data: contract, error: contractError } = await supabase
                .from('contracts')
                .select('id, price_per_kg')
                .eq('hospital_id', hospitalId)
                .eq('status', 'active')
                .single();

            if (contractError || !contract) {
                alert('لا يوجد عقد نشط لهذا العميل');
                return;
            }

            // 2. Get all completed routes with stops for this hospital
            const { data: allRoutes, error: routesError } = await supabase
                .from('routes')
                .select(`
                    id,
                    route_stops!inner(
                        weight_collected,
                        hospital_id
                    )
                `)
                .eq('status', 'completed')
                .eq('route_stops.hospital_id', hospitalId);

            if (routesError) {
                console.error('Error fetching routes:', routesError);
                alert('حدث خطأ أثناء جلب الرحلات');
                return;
            }

            // 3. Get already invoiced routes
            const { data: invoicedRoutes, error: invoicedError } = await supabase
                .from('invoice_routes')
                .select('route_id');

            if (invoicedError) {
                console.error('Error fetching invoiced routes:', invoicedError);
            }

            const invoicedRouteIds = new Set(invoicedRoutes?.map(ir => ir.route_id) || []);

            // 4. Filter out already invoiced routes and calculate total weight
            let totalWeight = 0;
            let uninvoicedRoutesCount = 0;

            allRoutes?.forEach(route => {
                if (!invoicedRouteIds.has(route.id)) {
                    uninvoicedRoutesCount++;
                    route.route_stops?.forEach(stop => {
                        if (stop.weight_collected) {
                            totalWeight += parseFloat(stop.weight_collected);
                        }
                    });
                }
            });

            // 5. Calculate total amount
            const totalAmount = totalWeight * parseFloat(contract.price_per_kg);

            if (totalWeight === 0) {
                alert('لا توجد رحلات غير مفوترة لهذا العميل');
                return;
            }

            // 6. Set the calculated amount
            setValue('total_amount', totalAmount.toFixed(2));
            alert(`تم الحساب:\nعدد الرحلات: ${uninvoicedRoutesCount}\nالوزن الإجمالي: ${totalWeight.toFixed(2)} كجم\nالسعر للكيلو: ${contract.price_per_kg} ج.م\nالمبلغ الإجمالي: ${totalAmount.toFixed(2)} ج.م`);

        } catch (e) {
            console.error('Error calculating total:', e);
            alert('حدث خطأ أثناء الحساب');
        } finally {
            setCalculating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">
                        {initialData ? 'تعديل فاتورة' : 'إنشاء فاتورة جديدة'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الفاتورة</label>
                            <input
                                type="text"
                                {...register('invoice_number', { required: 'مطلوب' })}
                                className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-right"
                                placeholder="INV-001"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                            <select
                                {...register('status')}
                                className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                            >
                                <option value="paid">مدفوعة</option>
                                <option value="overdue">متأخرة</option>
                                <option value="cancelled">ملغاة</option>
                            </select>
                        </div>
                    </div>

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
                        {errors.hospital_id && <p className="mt-1 text-sm text-red-600">{errors.hospital_id.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الإصدار</label>
                            <input
                                type="date"
                                {...register('invoice_date', { required: 'مطلوب' })}
                                className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الاستحقاق</label>
                            <input
                                type="date"
                                {...register('due_date', { required: 'مطلوب' })}
                                className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <label className="block text-sm font-medium text-gray-700">المبلغ الإجمالي (ج.م)</label>
                            <button
                                type="button"
                                onClick={calculateTotal}
                                className="text-xs text-brand-600 flex items-center gap-1 hover:underline"
                            >
                                <Calculator className="w-3 h-3" />
                                حساب من الرحلات
                            </button>
                        </div>
                        <input
                            type="number"
                            step="0.01"
                            {...register('total_amount', { required: 'المبلغ مطلوب', min: 0 })}
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none font-bold text-lg"
                            placeholder="0.00"
                        />
                        {calculating && <p className="text-xs text-brand-500 mt-1 animate-pulse">جاري الحساب...</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                        <textarea
                            {...register('notes')}
                            rows="2"
                            className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                        ></textarea>
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
                            حفظ الفاتورة
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InvoiceForm;
