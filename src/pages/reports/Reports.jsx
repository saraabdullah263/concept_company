import { useState } from 'react';
import { FileText, Download, Calendar, TrendingUp, Truck, Building, DollarSign, Loader2, Printer, Flame } from 'lucide-react';
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
        { id: 'incineration', name: 'تقرير الحرق اليومي', icon: Flame },
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
                case 'incineration':
                    data = await generateIncinerationReport();
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

    const generateIncinerationReport = async () => {
        // جلب الرحلات المكتملة في الفترة المحددة
        const { data: routes, error: routesError } = await supabase
            .from('routes')
            .select('*')
            .eq('status', 'completed')
            .gte('route_date', dateFrom)
            .lte('route_date', dateTo)
            .order('route_date', { ascending: true });

        if (routesError) {
            console.error('Routes error:', routesError);
            throw routesError;
        }

        // جلب أسماء المحارق
        const { data: incinerators } = await supabase
            .from('incinerators')
            .select('id, name');

        const incineratorMap = {};
        incinerators?.forEach(inc => {
            incineratorMap[inc.id] = inc.name;
        });

        // تجميع البيانات حسب اليوم والمحرقة
        const dailyData = {};
        const incineratorTotals = {};
        let grandTotal = 0;

        for (const route of routes || []) {
            const date = route.route_date;
            const weight = parseFloat(route.final_weight_at_incinerator || route.total_weight_collected || 0);
            const incineratorName = incineratorMap[route.incinerator_id] || 'غير محدد';

            // تجميع حسب اليوم
            if (!dailyData[date]) {
                dailyData[date] = {
                    date,
                    totalWeight: 0,
                    routesCount: 0,
                    byIncinerator: {}
                };
            }
            dailyData[date].totalWeight += weight;
            dailyData[date].routesCount += 1;

            // تجميع حسب المحرقة في اليوم
            if (!dailyData[date].byIncinerator[incineratorName]) {
                dailyData[date].byIncinerator[incineratorName] = 0;
            }
            dailyData[date].byIncinerator[incineratorName] += weight;

            // إجمالي كل محرقة
            if (!incineratorTotals[incineratorName]) {
                incineratorTotals[incineratorName] = 0;
            }
            incineratorTotals[incineratorName] += weight;

            grandTotal += weight;
        }

        // تحويل البيانات لمصفوفة مرتبة
        const dailyArray = Object.values(dailyData).sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );

        return {
            type: 'incineration',
            dailyData: dailyArray,
            incineratorTotals: Object.entries(incineratorTotals).map(([name, total]) => ({
                name,
                total
            })),
            grandTotal,
            totalDays: dailyArray.length,
            totalRoutes: routes?.length || 0
        };
    };

    const handlePrint = () => {
        window.print();
    };

    // Helper function to style Excel sheets
    const styleSheet = (ws, headerRow = 0) => {
        // Set column widths
        const colWidths = [];
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        for (let C = range.s.c; C <= range.e.c; ++C) {
            let maxWidth = 10;
            for (let R = range.s.r; R <= range.e.r; ++R) {
                const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
                if (cell && cell.v) {
                    const cellWidth = String(cell.v).length + 2;
                    if (cellWidth > maxWidth) maxWidth = Math.min(cellWidth, 40);
                }
            }
            colWidths.push({ wch: maxWidth });
        }
        ws['!cols'] = colWidths;
        return ws;
    };

    const handleExport = () => {
        if (!reportData) return;
        
        const wb = XLSX.utils.book_new();
        const reportName = reportTypes.find(t => t.id === reportType)?.name || 'تقرير';
        const companyName = 'Concept Eco Care';
        
        // Financial Report
        if (reportData.type === 'financial') {
            // Summary sheet - simple format
            const summaryData = [
                ['التقرير المالي - ' + companyName],
                [],
                ['من تاريخ', dateFrom],
                ['إلى تاريخ', dateTo],
                [],
                ['إجمالي الإيرادات (ج.م)', reportData.totalRevenue],
                ['إجمالي المصروفات (ج.م)', reportData.totalExpenses],
                ['صافي الربح (ج.م)', reportData.netProfit],
                [],
                ['عدد الفواتير', reportData.invoices.length],
                ['عدد المصروفات', reportData.expenses.length],
            ];
            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            styleSheet(summarySheet);
            XLSX.utils.book_append_sheet(wb, summarySheet, 'الملخص');
            
            // Invoices sheet
            const invoicesData = [
                ['تفاصيل الفواتير - ' + companyName],
                [],
                ['رقم الفاتورة', 'المستشفى', 'التاريخ', 'المبلغ (ج.م)', 'الحالة'],
                ...reportData.invoices.map(inv => [
                    inv.invoice_number || '-',
                    inv.hospitals?.name || '-',
                    inv.invoice_date || '-',
                    inv.total_amount || 0,
                    inv.status === 'paid' ? 'مدفوعة' : inv.status === 'pending' ? 'معلقة' : inv.status === 'overdue' ? 'متأخرة' : 'ملغاة'
                ]),
                [],
                ['', '', 'الإجمالي', reportData.totalRevenue, '']
            ];
            const invoicesSheet = XLSX.utils.aoa_to_sheet(invoicesData);
            styleSheet(invoicesSheet);
            XLSX.utils.book_append_sheet(wb, invoicesSheet, 'الفواتير');
            
            // Expenses sheet
            if (reportData.expenses.length > 0) {
                const expensesData = [
                    ['تفاصيل المصروفات - ' + companyName],
                    [],
                    ['التاريخ', 'الوصف', 'الفئة', 'المبلغ (ج.م)'],
                    ...reportData.expenses.map(exp => [
                        exp.expense_date || '-',
                        exp.description || '-',
                        exp.category || '-',
                        exp.amount || 0
                    ]),
                    [],
                    ['', '', 'الإجمالي', reportData.totalExpenses]
                ];
                const expensesSheet = XLSX.utils.aoa_to_sheet(expensesData);
                styleSheet(expensesSheet);
                XLSX.utils.book_append_sheet(wb, expensesSheet, 'المصروفات');
            }
        }
        
        // Routes Report
        else if (reportData.type === 'routes') {
            // Summary sheet
            const summaryData = [
                ['تقرير الرحلات - ' + companyName],
                [],
                ['من تاريخ', dateFrom],
                ['إلى تاريخ', dateTo],
                [],
                ['إجمالي الرحلات', reportData.totalRoutes],
                ['الرحلات المكتملة', reportData.completedRoutes],
                ['الرحلات المعلقة', reportData.totalRoutes - reportData.completedRoutes],
                ['نسبة الإنجاز %', reportData.totalRoutes > 0 ? Math.round((reportData.completedRoutes / reportData.totalRoutes) * 100) : 0],
                ['إجمالي الوزن (كجم)', reportData.totalWeight],
            ];
            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            styleSheet(summarySheet);
            XLSX.utils.book_append_sheet(wb, summarySheet, 'الملخص');
            
            // Routes details sheet
            const routesData = [
                ['تفاصيل الرحلات - ' + companyName],
                [],
                ['التاريخ', 'المندوب', 'المركبة', 'المحرقة', 'الحالة', 'الوزن (كجم)'],
                ...reportData.routes.map(route => [
                    route.route_date || '-',
                    route.representative_name || '-',
                    route.vehicle_plate || '-',
                    route.incinerator_name || '-',
                    route.status === 'completed' ? 'مكتملة' : route.status === 'in_progress' ? 'جارية' : 'معلقة',
                    route.total_weight_collected || 0
                ]),
                [],
                ['', '', '', '', 'الإجمالي', reportData.totalWeight]
            ];
            const routesSheet = XLSX.utils.aoa_to_sheet(routesData);
            styleSheet(routesSheet);
            XLSX.utils.book_append_sheet(wb, routesSheet, 'تفاصيل الرحلات');
        }
        
        // Hospitals Report
        else if (reportData.type === 'hospitals') {
            const hospitalsData = [
                ['تقرير المستشفيات - ' + companyName],
                [],
                ['من تاريخ', dateFrom],
                ['إلى تاريخ', dateTo],
                [],
                ['المستشفى', 'إجمالي الزيارات', 'الزيارات المكتملة', 'نسبة الإنجاز %', 'الوزن (كجم)'],
                ...reportData.hospitals.map(hospital => [
                    hospital.name || '-',
                    hospital.totalStops || 0,
                    hospital.completedStops || 0,
                    hospital.totalStops > 0 ? Math.round((hospital.completedStops / hospital.totalStops) * 100) : 0,
                    hospital.totalWeight || 0
                ]),
                [],
                ['الإجمالي', 
                    reportData.hospitals.reduce((sum, h) => sum + (h.totalStops || 0), 0),
                    reportData.hospitals.reduce((sum, h) => sum + (h.completedStops || 0), 0),
                    '',
                    reportData.hospitals.reduce((sum, h) => sum + (h.totalWeight || 0), 0)
                ]
            ];
            const hospitalsSheet = XLSX.utils.aoa_to_sheet(hospitalsData);
            styleSheet(hospitalsSheet);
            XLSX.utils.book_append_sheet(wb, hospitalsSheet, 'المستشفيات');
        }
        
        // Performance Report
        else if (reportData.type === 'performance') {
            const performanceData = [
                ['تقرير أداء المندوبين - ' + companyName],
                [],
                ['من تاريخ', dateFrom],
                ['إلى تاريخ', dateTo],
                [],
                ['المندوب', 'إجمالي الرحلات', 'الرحلات المكتملة', 'الوزن (كجم)', 'معدل الإنجاز %'],
                ...reportData.representatives.map(rep => [
                    rep.name || '-',
                    rep.totalRoutes || 0,
                    rep.completedRoutes || 0,
                    rep.totalWeight || 0,
                    rep.totalRoutes > 0 ? Math.round((rep.completedRoutes / rep.totalRoutes) * 100) : 0
                ]),
                [],
                ['الإجمالي',
                    reportData.representatives.reduce((sum, r) => sum + (r.totalRoutes || 0), 0),
                    reportData.representatives.reduce((sum, r) => sum + (r.completedRoutes || 0), 0),
                    reportData.representatives.reduce((sum, r) => sum + (r.totalWeight || 0), 0),
                    ''
                ]
            ];
            const performanceSheet = XLSX.utils.aoa_to_sheet(performanceData);
            styleSheet(performanceSheet);
            XLSX.utils.book_append_sheet(wb, performanceSheet, 'أداء المندوبين');
        }

        // Incineration Report
        else if (reportData.type === 'incineration') {
            // Summary sheet - simple and clean
            const summaryData = [
                ['تقرير الحرق اليومي - ' + companyName],
                [],
                ['من تاريخ', dateFrom],
                ['إلى تاريخ', dateTo],
                [],
                ['إجمالي الكمية المحروقة (كجم)', reportData.grandTotal],
                ['عدد أيام العمل', reportData.totalDays],
                ['عدد الرحلات', reportData.totalRoutes],
                ['متوسط الحرق اليومي (كجم)', reportData.totalDays > 0 ? Math.round(reportData.grandTotal / reportData.totalDays) : 0],
                [],
                ['توزيع الكميات على المحارق'],
                ['المحرقة', 'الكمية (كجم)', 'النسبة %'],
                ...reportData.incineratorTotals.map(inc => [
                    inc.name,
                    inc.total,
                    reportData.grandTotal > 0 ? Math.round((inc.total / reportData.grandTotal) * 100) : 0
                ])
            ];
            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            styleSheet(summarySheet);
            XLSX.utils.book_append_sheet(wb, summarySheet, 'الملخص');

            // Daily details sheet
            const dailyData = [
                ['التفاصيل اليومية للحرق - ' + companyName],
                [],
                ['التاريخ', 'عدد الرحلات', 'الوزن (كجم)'],
                ...reportData.dailyData.map(day => [
                    day.date,
                    day.routesCount,
                    day.totalWeight
                ]),
                [],
                ['الإجمالي', reportData.totalRoutes, reportData.grandTotal]
            ];
            const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
            styleSheet(dailySheet);
            XLSX.utils.book_append_sheet(wb, dailySheet, 'التفاصيل اليومية');
        }
        
        // Generate filename
        const filename = `${reportName}_${dateFrom}_to_${dateTo}.xlsx`;
        
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

                    {/* Incineration Report */}
                    {reportData.type === 'incineration' && (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                    <p className="text-sm text-orange-700 mb-1">إجمالي الكمية المحروقة</p>
                                    <p className="text-2xl font-bold text-orange-900">
                                        {reportData.grandTotal.toLocaleString()} كجم
                                    </p>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm text-blue-700 mb-1">عدد الأيام</p>
                                    <p className="text-2xl font-bold text-blue-900">{reportData.totalDays}</p>
                                </div>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <p className="text-sm text-green-700 mb-1">عدد الرحلات</p>
                                    <p className="text-2xl font-bold text-green-900">{reportData.totalRoutes}</p>
                                </div>
                            </div>

                            {/* Incinerator Totals */}
                            {reportData.incineratorTotals.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-3">إجمالي كل محرقة</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {reportData.incineratorTotals.map((inc, idx) => (
                                            <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex justify-between items-center">
                                                <span className="font-medium text-gray-700">{inc.name}</span>
                                                <span className="font-bold text-orange-600">{inc.total.toLocaleString()} كجم</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Daily Details Table */}
                            <div>
                                <h3 className="font-bold text-gray-900 mb-3">التفاصيل اليومية</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">التاريخ</th>
                                                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">عدد الرحلات</th>
                                                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">إجمالي الوزن</th>
                                                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">التوزيع على المحارق</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {reportData.dailyData.map((day, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-4 py-2 text-sm font-mono">{day.date}</td>
                                                    <td className="px-4 py-2 text-sm">{day.routesCount}</td>
                                                    <td className="px-4 py-2 text-sm font-bold text-orange-600">
                                                        {day.totalWeight.toLocaleString()} كجم
                                                    </td>
                                                    <td className="px-4 py-2 text-sm">
                                                        <div className="flex flex-wrap gap-1">
                                                            {Object.entries(day.byIncinerator).map(([name, weight], i) => (
                                                                <span key={i} className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs">
                                                                    {name}: {weight.toLocaleString()} كجم
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-100 font-bold">
                                            <tr>
                                                <td className="px-4 py-2 text-sm">الإجمالي</td>
                                                <td className="px-4 py-2 text-sm">{reportData.totalRoutes}</td>
                                                <td className="px-4 py-2 text-sm text-orange-600">{reportData.grandTotal.toLocaleString()} كجم</td>
                                                <td className="px-4 py-2 text-sm"></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
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

                    <button 
                        onClick={() => {
                            const today = new Date();
                            const lastWeek = new Date(today.setDate(today.getDate() - 7));
                            setDateFrom(lastWeek.toISOString().split('T')[0]);
                            setDateTo(new Date().toISOString().split('T')[0]);
                            setReportType('incineration');
                        }}
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-brand-400 hover:bg-brand-50 transition-all group text-right"
                    >
                        <div className="p-2 bg-orange-100 rounded-lg text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                            <Flame className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">الحرق اليومي</p>
                            <p className="text-xs text-gray-500">آخر 7 أيام</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Reports;
