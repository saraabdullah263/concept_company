import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
    Loader2, Flame, Plus, Search, Calendar, DollarSign, 
    TrendingUp, TrendingDown, FileText, X, Filter
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import clsx from 'clsx';

const IncineratorAccounts = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [incinerators, setIncinerators] = useState([]);
    const [selectedIncinerator, setSelectedIncinerator] = useState(null);
    const [accountData, setAccountData] = useState(null);
    const [payments, setPayments] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dateFilter, setDateFilter] = useState({
        from: '',
        to: ''
    });

    const { register, handleSubmit, reset, formState: { errors } } = useForm();

    useEffect(() => {
        fetchIncinerators();
    }, []);

    useEffect(() => {
        if (selectedIncinerator) {
            fetchAccountData(selectedIncinerator.id);
        }
    }, [selectedIncinerator, dateFilter]);

    const fetchIncinerators = async () => {
        try {
            const { data, error } = await supabase
                .from('incinerators')
                .select('*')
                .eq('is_active', true)
                .order('name');
            
            if (error) throw error;
            setIncinerators(data || []);
            if (data && data.length > 0) {
                setSelectedIncinerator(data[0]);
            }
        } catch (error) {
            console.error('Error fetching incinerators:', error);
        } finally {
            setLoading(false);
        }
    };


    const fetchAccountData = async (incineratorId) => {
        try {
            setLoading(true);
            
            // بناء query التسليمات مع الفلترة
            let deliveriesQuery = supabase
                .from('incinerator_deliveries')
                .select('*, routes(route_date)')
                .eq('incinerator_id', incineratorId)
                .order('created_at', { ascending: false });

            if (dateFilter.from) {
                deliveriesQuery = deliveriesQuery.gte('created_at', dateFilter.from);
            }
            if (dateFilter.to) {
                deliveriesQuery = deliveriesQuery.lte('created_at', dateFilter.to + 'T23:59:59');
            }

            const { data: deliveriesData, error: deliveriesError } = await deliveriesQuery;
            if (deliveriesError) throw deliveriesError;

            // بناء query المدفوعات مع الفلترة
            let paymentsQuery = supabase
                .from('incinerator_payments')
                .select('*')
                .eq('incinerator_id', incineratorId)
                .order('payment_date', { ascending: false });

            if (dateFilter.from) {
                paymentsQuery = paymentsQuery.gte('payment_date', dateFilter.from);
            }
            if (dateFilter.to) {
                paymentsQuery = paymentsQuery.lte('payment_date', dateFilter.to);
            }

            const { data: paymentsData, error: paymentsError } = await paymentsQuery;
            if (paymentsError) throw paymentsError;

            // حساب الإجماليات
            const totalDelivered = (deliveriesData || []).reduce((sum, d) => sum + (d.weight_delivered || 0), 0);
            // حساب التكلفة: لو total_cost موجود استخدمه، لو لأ احسبه من الوزن × سعر الكيلو
            const totalCost = (deliveriesData || []).reduce((sum, d) => {
                if (d.total_cost) return sum + d.total_cost;
                // لو مفيش total_cost، احسبه من الوزن × سعر الكيلو للمحرقة
                const costPerKg = selectedIncinerator?.cost_per_kg || 0;
                return sum + ((d.weight_delivered || 0) * costPerKg);
            }, 0);
            const totalPaid = (paymentsData || []).reduce((sum, p) => sum + (p.amount || 0), 0);
            const balance = totalCost - totalPaid;

            setDeliveries(deliveriesData || []);
            setPayments(paymentsData || []);
            setAccountData({
                totalDelivered,
                totalCost,
                totalPaid,
                balance,
                deliveriesCount: (deliveriesData || []).length,
                paymentsCount: (paymentsData || []).length
            });
        } catch (error) {
            console.error('Error fetching account data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSubmit = async (data) => {
        if (!selectedIncinerator) return;
        
        setIsSubmitting(true);
        try {
            const paymentData = {
                incinerator_id: selectedIncinerator.id,
                amount: parseFloat(data.amount),
                payment_date: data.payment_date,
                payment_method: data.payment_method,
                reference_number: data.reference_number || null,
                notes: data.notes || null,
                created_by: user?.id
            };

            const { error } = await supabase
                .from('incinerator_payments')
                .insert([paymentData]);

            if (error) throw error;

            alert('✅ تم تسجيل الدفعة بنجاح');
            setShowPaymentModal(false);
            reset();
            fetchAccountData(selectedIncinerator.id);
        } catch (error) {
            console.error('Error saving payment:', error);
            alert('حدث خطأ: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openPaymentModal = () => {
        reset({
            amount: '',
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: 'cash',
            reference_number: '',
            notes: ''
        });
        setShowPaymentModal(true);
    };

    const getPaymentMethodLabel = (method) => {
        const methods = {
            cash: 'نقدي',
            transfer: 'تحويل بنكي',
            check: 'شيك'
        };
        return methods[method] || method;
    };

    if (loading && !selectedIncinerator) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            </div>
        );
    }


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">حسابات المحارق</h1>
                    <p className="text-sm text-gray-500 mt-1">إدارة ومتابعة حسابات المحارق والمدفوعات</p>
                </div>
            </div>

            {/* Incinerator Selector & Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">اختر المحرقة</label>
                        <select
                            value={selectedIncinerator?.id || ''}
                            onChange={(e) => {
                                const inc = incinerators.find(i => i.id === e.target.value);
                                setSelectedIncinerator(inc);
                            }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        >
                            {incinerators.map(inc => (
                                <option key={inc.id} value={inc.id}>{inc.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
                        <input
                            type="date"
                            value={dateFilter.from}
                            onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
                        <input
                            type="date"
                            value={dateFilter.to}
                            onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={() => setDateFilter({ from: '', to: '' })}
                            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            إعادة تعيين
                        </button>
                    </div>
                </div>
            </div>

            {selectedIncinerator && accountData && (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 bg-blue-500 rounded-lg text-white">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <span className="text-xs text-blue-700 font-medium">إجمالي الوزن</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-900">{accountData.totalDelivered.toLocaleString()}</p>
                            <p className="text-sm text-blue-700">كجم ({accountData.deliveriesCount} تسليم)</p>
                        </div>

                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 bg-orange-500 rounded-lg text-white">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <span className="text-xs text-orange-700 font-medium">إجمالي المستحق</span>
                            </div>
                            <p className="text-2xl font-bold text-orange-900">{accountData.totalCost.toLocaleString()}</p>
                            <p className="text-sm text-orange-700">جنيه مصري</p>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 bg-green-500 rounded-lg text-white">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                <span className="text-xs text-green-700 font-medium">إجمالي المدفوع</span>
                            </div>
                            <p className="text-2xl font-bold text-green-900">{accountData.totalPaid.toLocaleString()}</p>
                            <p className="text-sm text-green-700">جنيه ({accountData.paymentsCount} دفعة)</p>
                        </div>

                        <div className={`bg-gradient-to-br ${accountData.balance > 0 ? 'from-red-50 to-red-100 border-red-200' : 'from-gray-50 to-gray-100 border-gray-200'} rounded-xl p-5 border`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className={`p-2 ${accountData.balance > 0 ? 'bg-red-500' : 'bg-gray-500'} rounded-lg text-white`}>
                                    <TrendingDown className="w-5 h-5" />
                                </div>
                                <span className={`text-xs ${accountData.balance > 0 ? 'text-red-700' : 'text-gray-700'} font-medium`}>الرصيد المتبقي</span>
                            </div>
                            <p className={`text-2xl font-bold ${accountData.balance > 0 ? 'text-red-900' : 'text-gray-900'}`}>{accountData.balance.toLocaleString()}</p>
                            <p className={`text-sm ${accountData.balance > 0 ? 'text-red-700' : 'text-gray-700'}`}>جنيه مصري</p>
                        </div>
                    </div>

                    {/* Payment Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={openPaymentModal}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-5 h-5" />
                            <span>تسجيل دفعة جديدة</span>
                        </button>
                    </div>


                    {/* Tables Section */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* Payments Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-green-50">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-green-600" />
                                    سجل المدفوعات
                                </h3>
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {payments.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                        <p>لا توجد مدفوعات مسجلة</p>
                                    </div>
                                ) : (
                                    <table className="w-full">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">التاريخ</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">المبلغ</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الطريقة</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">المرجع</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {payments.map(payment => (
                                                <tr key={payment.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm text-gray-900">{payment.payment_date}</td>
                                                    <td className="px-4 py-3 text-sm font-bold text-green-600">{payment.amount?.toLocaleString()} ج.م</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                                                            {getPaymentMethodLabel(payment.payment_method)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-500">{payment.reference_number || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        {/* Deliveries Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-orange-50">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-orange-600" />
                                    سجل التسليمات
                                </h3>
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {deliveries.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        <Flame className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                        <p>لا توجد تسليمات مسجلة</p>
                                    </div>
                                ) : (
                                    <table className="w-full">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">التاريخ</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الوزن</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">سعر الكيلو</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">الإجمالي</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {deliveries.map(delivery => (
                                                <tr key={delivery.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        {delivery.routes?.route_date || new Date(delivery.created_at).toLocaleDateString('ar-EG')}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{delivery.weight_delivered?.toLocaleString()} كجم</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{delivery.cost_per_kg?.toLocaleString()} ج.م</td>
                                                    <td className="px-4 py-3 text-sm font-bold text-orange-600">{delivery.total_cost?.toLocaleString()} ج.م</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Insurance Info */}
                    {selectedIncinerator.insurance_amount > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-blue-900">مبلغ التأمين</p>
                                    <p className="text-sm text-blue-700">{selectedIncinerator.insurance_amount?.toLocaleString()} جنيه مصري</p>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}


            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">تسجيل دفعة جديدة</h2>
                            <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(handlePaymentSubmit)} className="p-6 space-y-4">
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                                <p className="text-sm text-orange-800">
                                    <span className="font-medium">المحرقة:</span> {selectedIncinerator?.name}
                                </p>
                                <p className="text-sm text-orange-800">
                                    <span className="font-medium">الرصيد المتبقي:</span> {accountData?.balance?.toLocaleString()} ج.م
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ج.م)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register('amount', { required: 'المبلغ مطلوب', min: { value: 0.01, message: 'المبلغ يجب أن يكون أكبر من صفر' } })}
                                    className={clsx(
                                        "block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none",
                                        errors.amount ? "border-red-300 bg-red-50" : "border-gray-200"
                                    )}
                                    placeholder="0.00"
                                />
                                {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الدفع</label>
                                <input
                                    type="date"
                                    {...register('payment_date', { required: 'التاريخ مطلوب' })}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الدفع</label>
                                <select
                                    {...register('payment_method')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                >
                                    <option value="cash">نقدي</option>
                                    <option value="transfer">تحويل بنكي</option>
                                    <option value="check">شيك</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">رقم المرجع / الإيصال</label>
                                <input
                                    type="text"
                                    {...register('reference_number')}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="اختياري"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                                <textarea
                                    {...register('notes')}
                                    rows={2}
                                    className="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                                    placeholder="ملاحظات إضافية (اختياري)"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentModal(false)}
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
                                    تسجيل الدفعة
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IncineratorAccounts;
