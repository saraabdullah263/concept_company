import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Link } from 'react-router-dom';
import { Loader2, ArrowRight, TrendingUp, TrendingDown, DollarSign, FileText, AlertCircle, Calendar, Clock, Flame } from 'lucide-react';

const Accounting = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        pendingRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        recentInvoices: [],
        recentExpenses: [],
        incineratorStats: {
            totalDue: 0,
            totalPaid: 0,
            balance: 0
        }
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch Invoices (all for calculations)
            const { data: allInvoicesData } = await supabase
                .from('invoices')
                .select('id, total_amount, status');

            // Fetch recent invoices for display
            const { data: invoices } = await supabase
                .from('invoices')
                .select('*, hospitals(name)')
                .order('created_at', { ascending: false })
                .limit(5);

            // Fetch all Expenses for calculations
            const { data: allExpensesData } = await supabase
                .from('expenses')
                .select('id, amount');

            // Fetch recent expenses for display
            const { data: expenses } = await supabase
                .from('expenses')
                .select('*')
                .order('expense_date', { ascending: false })
                .limit(5);

            // Fetch incinerator stats
            const { data: deliveriesData } = await supabase
                .from('incinerator_deliveries')
                .select('total_cost');
            
            const { data: paymentsData } = await supabase
                .from('incinerator_payments')
                .select('amount');

            const incineratorTotalDue = (deliveriesData || []).reduce((sum, d) => sum + (d.total_cost || 0), 0);
            const incineratorTotalPaid = (paymentsData || []).reduce((sum, p) => sum + (p.amount || 0), 0);

            // Calculate Stats from ALL data
            const allInvoices = allInvoicesData || [];
            const allExpenses = allExpensesData || [];

            const totalRevenue = allInvoices
                .filter(inv => inv.status === 'paid')
                .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

            const pendingRevenue = allInvoices
                .filter(inv => inv.status !== 'paid')
                .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

            const totalExpenses = allExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

            setStats({
                totalRevenue,
                pendingRevenue,
                totalExpenses,
                netProfit: totalRevenue - totalExpenses,
                recentInvoices: invoices || [],
                recentExpenses: expenses || [],
                incineratorStats: {
                    totalDue: incineratorTotalDue,
                    totalPaid: incineratorTotalPaid,
                    balance: incineratorTotalDue - incineratorTotalPaid
                }
            });
        } catch (error) {
            console.error('Error fetching accounting data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">المحاسبة</h1>
                <p className="text-sm text-gray-500 mt-1">نظرة عامة على الوضع المالي</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-500 rounded-lg text-white">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <span className="text-xs text-green-700 font-medium">الإيرادات المحصلة</span>
                    </div>
                    <p className="text-3xl font-bold text-green-900">{stats.totalRevenue.toLocaleString()}</p>
                    <p className="text-sm text-green-700 mt-1">جنيه مصري</p>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-yellow-500 rounded-lg text-white">
                            <Clock className="w-6 h-6" />
                        </div>
                        <span className="text-xs text-yellow-700 font-medium">الإيرادات المعلقة</span>
                    </div>
                    <p className="text-3xl font-bold text-yellow-900">{stats.pendingRevenue.toLocaleString()}</p>
                    <p className="text-sm text-yellow-700 mt-1">جنيه مصري</p>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-500 rounded-lg text-white">
                            <TrendingDown className="w-6 h-6" />
                        </div>
                        <span className="text-xs text-red-700 font-medium">المصروفات</span>
                    </div>
                    <p className="text-3xl font-bold text-red-900">{stats.totalExpenses.toLocaleString()}</p>
                    <p className="text-sm text-red-700 mt-1">جنيه مصري</p>
                </div>

                <div className={`bg-gradient-to-br ${stats.netProfit >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-gray-50 to-gray-100 border-gray-200'} rounded-xl p-6 border`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 ${stats.netProfit >= 0 ? 'bg-blue-500' : 'bg-gray-500'} rounded-lg text-white`}>
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <span className={`text-xs ${stats.netProfit >= 0 ? 'text-blue-700' : 'text-gray-700'} font-medium`}>صافي الربح</span>
                    </div>
                    <p className={`text-3xl font-bold ${stats.netProfit >= 0 ? 'text-blue-900' : 'text-gray-900'}`}>{stats.netProfit.toLocaleString()}</p>
                    <p className={`text-sm ${stats.netProfit >= 0 ? 'text-blue-700' : 'text-gray-700'} mt-1`}>جنيه مصري</p>
                </div>
            </div>

            {/* Incinerator Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link to="/incinerator-accounts" className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-500 rounded-lg text-white">
                            <Flame className="w-6 h-6" />
                        </div>
                        <span className="text-xs text-orange-700 font-medium">مستحقات المحارق</span>
                    </div>
                    <p className="text-3xl font-bold text-orange-900">{stats.incineratorStats.totalDue.toLocaleString()}</p>
                    <p className="text-sm text-orange-700 mt-1">جنيه مصري</p>
                </Link>

                <Link to="/incinerator-accounts" className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 border border-teal-200 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-teal-500 rounded-lg text-white">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <span className="text-xs text-teal-700 font-medium">المدفوع للمحارق</span>
                    </div>
                    <p className="text-3xl font-bold text-teal-900">{stats.incineratorStats.totalPaid.toLocaleString()}</p>
                    <p className="text-sm text-teal-700 mt-1">جنيه مصري</p>
                </Link>

                <Link to="/incinerator-accounts" className={`bg-gradient-to-br ${stats.incineratorStats.balance > 0 ? 'from-rose-50 to-rose-100 border-rose-200' : 'from-emerald-50 to-emerald-100 border-emerald-200'} rounded-xl p-6 border hover:shadow-lg transition-shadow`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 ${stats.incineratorStats.balance > 0 ? 'bg-rose-500' : 'bg-emerald-500'} rounded-lg text-white`}>
                            <Flame className="w-6 h-6" />
                        </div>
                        <span className={`text-xs ${stats.incineratorStats.balance > 0 ? 'text-rose-700' : 'text-emerald-700'} font-medium`}>رصيد المحارق المتبقي</span>
                    </div>
                    <p className={`text-3xl font-bold ${stats.incineratorStats.balance > 0 ? 'text-rose-900' : 'text-emerald-900'}`}>{stats.incineratorStats.balance.toLocaleString()}</p>
                    <p className={`text-sm ${stats.incineratorStats.balance > 0 ? 'text-rose-700' : 'text-emerald-700'} mt-1`}>جنيه مصري</p>
                </Link>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Recent Invoices */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900">آخر الفواتير</h3>
                        <Link to="/invoices" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
                            عرض الكل
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {stats.recentInvoices.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                لا توجد فواتير بعد
                            </div>
                        ) : (
                            stats.recentInvoices.map(inv => (
                                <div key={inv.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-gray-900">{inv.hospitals?.name || 'غير محدد'}</span>
                                        <span className="font-bold text-gray-900">{inv.total_amount?.toLocaleString()} ج.م</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span className="font-mono">#{inv.invoice_number || inv.id.slice(0, 8)}</span>
                                        <span className={`px-2 py-0.5 rounded-full ${inv.status === 'paid' ? 'bg-green-100 text-green-800' :
                                            inv.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {inv.status === 'paid' ? 'مدفوع' : inv.status === 'overdue' ? 'متأخر' : 'معلق'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Expenses */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900">آخر المصروفات</h3>
                        <Link to="/expenses" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
                            عرض الكل
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {stats.recentExpenses.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                <DollarSign className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                لا توجد مصروفات مسجلة
                            </div>
                        ) : (
                            stats.recentExpenses.map(exp => (
                                <div key={exp.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-gray-900">{exp.description}</span>
                                        <span className="font-bold text-red-600">-{exp.amount?.toLocaleString()} ج.م</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span className="px-2 py-0.5 rounded-full bg-gray-100">{exp.category || 'عام'}</span>
                                        <span>{exp.expense_date}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-6">
                <h3 className="font-bold text-brand-900 mb-4">إجراءات سريعة</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link
                        to="/invoices"
                        className="flex items-center gap-3 p-4 bg-white rounded-lg border border-brand-200 hover:border-brand-400 transition-colors group"
                    >
                        <div className="p-2 bg-brand-100 rounded-lg text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">إضافة فاتورة جديدة</p>
                            <p className="text-xs text-gray-500">إنشاء فاتورة لأحد العملاء</p>
                        </div>
                    </Link>

                    <Link
                        to="/expenses"
                        className="flex items-center gap-3 p-4 bg-white rounded-lg border border-brand-200 hover:border-brand-400 transition-colors group"
                    >
                        <div className="p-2 bg-brand-100 rounded-lg text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">تسجيل مصروف</p>
                            <p className="text-xs text-gray-500">إضافة مصروف تشغيلي جديد</p>
                        </div>
                    </Link>

                    <Link
                        to="/incinerator-accounts"
                        className="flex items-center gap-3 p-4 bg-white rounded-lg border border-brand-200 hover:border-brand-400 transition-colors group"
                    >
                        <div className="p-2 bg-orange-100 rounded-lg text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                            <Flame className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">حسابات المحارق</p>
                            <p className="text-xs text-gray-500">إدارة مدفوعات المحارق</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Accounting;
