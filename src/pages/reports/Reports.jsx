import { useState } from 'react';
import { FileText, Download, Calendar, TrendingUp, Truck, Building, DollarSign, Loader2, Printer } from 'lucide-react';
import { supabase } from '../../services/supabase';
import * as XLSX from 'xlsx';

const Reports = () => {
    const [reportType, setReportType] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);

    const reportTypes = [
        { id: 'financial', name: 'التقرير المالي', icon: DollarSign },
        { id: 'routes', name: 'تقرير الرحلات', icon: Truck },
        { id: 'hospitals', name: 'تقرير المستشفيات', icon: Building },
        { id: 'performance', name: 'تقرير الأداء', icon: TrendingUp },
    ];

    const handleGenerateReport = async () => {
        if (!reportType || !dateFrom || !dateTo) {
            alert('برجاء اختيار نوع التقرير والفترة الزمنية');
            return;
        }

        setLoading(true);
        try {
            let data;
            switch (reportType) {
                case 'financial':
                    data = await generateFinancialReport();
                    break;
                case 'routes':
                    data = await generateRoutesReport();
                    break;
                case 'hospitals':
                    data = await generateHospitalsReport();
                    break;
                case 'performance':
                    data = await generatePerformanceReport();
                    break;
                default:
                    break;
            }
            setReportData(data);
        } catch (error) {
            console.error('Error generating report:', error);
            alert('حدث خطأ أثناء إنشاء التقرير');
        } finally {
            setLoading(false);
        }
    };

    const generateFinancialReport = async () => {
        const { data: invoices } = await supabase
            .from('invoices')
            .select('*, hospitals(name)')
            .gte('invoice_date', dateFrom)
            .lte('invoice_date', dateTo);

        const { data: expenses } = await supabase
            .from('expenses')
            .select('*')
            .gte('expense_date', dateFrom)
            .lte('expense_date', dateTo);

        const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
        const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
        const netProfit = totalRevenue - totalExpenses;

        return {
            type: 'financial',
            totalRevenue,
            totalExpenses,
            netProfit,
            invoices: invoices || [],
            expenses: expenses || []
        };
    };

    const generateRoutesReport = async () => {
        // Fetch routes
        const { data: routes, error: routesError } = await supabase
            .from('routes')
            .select('*')
            .gte('route_date', dateFrom)
            .lte('route_date', dateTo);

        if (routesError) {
            console.error('Routes error:', routesError);
            throw routesError;
        }

        // Fetch related data for each route
        const routesWithDetails = await Promise.all(
            (routes || []).map(async (route) => {
                const details = { ...route };

                // Get representative
                if (route.representative_id) {
                    const { data: rep } = await supabase
                        .from('representatives')
                        .select('id, user_id')
                        .eq('id', route.representative_id)
                        .single();
                    
                    if (rep?.user_id) {
                        const { data: user } = await supabase
                            .from('users')
                            .select('full_name')
                            .eq('id', rep.user_id)
                            .single();
                        details.representative_name = user?.full_name || '-';
                    }
                }

                // Get vehicle
                if (route.vehicle_id) {
                    const { data: vehicle } = await supabase
                        .from('vehicles')
                        .select('plate_number')
                        .eq('id', route.vehicle_id)
                        .single();
                    details.vehicle_plate = vehicle?.plate_number || '-';
                }

                // Get incinerator
                if (route.incinerator_id) {
                    const { data: incinerator } = await supabase
                        .from('incinerators')
                        .select('name')
                        .eq('id', route.incinerator_id)
                        .single();
                    details.incinerator_name = incinerator?.name || '-';
                }

                return details;
            })
        );

        const totalRoutes = routesWithDetails.length;
        const completedRoutes = routesWithDetails.filter(r => r.status === 'completed').length;
        const totalWeight = routesWithDetails.reduce((sum, r) => sum + (r.total_weight_collected || 0), 0);

        return {
            type: 'routes',
            totalRoutes,
            completedRoutes,
            totalWeight,
            routes: routesWithDetails
        };
    };

    const generateHospitalsReport = async () => {
        const { data: hospitals, error: hospitalsError } = await supabase
            .from('hospitals')
            .select('*');

        if (hospitalsError) {
            console.error('Hospitals error:', hospitalsError);
            throw hospitalsError;
        }

        // Get all route stops in date range
        const { data: routes } = await supabase
            .from('routes')
            .select('id')
            .gte('route_date', dateFrom)
            .lte('route_date', dateTo);

        const routeIds = routes?.map(r => r.id) || [];

        let routeStops = [];
        if (routeIds.length > 0) {
            const { data: stops } = await supabase
                .from('route_stops')
                .select('*')
                .in('route_id', routeIds);
            routeStops = stops || [];
        }

        const hospitalStats = hospitals?.map(hospital => {
            const stops = routeStops.filter(s => s.hospital_id === hospital.id);
            const completedStops = stops.filter(s => s.status === 'collected');
            const totalWeight = completedStops.reduce((sum, s) => sum + (s.weight_collected || 0), 0);

            return {
                ...hospital,
                totalStops: stops.length,
                completedStops: completedStops.length,
                totalWeight
            };
        });

        return {
            type: 'hospitals',
            hospitals: hospitalStats || []
        };
    };

    const generatePerformanceReport = async () => {
        const { data: routes, error: routesError } = await supabase
            .from('routes')
            .select('*')
            .gte('route_date', dateFrom)
            .lte('route_date', dateTo);

        if (routesError) {
            console.error('Routes error:', routesError);
            throw routesError;
        }

        const repPerformance = {};

        // Get representative details for each route
        for (const route of routes || []) {
            if (!route.representative_id) continue;

            // Get representative
            const { data: rep } = await supabase
                .from('representatives')
                .select('id, user_id')
                .eq('id', route.representative_id)
                .single();

            if (!rep?.user_id) continue;

            // Get user name
            const { data: user } = await supabase
                .from('users')
                .select('full_name')
                .eq('id', rep.user_id)
                .single();

            const repName = user?.full_name || 'غير محدد';

            if (!repPerformance[repName]) {
                repPerformance[repName] = {
                    totalRoutes: 0,
                    completedRoutes: 0,
                    totalWeight: 0
                };
            }

            repPerformance[repName].totalRoutes++;
            if (route.status === 'completed') {
                repPerformance[repName].completedRoutes++;
                repPerformance[repName].totalWeight += route.total_weight_collected || 0;
            }
        }

        return {
            type: 'performance',
            representatives: Object.entries(repPerformance).map(([name, stats]) => ({
                name,
                ...stats
            }))
        };
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExport = () => {
        if (!reportData) return;
        
        const wb = XLSX.utils.book_new();
        
        // Financial Report
        if (reportData.type === 'financial') {
            // Summary sheet
            const summaryData = [
                ['التقرير المالي'],
                ['من تاريخ:', dateFrom, 'إلى تاريخ:', dateTo],
                [],
                ['إجمالي الإيرادات', reportData.totalRevenue],
                ['إجمالي المصروفات', reportData.totalExpenses],
                ['صافي الربح', reportData.netProfit]
            ];
            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, summarySheet, 'الملخص');
            
            // Invoices sheet
            const invoicesData = [
                ['رقم الفاتورة', 'المستشفى', 'التاريخ', 'المبلغ', 'الحالة'],
                ...reportData.invoices.map(inv => [
                    inv.invoice_number,
                    inv.hospitals?.name || '-',
                    inv.invoice_date,
                    inv.total_amount,
                    inv.status === 'paid' ? 'مدفوعة' : inv.status === 'pending' ? 'معلقة' : 'ملغاة'
                ])
            ];
            const invoicesSheet = XLSX.utils.aoa_to_sheet(invoicesData);
            XLSX.utils.book_append_sheet(wb, invoicesSheet, 'الفواتير');
            
            // Expenses sheet
            if (reportData.expenses.length > 0) {
                const expensesData = [
                    ['التاريخ', 'الوصف', 'الفئة', 'المبلغ'],
                    ...reportData.expenses.map(exp => [
                        exp.expense_date,
                        exp.description || '-',
                        exp.category || '-',
                        exp.amount
                    ])
                ];
                const expensesSheet = XLSX.utils.aoa_to_sheet(expensesData);
                XLSX.utils.book_append_sheet(wb, expensesSheet, 'المصروفات');
            }
        }
        
        // Routes Report
        else if (reportData.type === 'routes') {
            // Summary sheet
            const summaryData = [
                ['تقرير الرحلات'],
                ['من تاريخ:', dateFrom, 'إلى تاريخ:', dateTo],
                [],
                ['إجمالي الرحلات', reportData.totalRoutes],
                ['الرحلات المكتملة', reportData.completedRoutes],
                ['إجمالي الوزن (كجم)', reportData.totalWeight]
            ];
            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, summarySheet, 'الملخص');
            
            // Routes details sheet
            const routesData = [
                ['التاريخ', 'المندوب', 'المركبة', 'الحالة', 'الوزن المجمع (كجم)'],
                ...reportData.routes.map(route => [
                    route.route_date,
                    route.representative_name || '-',
                    route.vehicle_plate || '-',
                    route.status === 'completed' ? 'مكتملة' : 
                    route.status === 'in_progress' ? 'جارية' : 'معلقة',
                    route.total_weight_collected || 0
                ])
            ];
            const routesSheet = XLSX.utils.aoa_to_sheet(routesData);
            XLSX.utils.book_append_sheet(wb, routesSheet, 'تفاصيل الرحلات');
        }
        
        // Hospitals Report
        else if (reportData.type === 'hospitals') {
            const hospitalsData = [
                ['تقرير المستشفيات'],
                ['من تاريخ:', dateFrom, 'إلى تاريخ:', dateTo],
                [],
                ['المستشفى', 'إجمالي الزيارات', 'الزيارات المكتملة', 'إجمالي الوزن (كجم)'],
                ...reportData.hospitals.map(hospital => [
                    hospital.name,
                    hospital.totalStops,
                    hospital.completedStops,
                    hospital.totalWeight
                ])
            ];
            const hospitalsSheet = XLSX.utils.aoa_to_sheet(hospitalsData);
            XLSX.utils.book_append_sheet(wb, hospitalsSheet, 'المستشفيات');
        }
        
        // Performance Report
        else if (reportData.type === 'performance') {
            const performanceData = [
                ['تقرير الأداء'],
                ['من تاريخ:', dateFrom, 'إلى تاريخ:', dateTo],
                [],
                ['المندوب', 'إجمالي الرحلات', 'الرحلات المكتملة', 'إجمالي الوزن (كجم)', 'معدل الإنجاز %'],
                ...reportData.representatives.map(rep => [
                    rep.name,
                    rep.totalRoutes,
                    rep.completedRoutes,
                    rep.totalWeight,
                    ((rep.completedRoutes / rep.totalRoutes) * 100).toFixed(0)
                ])
            ];
            const performanceSheet = XLSX.utils.aoa_to_sheet(performanceData);
            XLSX.utils.book_append_sheet(wb, performanceSheet, 'أداء المندوبين');
        }
        
        // Generate filename
        const reportName = reportTypes.find(t => t.id === reportType)?.name || 'تقرير';
        const filename = `${reportName}_${dateFrom}_${dateTo}.xlsx`;
        
        // Save file
        XLSX.writeFile(wb, filename);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">التقارير</h1>
                        <p className="text-brand-100">إنشاء وعرض التقارير المختلفة</p>
                    </div>
                    <FileText className="w-12 h-12 text-brand-300" />
                </div>
            </div>

            {/* Report Generator */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">إنشاء تقرير جديد</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Report Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            نوع التقرير
                        </label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        >
                            <option value="">اختر نوع التقرير</option>
                            {reportTypes.map(type => (
                                <option key={type.id} value={type.id}>{type.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date From */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            من تاريخ
                        </label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>

                    {/* Date To */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            إلى تاريخ
                        </label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>

                    {/* Generate Button */}
                    <div className="flex items-end gap-3">
                        <button
                            onClick={handleGenerateReport}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>جاري الإنشاء...</span>
                                </>
                            ) : (
                                <>
                                    <FileText className="w-5 h-5" />
                                    <span>إنشاء التقرير</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Display */}
            {reportData && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none">
                    {/* Report Header */}
                    <div className="flex items-center justify-between mb-6 pb-4 border-b print:border-black">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {reportTypes.find(t => t.id === reportType)?.name}
                            </h2>
                            <p className="text-sm text-gray-500">
                                من {dateFrom} إلى {dateTo}
                            </p>
                        </div>
                        <div className="flex gap-2 print:hidden">
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                <Printer className="w-4 h-4" />
                                طباعة
                            </button>
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                <Download className="w-4 h-4" />
                                تصدير
                            </button>
                        </div>
                    </div>

                    {/* Financial Report */}
                    {reportData.type === 'financial' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <p className="text-sm text-green-700 mb-1">إجمالي الإيرادات</p>
                                    <p className="text-2xl font-bold text-green-900">
                                        {reportData.totalRevenue.toLocaleString()} ج.م
                                    </p>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-sm text-red-700 mb-1">إجمالي المصروفات</p>
                                    <p className="text-2xl font-bold text-red-900">
                                        {reportData.totalExpenses.toLocaleString()} ج.م
                                    </p>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm text-blue-700 mb-1">صافي الربح</p>
                                    <p className="text-2xl font-bold text-blue-900">
                                        {reportData.netProfit.toLocaleString()} ج.م
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-gray-900 mb-3">الفواتير ({reportData.invoices.length})</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">رقم الفاتورة</th>
                                                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">المستشفى</th>
                                                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">التاريخ</th>
                                                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">المبلغ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {reportData.invoices.map(inv => (
                                                <tr key={inv.id}>
                                                    <td className="px-4 py-2 text-sm">{inv.invoice_number}</td>
                                                    <td className="px-4 py-2 text-sm">{inv.hospitals?.name}</td>
                                                    <td className="px-4 py-2 text-sm">{inv.invoice_date}</td>
                                                    <td className="px-4 py-2 text-sm font-medium">{inv.total_amount.toLocaleString()} ج.م</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Routes Report */}
                    {reportData.type === 'routes' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm text-blue-700 mb-1">إجمالي الرحلات</p>
                                    <p className="text-2xl font-bold text-blue-900">{reportData.totalRoutes}</p>
                                </div>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <p className="text-sm text-green-700 mb-1">الرحلات المكتملة</p>
                                    <p className="text-2xl font-bold text-green-900">{reportData.completedRoutes}</p>
                                </div>
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <p className="text-sm text-purple-700 mb-1">إجمالي الوزن</p>
                                    <p className="text-2xl font-bold text-purple-900">{reportData.totalWeight.toLocaleString()} كجم</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-gray-900 mb-3">تفاصيل الرحلات</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">التاريخ</th>
                                                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">المندوب</th>
                                                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">المركبة</th>
                                                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">الحالة</th>
                                                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">الوزن</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {reportData.routes.map(route => (
                                                <tr key={route.id}>
                                                    <td className="px-4 py-2 text-sm">{route.route_date}</td>
                                                    <td className="px-4 py-2 text-sm">{route.representative_name || '-'}</td>
                                                    <td className="px-4 py-2 text-sm">{route.vehicle_plate || '-'}</td>
                                                    <td className="px-4 py-2 text-sm">
                                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                                            route.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                            route.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {route.status === 'completed' ? 'مكتملة' :
                                                             route.status === 'in_progress' ? 'جارية' : 'معلقة'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-sm font-medium">{route.total_weight_collected || 0} كجم</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Hospitals Report */}
                    {reportData.type === 'hospitals' && (
                        <div>
                            <h3 className="font-bold text-gray-900 mb-3">أداء المستشفيات</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">المستشفى</th>
                                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">إجمالي الزيارات</th>
                                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">الزيارات المكتملة</th>
                                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">إجمالي الوزن</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {reportData.hospitals.map(hospital => (
                                            <tr key={hospital.id}>
                                                <td className="px-4 py-2 text-sm font-medium">{hospital.name}</td>
                                                <td className="px-4 py-2 text-sm">{hospital.totalStops}</td>
                                                <td className="px-4 py-2 text-sm">{hospital.completedStops}</td>
                                                <td className="px-4 py-2 text-sm font-medium">{hospital.totalWeight.toLocaleString()} كجم</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Performance Report */}
                    {reportData.type === 'performance' && (
                        <div>
                            <h3 className="font-bold text-gray-900 mb-3">أداء المندوبين</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">المندوب</th>
                                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">إجمالي الرحلات</th>
                                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">الرحلات المكتملة</th>
                                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">إجمالي الوزن</th>
                                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">معدل الإنجاز</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {reportData.representatives.map((rep, idx) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-2 text-sm font-medium">{rep.name}</td>
                                                <td className="px-4 py-2 text-sm">{rep.totalRoutes}</td>
                                                <td className="px-4 py-2 text-sm">{rep.completedRoutes}</td>
                                                <td className="px-4 py-2 text-sm font-medium">{rep.totalWeight.toLocaleString()} كجم</td>
                                                <td className="px-4 py-2 text-sm">
                                                    <span className="font-medium text-green-600">
                                                        {((rep.completedRoutes / rep.totalRoutes) * 100).toFixed(0)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Quick Reports */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:hidden">
                <h2 className="text-lg font-bold text-gray-900 mb-4">تقارير سريعة</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <button 
                        onClick={() => {
                            const today = new Date();
                            const lastMonth = new Date(today.setMonth(today.getMonth() - 1));
                            setDateFrom(lastMonth.toISOString().split('T')[0]);
                            setDateTo(new Date().toISOString().split('T')[0]);
                            setReportType('financial');
                        }}
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-brand-400 hover:bg-brand-50 transition-all group text-right"
                    >
                        <div className="p-2 bg-green-100 rounded-lg text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">الأرباح الشهرية</p>
                            <p className="text-xs text-gray-500">آخر 30 يوم</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => {
                            const today = new Date();
                            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                            setDateFrom(firstDay.toISOString().split('T')[0]);
                            setDateTo(new Date().toISOString().split('T')[0]);
                            setReportType('routes');
                        }}
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-brand-400 hover:bg-brand-50 transition-all group text-right"
                    >
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Truck className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">الرحلات المكتملة</p>
                            <p className="text-xs text-gray-500">هذا الشهر</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => {
                            const today = new Date();
                            const threeMonthsAgo = new Date(today.setMonth(today.getMonth() - 3));
                            setDateFrom(threeMonthsAgo.toISOString().split('T')[0]);
                            setDateTo(new Date().toISOString().split('T')[0]);
                            setReportType('hospitals');
                        }}
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-brand-400 hover:bg-brand-50 transition-all group text-right"
                    >
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <Building className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">أداء المستشفيات</p>
                            <p className="text-xs text-gray-500">آخر 3 أشهر</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Reports;
