import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import {
    Users, FileText, Truck, DollarSign,
    TrendingUp, TrendingDown, AlertCircle,
    Package, Calendar, CheckCircle, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const { userRole, user, loading: authLoading } = useAuth();
    const [stats, setStats] = useState({
        totalRoutes: 0,
        completedRoutes: 0,
        totalVehicles: 0,
        activeContracts: 0,
        pendingInvoices: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        activeHospitals: 0,
        myRoutesToday: 0,
        myPendingRoutes: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // لا تحمل البيانات حتى يتم تحميل role المستخدم
        if (!authLoading && userRole) {
            fetchDashboardData();
        }
    }, [userRole, user, authLoading]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // إذا كان المستخدم مندوب، اعرض بياناته فقط
            if (userRole === 'representative') {
                // جلب معرف المندوب
                const { data: repData } = await supabase
                    .from('representatives')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();

                if (repData) {
                    const today = new Date().toISOString().split('T')[0];
                    
                    // رحلات اليوم
                    const { data: todayRoutes } = await supabase
                        .from('routes')
                        .select('*', { count: 'exact' })
                        .eq('representative_id', repData.id)
                        .eq('route_date', today);

                    // الرحلات المعلقة
                    const { data: pendingRoutes } = await supabase
                        .from('routes')
                        .select('*', { count: 'exact' })
                        .eq('representative_id', repData.id)
                        .in('status', ['pending', 'in_progress']);

                    setStats({
                        myRoutesToday: todayRoutes?.length || 0,
                        myPendingRoutes: pendingRoutes?.length || 0,
                        completedRoutes: todayRoutes?.filter(r => r.status === 'completed').length || 0
                    });
                }
                setLoading(false);
                return;
            }

            // البيانات العامة للأدوار الأخرى
            setLoading(false);

            const [routes, vehicles, contracts, invoices, expenses, hospitals] = await Promise.all([
                supabase.from('routes').select('*', { count: 'exact' }),
                supabase.from('vehicles').select('*', { count: 'exact' }).eq('is_active', true),
                supabase.from('contracts').select('*', { count: 'exact' }).eq('status', 'active'),
                supabase.from('invoices').select('total_amount').eq('status', 'pending'),
                supabase.from('expenses').select('amount'),
                supabase.from('hospitals').select('*', { count: 'exact' }).eq('is_active', true)
            ]);

            const completedRoutes = routes.data?.filter(r => r.status === 'completed') || [];
            const totalRevenue = invoices.data?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
            const totalExpenses = expenses.data?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;

            setStats({
                totalRoutes: routes.count || 0,
                completedRoutes: completedRoutes.length,
                totalVehicles: vehicles.count || 0,
                activeContracts: contracts.count || 0,
                pendingInvoices: invoices.count || 0,
                totalRevenue,
                totalExpenses,
                activeHospitals: hospitals.count || 0
            });
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, icon: Icon, color, change, link }) => (
        <Link to={link} className="block group">
            <div className={`bg-gradient-to-br ${color} rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}>
                <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-7 h-7 text-white" />
                    </div>
                    {change && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${change > 0 ? 'bg-green-500/20 text-white' : 'bg-red-500/20 text-white'
                            }`}>
                            {change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {Math.abs(change)}%
                        </div>
                    )}
                </div>
                <p className="text-white/80 text-sm mb-2">{title}</p>
                <p className="text-3xl font-bold text-white">{value.toLocaleString()}</p>
            </div>
        </Link>
    );

    // انتظر حتى يتم تحميل role المستخدم
    if (authLoading || !userRole) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">جاري التحميل...</p>
                </div>
            </div>
        );
    }

    // عرض خاص للمندوب
    if (userRole === 'representative') {
        return (
            <div className="space-y-6">
                <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-8 text-white shadow-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">مرحباً بك! 👋</h1>
                            <p className="text-brand-100">رحلاتك اليوم</p>
                        </div>
                        <div className="hidden md:block">
                            <Truck className="w-16 h-16 text-brand-300" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        title="رحلات اليوم"
                        value={stats.myRoutesToday}
                        icon={Calendar}
                        color="from-blue-500 to-blue-600"
                        link="/routes"
                    />
                    <StatCard
                        title="رحلات معلقة"
                        value={stats.myPendingRoutes}
                        icon={Clock}
                        color="from-orange-500 to-orange-600"
                        link="/routes"
                    />
                    <StatCard
                        title="رحلات مكتملة"
                        value={stats.completedRoutes}
                        icon={CheckCircle}
                        color="from-green-500 to-green-600"
                        link="/routes"
                    />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">إجراءات سريعة</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <Link to="/routes" className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-all group">
                            <div className="p-3 bg-brand-100 rounded-full group-hover:bg-brand-600 transition-colors">
                                <Truck className="w-6 h-6 text-brand-600 group-hover:text-white" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">عرض رحلاتي</p>
                                <p className="text-sm text-gray-500">شاهد جميع الرحلات المخصصة لك</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-8 text-white shadow-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">مرحباً بك! 👋</h1>
                        <p className="text-brand-100">نظرة عامة على النشاط اليومي</p>
                    </div>
                    <div className="hidden md:block">
                        <Calendar className="w-16 h-16 text-brand-300" />
                    </div>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <StatCard
                    title="إجمالي الرحلات"
                    value={stats.totalRoutes}
                    icon={Truck}
                    color="from-blue-500 to-blue-600"
                    change={12}
                    link="/routes"
                />
                <StatCard
                    title="الرحلات المكتملة"
                    value={stats.completedRoutes}
                    icon={CheckCircle}
                    color="from-green-500 to-green-600"
                    link="/routes"
                />
                <StatCard
                    title="المركبات النشطة"
                    value={stats.totalVehicles}
                    icon={Package}
                    color="from-purple-500 to-purple-600"
                    link="/vehicles"
                />
                <StatCard
                    title="العقود النشطة"
                    value={stats.activeContracts}
                    icon={FileText}
                    color="from-orange-500 to-orange-600"
                    link="/contracts"
                />
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                    <div className="flex items-center gap-3 mb-4">
                        <DollarSign className="w-8 h-8 text-green-600" />
                        <div>
                            <p className="text-sm text-green-700 font-medium">الإيرادات المعلقة</p>
                            <p className="text-2xl font-bold text-green-900">{stats.totalRevenue.toLocaleString()} ج.م</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-green-700">
                        <Clock className="w-4 h-4" />
                        <span>{stats.pendingInvoices} فاتورة معلقة</span>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 border border-red-200">
                    <div className="flex items-center gap-3 mb-4">
                        <TrendingDown className="w-8 h-8 text-red-600" />
                        <div>
                            <p className="text-sm text-red-700 font-medium">إجمالي المصروفات</p>
                            <p className="text-2xl font-bold text-red-900">{stats.totalExpenses.toLocaleString()} ج.م</p>
                        </div>
                    </div>
                    <Link to="/expenses" className="text-xs text-red-600 hover:underline flex items-center gap-1">
                        <span>عرض التفاصيل</span>
                    </Link>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                        <Users className="w-8 h-8 text-blue-600" />
                        <div>
                            <p className="text-sm text-blue-700 font-medium">المستشفيات النشطة</p>
                            <p className="text-2xl font-bold text-blue-900">{stats.activeHospitals}</p>
                        </div>
                    </div>
                    <Link to="/hospitals" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <span>إدارة المستشفيات</span>
                    </Link>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">إجراءات سريعة</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link to="/routes" className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-all group">
                        <div className="p-3 bg-brand-100 rounded-full group-hover:bg-brand-600 transition-colors">
                            <Truck className="w-6 h-6 text-brand-600 group-hover:text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-brand-700">رحلة جديدة</span>
                    </Link>

                    <Link to="/invoices" className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all group">
                        <div className="p-3 bg-green-100 rounded-full group-hover:bg-green-600 transition-colors">
                            <FileText className="w-6 h-6 text-green-600 group-hover:text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-green-700">فاتورة جديدة</span>
                    </Link>

                    <Link to="/expenses" className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-red-400 hover:bg-red-50 transition-all group">
                        <div className="p-3 bg-red-100 rounded-full group-hover:bg-red-600 transition-colors">
                            <DollarSign className="w-6 h-6 text-red-600 group-hover:text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-red-700">مصروف جديد</span>
                    </Link>

                    <Link to="/reports" className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all group">
                        <div className="p-3 bg-purple-100 rounded-full group-hover:bg-purple-600 transition-colors">
                            <TrendingUp className="w-6 h-6 text-purple-600 group-hover:text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">التقارير</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
