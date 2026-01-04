import { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Calendar, TrendingUp, Truck, Building, DollarSign, Loader2, Printer, Flame, Filter, Users, Search } from 'lucide-react';
import { supabase } from '../../services/supabase';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

const Reports = () => {
    const [reportType, setReportType] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // فلتر البحث على النتائج المعروضة (بعد إنشاء التقرير)
    const [displaySearchQuery, setDisplaySearchQuery] = useState('');
    const [displayFilters, setDisplayFilters] = useState({
        governorate: '',
        clientType: '',
        city: ''
    });
    const [governorates, setGovernorates] = useState([]);
    const [cities, setCities] = useState([]);
    const [clientTypes] = useState([
        { id: 'hospital', name: 'مستشفى' },
        { id: 'clinic', name: 'عيادة' },
        { id: 'lab', name: 'معمل' },
        { id: 'medical_center', name: 'مركز طبي' }
    ]);

    const reportTypes = [
        { id: 'financial', name: 'التقرير المالي', icon: DollarSign },
        { id: 'routes', name: 'تقرير الرحلات', icon: Truck },
        { id: 'clients', name: 'تقرير العملاء', icon: Users },
        { id: 'performance', name: 'تقرير الأداء', icon: TrendingUp },
        { id: 'incineration', name: 'تقرير الحرق اليومي', icon: Flame },
    ];

    // جلب المحافظات والمدن للفلاتر
    useEffect(() => {
        const fetchFilterOptions = async () => {
            const { data: hospitals } = await supabase
                .from('hospitals')
                .select('governorate, city');
            
            if (hospitals) {
                const uniqueGovernorates = [...new Set(hospitals.map(h => h.governorate).filter(Boolean))];
                const uniqueCities = [...new Set(hospitals.map(h => h.city).filter(Boolean))];
                setGovernorates(uniqueGovernorates);
                setCities(uniqueCities);
            }
        };
        fetchFilterOptions();
    }, []);

    // إعادة تعيين فلاتر العرض عند إنشاء تقرير جديد
    useEffect(() => {
        setDisplaySearchQuery('');
        setDisplayFilters({ governorate: '', clientType: '', city: '' });
    }, [reportData]);

    // فلترة بيانات العملاء المعروضة (client-side filtering)
    const filteredClientsData = useMemo(() => {
        if (!reportData || reportData.type !== 'clients') return null;
        
        let filteredClients = [...(reportData.clients || [])];
        
        // فلتر البحث بالاسم
        if (displaySearchQuery.trim()) {
            const searchLower = displaySearchQuery.trim().toLowerCase();
            filteredClients = filteredClients.filter(client => 
                client.name?.toLowerCase().includes(searchLower)
            );
        }
        
        // فلتر المحافظة
        if (displayFilters.governorate) {
            filteredClients = filteredClients.filter(client => 
                client.governorate === displayFilters.governorate
            );
        }
        
        // فلتر نوع العميل
        if (displayFilters.clientType) {
            filteredClients = filteredClients.filter(client => 
                client.client_type === displayFilters.clientType
            );
        }
        
        // فلتر المدينة
        if (displayFilters.city) {
            filteredClients = filteredClients.filter(client => 
                client.city === displayFilters.city
            );
        }
        
        // حساب الإحصائيات للبيانات المفلترة
        const totalClients = filteredClients.length;
        const totalVisits = filteredClients.reduce((sum, c) => sum + c.totalStops, 0);
        const completedVisits = filteredClients.reduce((sum, c) => sum + c.completedStops, 0);
        const totalWeight = filteredClients.reduce((sum, c) => sum + c.totalWeight, 0);
        
        // تجميع حسب النوع
        const byType = {};
        filteredClients.forEach(client => {
            const type = client.client_type || 'hospital';
            if (!byType[type]) {
                byType[type] = { count: 0, visits: 0, weight: 0 };
            }
            byType[type].count++;
            byType[type].visits += client.totalStops;
            byType[type].weight += client.totalWeight;
        });
        
        // تجميع حسب المحافظة
        const byGovernorate = {};
        filteredClients.forEach(client => {
            const gov = client.governorate || 'غير محدد';
            if (!byGovernorate[gov]) {
                byGovernorate[gov] = { count: 0, visits: 0, weight: 0 };
            }
            byGovernorate[gov].count++;
            byGovernorate[gov].visits += client.totalStops;
            byGovernorate[gov].weight += client.totalWeight;
        });
        
        return {
            clients: filteredClients,
            totalClients,
            totalVisits,
            completedVisits,
            totalWeight,
            byType: Object.entries(byType).map(([type, stats]) => ({ type, ...stats })),
            byGovernorate: Object.entries(byGovernorate).map(([governorate, stats]) => ({ governorate, ...stats }))
        };
    }, [reportData, displaySearchQuery, displayFilters]);

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
                case 'clients':
                    data = await generateClientsReport();
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

    const generateClientsReport = async () => {
        // جلب كل العملاء
        const { data: hospitals, error: hospitalsError } = await supabase
            .from('hospitals')
            .select('*');

        if (hospitalsError) {
            console.error('Clients error:', hospitalsError);
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

        const clientStats = hospitals?.map(hospital => {
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

        // إحصائيات إجمالية
        const totalClients = clientStats?.length || 0;
        const totalVisits = clientStats?.reduce((sum, c) => sum + c.totalStops, 0) || 0;
        const completedVisits = clientStats?.reduce((sum, c) => sum + c.completedStops, 0) || 0;
        const totalWeight = clientStats?.reduce((sum, c) => sum + c.totalWeight, 0) || 0;

        // تجميع حسب النوع
        const byType = {};
        clientStats?.forEach(client => {
            const type = client.client_type || 'hospital';
            if (!byType[type]) {
                byType[type] = { count: 0, visits: 0, weight: 0 };
            }
            byType[type].count++;
            byType[type].visits += client.totalStops;
            byType[type].weight += client.totalWeight;
        });

        // تجميع حسب المحافظة
        const byGovernorate = {};
        clientStats?.forEach(client => {
            const gov = client.governorate || 'غير محدد';
            if (!byGovernorate[gov]) {
                byGovernorate[gov] = { count: 0, visits: 0, weight: 0 };
            }
            byGovernorate[gov].count++;
            byGovernorate[gov].visits += client.totalStops;
            byGovernorate[gov].weight += client.totalWeight;
        });

        return {
            type: 'clients',
            clients: clientStats || [],
            totalClients,
            totalVisits,
            completedVisits,
            totalWeight,
            byType: Object.entries(byType).map(([type, stats]) => ({ type, ...stats })),
            byGovernorate: Object.entries(byGovernorate).map(([governorate, stats]) => ({ governorate, ...stats }))
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

        // جلب أسماء العملاء
        const { data: hospitals } = await supabase
            .from('hospitals')
            .select('id, name');

        const hospitalMap = {};
        hospitals?.forEach(h => {
            hospitalMap[h.id] = h.name;
        });

        // جلب route_stops لكل رحلة
        const routeIds = routes?.map(r => r.id) || [];
        let allStops = [];
        if (routeIds.length > 0) {
            const { data: stops } = await supabase
                .from('route_stops')
                .select('*')
                .in('route_id', routeIds);
            allStops = stops || [];
        }

        // تجميع البيانات حسب اليوم والمحرقة
        const dailyData = {};
        const incineratorTotals = {};
        let grandTotal = 0;

        // بيانات تفصيلية للعملاء
        const detailedData = [];

        for (const route of routes || []) {
            const date = route.route_date;
            const dayName = new Date(date).toLocaleDateString('ar-EG', { weekday: 'long' });
            const incineratorName = incineratorMap[route.incinerator_id] || 'غير محدد';

            // جلب محطات هذه الرحلة
            const routeStops = allStops.filter(s => s.route_id === route.id && s.status === 'collected');

            for (const stop of routeStops) {
                const clientName = hospitalMap[stop.hospital_id] || 'غير محدد';
                const weight = parseFloat(stop.weight_collected || 0);

                detailedData.push({
                    date,
                    dayName,
                    clientName,
                    weight,
                    incineratorName
                });

                grandTotal += weight;

                // إجمالي كل محرقة
                if (!incineratorTotals[incineratorName]) {
                    incineratorTotals[incineratorName] = 0;
                }
                incineratorTotals[incineratorName] += weight;
            }

            // تجميع حسب اليوم
            if (!dailyData[date]) {
                dailyData[date] = {
                    date,
                    dayName,
                    totalWeight: 0,
                    routesCount: 0,
                    byIncinerator: {},
                    clients: []
                };
            }
            
            const routeWeight = routeStops.reduce((sum, s) => sum + parseFloat(s.weight_collected || 0), 0);
            dailyData[date].totalWeight += routeWeight;
            dailyData[date].routesCount += 1;

            // تجميع حسب المحرقة في اليوم
            if (!dailyData[date].byIncinerator[incineratorName]) {
                dailyData[date].byIncinerator[incineratorName] = 0;
            }
            dailyData[date].byIncinerator[incineratorName] += routeWeight;

            // إضافة العملاء لهذا اليوم
            routeStops.forEach(stop => {
                dailyData[date].clients.push({
                    clientName: hospitalMap[stop.hospital_id] || 'غير محدد',
                    weight: parseFloat(stop.weight_collected || 0),
                    incineratorName
                });
            });
        }

        // تحويل البيانات لمصفوفة مرتبة
        const dailyArray = Object.values(dailyData).sort((a, b) => 
            new Date(a.date) - new Date(b.date)
        );

        return {
            type: 'incineration',
            dailyData: dailyArray,
            detailedData, // بيانات تفصيلية للتصدير
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

    const handleExport = async () => {
        if (!reportData) return;
        
        const wb = XLSX.utils.book_new();
        const reportName = reportTypes.find(t => t.id === reportType)?.name || 'تقرير';
        const companyName = 'Concept Eco Care';
        
        // Financial Report - Using ExcelJS
        if (reportData.type === 'financial') {
            const workbook = new ExcelJS.Workbook();
            
            // ========== Sheet 1: الفواتير ==========
            const invoicesSheet = workbook.addWorksheet('الفواتير', {
                views: [{ rightToLeft: true }]
            });

            invoicesSheet.mergeCells('A1:F1');
            const invTitleCell = invoicesSheet.getCell('A1');
            invTitleCell.value = 'التقرير المالي - الفواتير - ' + companyName;
            invTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
            invTitleCell.font = { bold: true, size: 14 };
            invTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            invoicesSheet.getRow(1).height = 30;

            const invHeaderRow = invoicesSheet.addRow(['م', 'رقم الفاتورة', 'العميل', 'التاريخ', 'المبلغ (ج.م)', 'الحالة']);
            invHeaderRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
                cell.font = { bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            let invRowNum = 1;
            reportData.invoices.forEach(inv => {
                const row = invoicesSheet.addRow([
                    invRowNum++,
                    inv.invoice_number || '-',
                    inv.hospitals?.name || '-',
                    inv.invoice_date || '-',
                    inv.total_amount || 0,
                    inv.status === 'paid' ? 'مدفوعة' : inv.status === 'pending' ? 'معلقة' : inv.status === 'overdue' ? 'متأخرة' : 'ملغاة'
                ]);
                row.eachCell((cell) => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
            });

            invoicesSheet.addRow([]);
            const invTotalRow = invoicesSheet.addRow(['', '', '', 'الإجمالي', reportData.totalRevenue, '']);
            invTotalRow.eachCell((cell) => { cell.font = { bold: true }; cell.alignment = { horizontal: 'center', vertical: 'middle' }; });

            invoicesSheet.columns = [{ width: 6 }, { width: 15 }, { width: 25 }, { width: 14 }, { width: 15 }, { width: 12 }];

            // ========== Sheet 2: المصروفات ==========
            if (reportData.expenses.length > 0) {
                const expSheet = workbook.addWorksheet('المصروفات', { views: [{ rightToLeft: true }] });

                expSheet.mergeCells('A1:E1');
                const expTitleCell = expSheet.getCell('A1');
                expTitleCell.value = 'التقرير المالي - المصروفات - ' + companyName;
                expTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
                expTitleCell.font = { bold: true, size: 14 };
                expTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

                const expHeaderRow = expSheet.addRow(['م', 'التاريخ', 'الوصف', 'الفئة', 'المبلغ (ج.م)']);
                expHeaderRow.eachCell((cell) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
                    cell.font = { bold: true };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });

                let expRowNum = 1;
                reportData.expenses.forEach(exp => {
                    const row = expSheet.addRow([expRowNum++, exp.expense_date || '-', exp.description || '-', exp.category || '-', exp.amount || 0]);
                    row.eachCell((cell) => {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                    });
                });

                expSheet.addRow([]);
                const expTotalRow = expSheet.addRow(['', '', '', 'الإجمالي', reportData.totalExpenses]);
                expTotalRow.eachCell((cell) => { cell.font = { bold: true }; cell.alignment = { horizontal: 'center', vertical: 'middle' }; });

                expSheet.columns = [{ width: 6 }, { width: 14 }, { width: 30 }, { width: 15 }, { width: 15 }];
            }

            // ========== Sheet 3: الملخص ==========
            const summarySheet = workbook.addWorksheet('الملخص', { views: [{ rightToLeft: true }] });

            summarySheet.mergeCells('A1:B1');
            const sumTitleCell = summarySheet.getCell('A1');
            sumTitleCell.value = 'التقرير المالي - ' + companyName;
            sumTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
            sumTitleCell.font = { bold: true, size: 14 };
            sumTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

            summarySheet.addRow([]);
            summarySheet.addRow(['من تاريخ', dateFrom]);
            summarySheet.addRow(['إلى تاريخ', dateTo]);
            summarySheet.addRow([]);
            summarySheet.addRow(['إجمالي الإيرادات (ج.م)', reportData.totalRevenue]);
            summarySheet.addRow(['إجمالي المصروفات (ج.م)', reportData.totalExpenses]);
            summarySheet.addRow(['صافي الربح (ج.م)', reportData.netProfit]);
            summarySheet.addRow([]);
            summarySheet.addRow(['عدد الفواتير', reportData.invoices.length]);
            summarySheet.addRow(['عدد المصروفات', reportData.expenses.length]);

            summarySheet.columns = [{ width: 25 }, { width: 20 }];

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reportName}_${dateFrom}_to_${dateTo}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
            return;
        }
        
        // Routes Report - Using ExcelJS
        else if (reportData.type === 'routes') {
            const workbook = new ExcelJS.Workbook();
            
            // ========== Sheet 1: تفاصيل الرحلات ==========
            const routesSheet = workbook.addWorksheet('تفاصيل الرحلات', { views: [{ rightToLeft: true }] });

            routesSheet.mergeCells('A1:G1');
            const routesTitleCell = routesSheet.getCell('A1');
            routesTitleCell.value = 'تقرير الرحلات - ' + companyName;
            routesTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
            routesTitleCell.font = { bold: true, size: 14 };
            routesTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            routesSheet.getRow(1).height = 30;

            const routesHeaderRow = routesSheet.addRow(['م', 'التاريخ', 'المندوب', 'المركبة', 'المحرقة', 'الحالة', 'الوزن (كجم)']);
            routesHeaderRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
                cell.font = { bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            let routeRowNum = 1;
            reportData.routes.forEach(route => {
                const row = routesSheet.addRow([
                    routeRowNum++,
                    route.route_date || '-',
                    route.representative_name || '-',
                    route.vehicle_plate || '-',
                    route.incinerator_name || '-',
                    route.status === 'completed' ? 'مكتملة' : route.status === 'in_progress' ? 'جارية' : 'معلقة',
                    route.total_weight_collected || 0
                ]);
                row.eachCell((cell) => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
            });

            routesSheet.addRow([]);
            const routesTotalRow = routesSheet.addRow(['', '', '', '', '', 'الإجمالي', reportData.totalWeight]);
            routesTotalRow.eachCell((cell) => { cell.font = { bold: true }; cell.alignment = { horizontal: 'center', vertical: 'middle' }; });

            routesSheet.columns = [{ width: 6 }, { width: 14 }, { width: 20 }, { width: 12 }, { width: 18 }, { width: 12 }, { width: 14 }];

            // ========== Sheet 2: الملخص ==========
            const summarySheet = workbook.addWorksheet('الملخص', { views: [{ rightToLeft: true }] });

            summarySheet.mergeCells('A1:B1');
            const sumTitleCell = summarySheet.getCell('A1');
            sumTitleCell.value = 'تقرير الرحلات - ' + companyName;
            sumTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
            sumTitleCell.font = { bold: true, size: 14 };
            sumTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

            summarySheet.addRow([]);
            summarySheet.addRow(['من تاريخ', dateFrom]);
            summarySheet.addRow(['إلى تاريخ', dateTo]);
            summarySheet.addRow([]);
            summarySheet.addRow(['إجمالي الرحلات', reportData.totalRoutes]);
            summarySheet.addRow(['الرحلات المكتملة', reportData.completedRoutes]);
            summarySheet.addRow(['الرحلات المعلقة', reportData.totalRoutes - reportData.completedRoutes]);
            summarySheet.addRow(['نسبة الإنجاز %', reportData.totalRoutes > 0 ? Math.round((reportData.completedRoutes / reportData.totalRoutes) * 100) : 0]);
            summarySheet.addRow(['إجمالي الوزن (كجم)', reportData.totalWeight]);

            summarySheet.columns = [{ width: 25 }, { width: 20 }];

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reportName}_${dateFrom}_to_${dateTo}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
            return;
        }
        
        // Clients Report - Using ExcelJS for RTL and styling
        else if (reportData.type === 'clients') {
            const workbook = new ExcelJS.Workbook();
            
            // ========== Sheet 1: حصر التعاقدات ==========
            const contractsSheet = workbook.addWorksheet('حصر التعاقدات', {
                views: [{ rightToLeft: true }]
            });

            // العنوان الرئيسي
            contractsSheet.mergeCells('A1:F1');
            const titleCell = contractsSheet.getCell('A1');
            titleCell.value = 'حصر التعاقدات لنقل ومعالجة النفايات من المنشآت الصحية';
            titleCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFFF00' }
            };
            titleCell.font = { bold: true, size: 14 };
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            contractsSheet.getRow(1).height = 30;

            // رؤوس الأعمدة - م في أقصى اليمين
            const headerRow = contractsSheet.addRow(['م', 'المنشأة', 'نوع المنشأة', 'العنوان', 'الحي', 'تاريخ التعاقد']);
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFFF00' }
                };
                cell.font = { bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            // البيانات
            let rowNum = 1;
            reportData.clients.forEach(client => {
                const clientType = client.client_type === 'hospital' ? 'مستشفى' : 
                                   client.client_type === 'clinic' ? 'عيادة' : 
                                   client.client_type === 'lab' ? 'معمل' : 
                                   client.client_type === 'medical_center' ? 'مركز طبي' : '-';
                
                const dataRow = contractsSheet.addRow([
                    rowNum++,
                    client.name || '-',
                    clientType,
                    client.governorate || '-',
                    client.city || '-',
                    client.created_at ? new Date(client.created_at).toLocaleDateString('ar-EG') : '-'
                ]);
                dataRow.eachCell((cell) => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });

            contractsSheet.columns = [
                { width: 6 },  // م
                { width: 25 }, // المنشأة
                { width: 15 }, // نوع المنشأة
                { width: 15 }, // العنوان
                { width: 15 }, // الحي
                { width: 15 }, // تاريخ التعاقد
            ];

            // ========== Sheet 2: تفاصيل العملاء ==========
            const detailsSheet = workbook.addWorksheet('تفاصيل العملاء', {
                views: [{ rightToLeft: true }]
            });

            detailsSheet.mergeCells('A1:G1');
            const detailsTitleCell = detailsSheet.getCell('A1');
            detailsTitleCell.value = 'تفاصيل العملاء - ' + companyName;
            detailsTitleCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFFF00' }
            };
            detailsTitleCell.font = { bold: true, size: 14 };
            detailsTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

            detailsSheet.addRow([]);

            const detailsHeaderRow = detailsSheet.addRow(['العميل', 'النوع', 'المحافظة', 'المدينة', 'الزيارات', 'المكتملة', 'الوزن (كجم)']);
            detailsHeaderRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFFF00' }
                };
                cell.font = { bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            reportData.clients.forEach(client => {
                const clientType = client.client_type === 'hospital' ? 'مستشفى' : 
                                   client.client_type === 'clinic' ? 'عيادة' : 
                                   client.client_type === 'lab' ? 'معمل' : 
                                   client.client_type === 'medical_center' ? 'مركز طبي' : '-';
                
                const row = detailsSheet.addRow([
                    client.name || '-',
                    clientType,
                    client.governorate || '-',
                    client.city || '-',
                    client.totalStops || 0,
                    client.completedStops || 0,
                    client.totalWeight || 0
                ]);
                row.eachCell((cell) => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });

            detailsSheet.addRow([]);
            const totalRow = detailsSheet.addRow([
                'الإجمالي', '', '', '',
                reportData.clients.reduce((sum, c) => sum + (c.totalStops || 0), 0),
                reportData.clients.reduce((sum, c) => sum + (c.completedStops || 0), 0),
                reportData.clients.reduce((sum, c) => sum + (c.totalWeight || 0), 0)
            ]);
            totalRow.eachCell((cell) => {
                cell.font = { bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            detailsSheet.columns = [
                { width: 25 },
                { width: 12 },
                { width: 15 },
                { width: 15 },
                { width: 12 },
                { width: 12 },
                { width: 15 },
            ];

            // ========== Sheet 3: الملخص ==========
            const summarySheet = workbook.addWorksheet('الملخص', {
                views: [{ rightToLeft: true }]
            });

            summarySheet.mergeCells('A1:B1');
            const sumTitleCell = summarySheet.getCell('A1');
            sumTitleCell.value = 'تقرير العملاء - ' + companyName;
            sumTitleCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFFF00' }
            };
            sumTitleCell.font = { bold: true, size: 14 };
            sumTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

            summarySheet.addRow([]);
            summarySheet.addRow(['من تاريخ', dateFrom]);
            summarySheet.addRow(['إلى تاريخ', dateTo]);
            summarySheet.addRow([]);
            summarySheet.addRow(['إجمالي العملاء', reportData.totalClients]);
            summarySheet.addRow(['إجمالي الزيارات', reportData.totalVisits]);
            summarySheet.addRow(['الزيارات المكتملة', reportData.completedVisits]);
            summarySheet.addRow(['إجمالي الوزن (كجم)', reportData.totalWeight]);

            summarySheet.columns = [
                { width: 25 },
                { width: 20 },
            ];

            // حفظ الملف
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reportName}_${dateFrom}_to_${dateTo}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
            return;
        }
        
        // Performance Report - Using ExcelJS
        else if (reportData.type === 'performance') {
            const workbook = new ExcelJS.Workbook();
            
            // ========== Sheet 1: أداء المندوبين ==========
            const perfSheet = workbook.addWorksheet('أداء المندوبين', { views: [{ rightToLeft: true }] });

            perfSheet.mergeCells('A1:F1');
            const perfTitleCell = perfSheet.getCell('A1');
            perfTitleCell.value = 'تقرير أداء المندوبين - ' + companyName;
            perfTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
            perfTitleCell.font = { bold: true, size: 14 };
            perfTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            perfSheet.getRow(1).height = 30;

            const perfHeaderRow = perfSheet.addRow(['م', 'المندوب', 'إجمالي الرحلات', 'الرحلات المكتملة', 'الوزن (كجم)', 'معدل الإنجاز %']);
            perfHeaderRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
                cell.font = { bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            let perfRowNum = 1;
            reportData.representatives.forEach(rep => {
                const row = perfSheet.addRow([
                    perfRowNum++,
                    rep.name || '-',
                    rep.totalRoutes || 0,
                    rep.completedRoutes || 0,
                    rep.totalWeight || 0,
                    rep.totalRoutes > 0 ? Math.round((rep.completedRoutes / rep.totalRoutes) * 100) : 0
                ]);
                row.eachCell((cell) => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
            });

            perfSheet.addRow([]);
            const perfTotalRow = perfSheet.addRow([
                '', 'الإجمالي',
                reportData.representatives.reduce((sum, r) => sum + (r.totalRoutes || 0), 0),
                reportData.representatives.reduce((sum, r) => sum + (r.completedRoutes || 0), 0),
                reportData.representatives.reduce((sum, r) => sum + (r.totalWeight || 0), 0),
                ''
            ]);
            perfTotalRow.eachCell((cell) => { cell.font = { bold: true }; cell.alignment = { horizontal: 'center', vertical: 'middle' }; });

            perfSheet.columns = [{ width: 6 }, { width: 25 }, { width: 15 }, { width: 18 }, { width: 15 }, { width: 15 }];

            // ========== Sheet 2: الملخص ==========
            const summarySheet = workbook.addWorksheet('الملخص', { views: [{ rightToLeft: true }] });

            summarySheet.mergeCells('A1:B1');
            const sumTitleCell = summarySheet.getCell('A1');
            sumTitleCell.value = 'تقرير أداء المندوبين - ' + companyName;
            sumTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
            sumTitleCell.font = { bold: true, size: 14 };
            sumTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

            summarySheet.addRow([]);
            summarySheet.addRow(['من تاريخ', dateFrom]);
            summarySheet.addRow(['إلى تاريخ', dateTo]);
            summarySheet.addRow([]);
            summarySheet.addRow(['عدد المندوبين', reportData.representatives.length]);
            summarySheet.addRow(['إجمالي الرحلات', reportData.representatives.reduce((sum, r) => sum + (r.totalRoutes || 0), 0)]);
            summarySheet.addRow(['الرحلات المكتملة', reportData.representatives.reduce((sum, r) => sum + (r.completedRoutes || 0), 0)]);
            summarySheet.addRow(['إجمالي الوزن (كجم)', reportData.representatives.reduce((sum, r) => sum + (r.totalWeight || 0), 0)]);

            summarySheet.columns = [{ width: 25 }, { width: 20 }];

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reportName}_${dateFrom}_to_${dateTo}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
            return;
        }

        // Incineration Report - Using ExcelJS for RTL and styling
        else if (reportData.type === 'incineration') {
            const workbook = new ExcelJS.Workbook();
            
            // ========== Sheet 1: بيان يومي ==========
            const dailySheet = workbook.addWorksheet('بيان يومي', {
                views: [{ rightToLeft: true }]
            });

            // العنوان الرئيسي
            dailySheet.mergeCells('A1:F1');
            const titleCell = dailySheet.getCell('A1');
            titleCell.value = 'بيان يومي بكمية النفايات المستلمة من المنشآت الصحية وجهة المعالجة';
            titleCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFFF00' } // أصفر
            };
            titleCell.font = { bold: true, size: 14 };
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            dailySheet.getRow(1).height = 30;

            // صف فارغ
            dailySheet.addRow([]);

            // رؤوس الأعمدة (من اليمين لليسار): م | اسم المنشأة | وزن النفايات | التاريخ | اليوم | وحدة المعالجة
            const headerRow = dailySheet.addRow(['م', 'اسم المنشأة', 'وزن النفايات', 'التاريخ/', 'اليوم/', 'وحدة المعالجة']);
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFFF00' } // أصفر
                };
                cell.font = { bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            // البيانات
            let rowNum = 1;
            reportData.detailedData?.forEach(item => {
                const dataRow = dailySheet.addRow([
                    rowNum++,
                    item.clientName,
                    item.weight,
                    item.date,
                    item.dayName,
                    item.incineratorName
                ]);
                dataRow.eachCell((cell) => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });

            // صف فارغ
            dailySheet.addRow([]);

            // صف الإجمالي
            const totalRow = dailySheet.addRow(['', 'الاجمالي', reportData.grandTotal, '', '', '']);
            totalRow.eachCell((cell, colNumber) => {
                if (colNumber === 2 || colNumber === 3) {
                    cell.font = { bold: true };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }
            });

            // عرض الأعمدة
            dailySheet.columns = [
                { width: 6 },  // م
                { width: 25 }, // اسم المنشأة
                { width: 14 }, // وزن النفايات
                { width: 14 }, // التاريخ
                { width: 12 }, // اليوم
                { width: 18 }, // وحدة المعالجة
            ];

            // ========== Sheet 2: تجميع البيان اليومي ==========
            const aggregatedSheet = workbook.addWorksheet('تجميع البيان اليومي', {
                views: [{ rightToLeft: true }]
            });

            // العنوان
            aggregatedSheet.mergeCells('A1:G1');
            const aggTitleCell = aggregatedSheet.getCell('A1');
            aggTitleCell.value = 'تجميع البيان اليومي';
            aggTitleCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFFF00' }
            };
            aggTitleCell.font = { bold: true, size: 14 };
            aggTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

            // صف رؤوس الأعمدة الرئيسية (صف 2)
            aggregatedSheet.mergeCells('E2:F2');
            const mainHeaderRow = aggregatedSheet.getRow(2);
            mainHeaderRow.getCell(1).value = 'التاريخ';
            mainHeaderRow.getCell(2).value = 'اليوم';
            mainHeaderRow.getCell(3).value = 'عدد المنشآت التي تم خدمتها';
            mainHeaderRow.getCell(4).value = 'كمية النفايات المستلمة من المنشآت';
            mainHeaderRow.getCell(5).value = 'كمية النفايات التي تم تسليمها إلى وحدات معالجة';
            mainHeaderRow.getCell(7).value = 'ملاحظات';
            
            mainHeaderRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFD9D9D9' } // رمادي فاتح
                };
                cell.font = { bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
            mainHeaderRow.height = 40;

            // صف رؤوس الأعمدة الفرعية (صف 3)
            const subHeaderRow = aggregatedSheet.getRow(3);
            subHeaderRow.getCell(5).value = 'الكمية';
            subHeaderRow.getCell(6).value = 'الجهة';
            
            subHeaderRow.eachCell((cell, colNumber) => {
                if (colNumber === 5 || colNumber === 6) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFD9D9D9' }
                    };
                    cell.font = { bold: true };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                }
            });

            // دمج الخلايا للأعمدة التي ليس لها صف فرعي
            aggregatedSheet.mergeCells('A2:A3');
            aggregatedSheet.mergeCells('B2:B3');
            aggregatedSheet.mergeCells('C2:C3');
            aggregatedSheet.mergeCells('D2:D3');
            aggregatedSheet.mergeCells('G2:G3');

            // البيانات
            let dataRowNum = 4;
            reportData.dailyData.forEach(day => {
                const row = aggregatedSheet.getRow(dataRowNum);
                row.getCell(1).value = day.date;
                row.getCell(2).value = day.dayName;
                row.getCell(3).value = day.clients?.length || 0;
                row.getCell(4).value = day.totalWeight;
                row.getCell(5).value = day.totalWeight; // الكمية المسلمة = نفس الكمية المستلمة
                
                // الجهة - أسماء المحارق
                const incineratorNames = Object.keys(day.byIncinerator || {}).join('، ');
                row.getCell(6).value = incineratorNames || '-';
                row.getCell(7).value = ''; // ملاحظات فارغة
                
                row.eachCell((cell) => {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
                dataRowNum++;
            });

            aggregatedSheet.columns = [
                { width: 14 }, // التاريخ
                { width: 12 }, // اليوم
                { width: 18 }, // عدد المنشآت
                { width: 20 }, // كمية النفايات المستلمة
                { width: 12 }, // الكمية
                { width: 25 }, // الجهة
                { width: 12 }, // ملاحظات
            ];

            // ========== Sheet 3: الملخص ==========
            const summarySheet = workbook.addWorksheet('الملخص', {
                views: [{ rightToLeft: true }]
            });

            summarySheet.mergeCells('A1:B1');
            const sumTitleCell = summarySheet.getCell('A1');
            sumTitleCell.value = 'تقرير الحرق اليومي - ' + companyName;
            sumTitleCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFFF00' }
            };
            sumTitleCell.font = { bold: true, size: 14 };
            sumTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

            summarySheet.addRow([]);
            summarySheet.addRow(['من تاريخ', dateFrom]);
            summarySheet.addRow(['إلى تاريخ', dateTo]);
            summarySheet.addRow([]);
            summarySheet.addRow(['إجمالي الكمية المحروقة (كجم)', reportData.grandTotal]);
            summarySheet.addRow(['عدد أيام العمل', reportData.totalDays]);
            summarySheet.addRow(['عدد الرحلات', reportData.totalRoutes]);
            summarySheet.addRow(['متوسط الحرق اليومي (كجم)', reportData.totalDays > 0 ? Math.round(reportData.grandTotal / reportData.totalDays) : 0]);

            summarySheet.columns = [
                { width: 25 },
                { width: 20 },
            ];

            // حفظ الملف
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reportName}_${dateFrom}_to_${dateTo}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
            return; // Exit early since we handled the download
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Report Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            نوع التقرير
                        </label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
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
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
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
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>

                    {/* Generate Button */}
                    <div className="flex items-end">
                        <button
                            onClick={handleGenerateReport}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 font-medium"
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
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <DollarSign className="w-5 h-5 text-green-600" />
                                        <p className="text-sm text-green-700">إجمالي الإيرادات</p>
                                    </div>
                                    <p className="text-2xl font-bold text-green-900">
                                        {reportData.totalRevenue.toLocaleString()} <span className="text-sm font-normal">ج.م</span>
                                    </p>
                                </div>
                                <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-5 h-5 text-red-600" />
                                        <p className="text-sm text-red-700">إجمالي المصروفات</p>
                                    </div>
                                    <p className="text-2xl font-bold text-red-900">
                                        {reportData.totalExpenses.toLocaleString()} <span className="text-sm font-normal">ج.م</span>
                                    </p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <DollarSign className="w-5 h-5 text-blue-600" />
                                        <p className="text-sm text-blue-700">صافي الربح</p>
                                    </div>
                                    <p className={`text-2xl font-bold ${reportData.netProfit >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                                        {reportData.netProfit.toLocaleString()} <span className="text-sm font-normal">ج.م</span>
                                    </p>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText className="w-5 h-5 text-purple-600" />
                                        <p className="text-sm text-purple-700">عدد الفواتير</p>
                                    </div>
                                    <p className="text-2xl font-bold text-purple-900">{reportData.invoices.length}</p>
                                </div>
                            </div>

                            {/* Invoices Table */}
                            <div>
                                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    الفواتير ({reportData.invoices.length})
                                </h3>
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                            <tr>
                                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">رقم الفاتورة</th>
                                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">العميل</th>
                                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">التاريخ</th>
                                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">الحالة</th>
                                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">المبلغ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {reportData.invoices.map(inv => (
                                                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{inv.invoice_number || '-'}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.hospitals?.name || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{inv.invoice_date}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                            inv.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                            inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {inv.status === 'paid' ? 'مدفوعة' : inv.status === 'pending' ? 'معلقة' : inv.status === 'overdue' ? 'متأخرة' : 'ملغاة'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-bold text-green-600">{(inv.total_amount || 0).toLocaleString()} ج.م</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-100 font-bold">
                                            <tr>
                                                <td className="px-4 py-3 text-sm" colSpan="4">الإجمالي</td>
                                                <td className="px-4 py-3 text-sm text-green-600">{reportData.totalRevenue.toLocaleString()} ج.م</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Expenses Summary */}
                            {reportData.expenses.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5" />
                                        المصروفات ({reportData.expenses.length})
                                    </h3>
                                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                                        <table className="w-full">
                                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">التاريخ</th>
                                                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">الوصف</th>
                                                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">الفئة</th>
                                                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">المبلغ</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {reportData.expenses.map(exp => (
                                                    <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3 text-sm text-gray-600">{exp.expense_date}</td>
                                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{exp.description || '-'}</td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{exp.category || '-'}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-bold text-red-600">{(exp.amount || 0).toLocaleString()} ج.م</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-gray-100 font-bold">
                                                <tr>
                                                    <td className="px-4 py-3 text-sm" colSpan="3">الإجمالي</td>
                                                    <td className="px-4 py-3 text-sm text-red-600">{reportData.totalExpenses.toLocaleString()} ج.م</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Routes Report */}
                    {reportData.type === 'routes' && (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Truck className="w-5 h-5 text-blue-600" />
                                        <p className="text-sm text-blue-700">إجمالي الرحلات</p>
                                    </div>
                                    <p className="text-2xl font-bold text-blue-900">{reportData.totalRoutes}</p>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-5 h-5 text-green-600" />
                                        <p className="text-sm text-green-700">الرحلات المكتملة</p>
                                    </div>
                                    <p className="text-2xl font-bold text-green-900">{reportData.completedRoutes}</p>
                                </div>
                                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="w-5 h-5 text-yellow-600" />
                                        <p className="text-sm text-yellow-700">نسبة الإنجاز</p>
                                    </div>
                                    <p className="text-2xl font-bold text-yellow-900">
                                        {reportData.totalRoutes > 0 ? Math.round((reportData.completedRoutes / reportData.totalRoutes) * 100) : 0}%
                                    </p>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Flame className="w-5 h-5 text-purple-600" />
                                        <p className="text-sm text-purple-700">إجمالي الوزن</p>
                                    </div>
                                    <p className="text-2xl font-bold text-purple-900">{reportData.totalWeight.toLocaleString()} <span className="text-sm font-normal">كجم</span></p>
                                </div>
                            </div>

                            {/* Routes Table */}
                            <div>
                                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Truck className="w-5 h-5" />
                                    تفاصيل الرحلات ({reportData.routes.length})
                                </h3>
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                            <tr>
                                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">التاريخ</th>
                                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">المندوب</th>
                                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">المركبة</th>
                                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">المحرقة</th>
                                                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">الحالة</th>
                                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">الوزن</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {reportData.routes.map(route => (
                                                <tr key={route.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{route.route_date}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{route.representative_name || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{route.vehicle_plate || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{route.incinerator_name || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-center">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                            route.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                            route.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                            {route.status === 'completed' ? '✓ مكتملة' :
                                                             route.status === 'in_progress' ? '⏳ جارية' : '⏸ معلقة'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-bold text-purple-600">{route.total_weight_collected || 0} كجم</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-100 font-bold">
                                            <tr>
                                                <td className="px-4 py-3 text-sm" colSpan="5">الإجمالي</td>
                                                <td className="px-4 py-3 text-sm text-purple-600">{reportData.totalWeight.toLocaleString()} كجم</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Clients Report */}
                    {reportData.type === 'clients' && filteredClientsData && (
                        <div className="space-y-6">
                            {/* فلاتر البحث على النتائج المعروضة */}
                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <Filter className="w-5 h-5 text-blue-600" />
                                    <h4 className="font-bold text-gray-800">فلترة النتائج</h4>
                                    <span className="text-xs text-gray-500">(يتم الفلترة تلقائياً)</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {/* البحث بالاسم */}
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">بحث باسم العميل</label>
                                        <div className="relative">
                                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={displaySearchQuery}
                                                onChange={(e) => setDisplaySearchQuery(e.target.value)}
                                                placeholder="اكتب اسم العميل..."
                                                className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* فلتر المحافظة */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">المحافظة</label>
                                        <select
                                            value={displayFilters.governorate}
                                            onChange={(e) => setDisplayFilters(prev => ({ ...prev, governorate: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        >
                                            <option value="">كل المحافظات</option>
                                            {governorates.map(gov => (
                                                <option key={gov} value={gov}>{gov}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {/* فلتر نوع العميل */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">نوع العميل</label>
                                        <select
                                            value={displayFilters.clientType}
                                            onChange={(e) => setDisplayFilters(prev => ({ ...prev, clientType: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        >
                                            <option value="">كل الأنواع</option>
                                            {clientTypes.map(type => (
                                                <option key={type.id} value={type.id}>{type.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {/* فلتر المدينة */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">المدينة</label>
                                        <select
                                            value={displayFilters.city}
                                            onChange={(e) => setDisplayFilters(prev => ({ ...prev, city: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        >
                                            <option value="">كل المدن</option>
                                            {cities.map(city => (
                                                <option key={city} value={city}>{city}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                {/* عرض الفلاتر النشطة */}
                                {(displaySearchQuery || displayFilters.governorate || displayFilters.clientType || displayFilters.city) && (
                                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                                        <span className="text-xs text-gray-500">الفلاتر النشطة:</span>
                                        {displaySearchQuery && (
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs flex items-center gap-1">
                                                البحث: {displaySearchQuery}
                                                <button onClick={() => setDisplaySearchQuery('')} className="hover:text-yellow-900">×</button>
                                            </span>
                                        )}
                                        {displayFilters.governorate && (
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs flex items-center gap-1">
                                                المحافظة: {displayFilters.governorate}
                                                <button onClick={() => setDisplayFilters(prev => ({ ...prev, governorate: '' }))} className="hover:text-blue-900">×</button>
                                            </span>
                                        )}
                                        {displayFilters.clientType && (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1">
                                                النوع: {clientTypes.find(t => t.id === displayFilters.clientType)?.name}
                                                <button onClick={() => setDisplayFilters(prev => ({ ...prev, clientType: '' }))} className="hover:text-green-900">×</button>
                                            </span>
                                        )}
                                        {displayFilters.city && (
                                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs flex items-center gap-1">
                                                المدينة: {displayFilters.city}
                                                <button onClick={() => setDisplayFilters(prev => ({ ...prev, city: '' }))} className="hover:text-purple-900">×</button>
                                            </span>
                                        )}
                                        <button 
                                            onClick={() => {
                                                setDisplaySearchQuery('');
                                                setDisplayFilters({ governorate: '', clientType: '', city: '' });
                                            }}
                                            className="text-xs text-red-600 hover:text-red-800 underline"
                                        >
                                            مسح الكل
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Users className="w-5 h-5 text-blue-600" />
                                        <p className="text-sm text-blue-700">إجمالي العملاء</p>
                                    </div>
                                    <p className="text-2xl font-bold text-blue-900">{filteredClientsData.totalClients}</p>
                                    {filteredClientsData.totalClients !== reportData.totalClients && (
                                        <p className="text-xs text-blue-600">من أصل {reportData.totalClients}</p>
                                    )}
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Truck className="w-5 h-5 text-green-600" />
                                        <p className="text-sm text-green-700">إجمالي الزيارات</p>
                                    </div>
                                    <p className="text-2xl font-bold text-green-900">{filteredClientsData.totalVisits}</p>
                                    {filteredClientsData.totalVisits !== reportData.totalVisits && (
                                        <p className="text-xs text-green-600">من أصل {reportData.totalVisits}</p>
                                    )}
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-5 h-5 text-purple-600" />
                                        <p className="text-sm text-purple-700">الزيارات المكتملة</p>
                                    </div>
                                    <p className="text-2xl font-bold text-purple-900">{filteredClientsData.completedVisits}</p>
                                    {filteredClientsData.completedVisits !== reportData.completedVisits && (
                                        <p className="text-xs text-purple-600">من أصل {reportData.completedVisits}</p>
                                    )}
                                </div>
                                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Flame className="w-5 h-5 text-orange-600" />
                                        <p className="text-sm text-orange-700">إجمالي الوزن</p>
                                    </div>
                                    <p className="text-2xl font-bold text-orange-900">{filteredClientsData.totalWeight.toLocaleString()} <span className="text-sm font-normal">كجم</span></p>
                                    {filteredClientsData.totalWeight !== reportData.totalWeight && (
                                        <p className="text-xs text-orange-600">من أصل {reportData.totalWeight.toLocaleString()} كجم</p>
                                    )}
                                </div>
                            </div>

                            {/* Distribution Charts */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* By Type */}
                                {filteredClientsData.byType.length > 0 && (
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <Building className="w-4 h-4" />
                                            توزيع حسب النوع
                                        </h4>
                                        <div className="space-y-2">
                                            {filteredClientsData.byType.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-100">
                                                    <span className="font-medium text-gray-700">
                                                        {item.type === 'hospital' ? '🏥 مستشفى' : item.type === 'clinic' ? '🏨 عيادة' : item.type === 'lab' ? '🔬 معمل' : '🏢 مركز طبي'}
                                                    </span>
                                                    <div className="flex items-center gap-4 text-sm">
                                                        <span className="text-blue-600">{item.count} عميل</span>
                                                        <span className="text-green-600">{item.visits} زيارة</span>
                                                        <span className="text-orange-600">{item.weight.toLocaleString()} كجم</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* By Governorate */}
                                {filteredClientsData.byGovernorate.length > 0 && (
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            توزيع حسب المحافظة
                                        </h4>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {filteredClientsData.byGovernorate.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-100">
                                                    <span className="font-medium text-gray-700">📍 {item.governorate}</span>
                                                    <div className="flex items-center gap-4 text-sm">
                                                        <span className="text-blue-600">{item.count} عميل</span>
                                                        <span className="text-green-600">{item.visits} زيارة</span>
                                                        <span className="text-orange-600">{item.weight.toLocaleString()} كجم</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Clients Table */}
                            <div>
                                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Users className="w-5 h-5" />
                                    تفاصيل العملاء ({filteredClientsData.clients.length})
                                    {filteredClientsData.clients.length !== reportData.clients.length && (
                                        <span className="text-sm font-normal text-gray-500">من أصل {reportData.clients.length}</span>
                                    )}
                                </h3>
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                            <tr>
                                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">العميل</th>
                                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">النوع</th>
                                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">المحافظة</th>
                                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">المدينة</th>
                                                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">الزيارات</th>
                                                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">المكتملة</th>
                                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">الوزن</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredClientsData.clients.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                                                        لا توجد نتائج مطابقة للبحث
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredClientsData.clients.map(client => (
                                                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{client.name}</td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                client.client_type === 'hospital' ? 'bg-blue-100 text-blue-700' :
                                                                client.client_type === 'clinic' ? 'bg-green-100 text-green-700' :
                                                                client.client_type === 'lab' ? 'bg-purple-100 text-purple-700' :
                                                                'bg-orange-100 text-orange-700'
                                                            }`}>
                                                                {client.client_type === 'hospital' ? 'مستشفى' : client.client_type === 'clinic' ? 'عيادة' : client.client_type === 'lab' ? 'معمل' : 'مركز طبي'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">{client.governorate || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">{client.city || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-center">{client.totalStops}</td>
                                                        <td className="px-4 py-3 text-sm text-center">
                                                            <span className="text-green-600 font-medium">{client.completedStops}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-bold text-orange-600">{client.totalWeight.toLocaleString()} كجم</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                        <tfoot className="bg-gray-100 font-bold">
                                            <tr>
                                                <td className="px-4 py-3 text-sm" colSpan="4">الإجمالي</td>
                                                <td className="px-4 py-3 text-sm text-center">{filteredClientsData.totalVisits}</td>
                                                <td className="px-4 py-3 text-sm text-center text-green-600">{filteredClientsData.completedVisits}</td>
                                                <td className="px-4 py-3 text-sm text-orange-600">{filteredClientsData.totalWeight.toLocaleString()} كجم</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Performance Report */}
                    {reportData.type === 'performance' && (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Users className="w-5 h-5 text-blue-600" />
                                        <p className="text-sm text-blue-700">عدد المندوبين</p>
                                    </div>
                                    <p className="text-2xl font-bold text-blue-900">{reportData.representatives.length}</p>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Truck className="w-5 h-5 text-green-600" />
                                        <p className="text-sm text-green-700">إجمالي الرحلات</p>
                                    </div>
                                    <p className="text-2xl font-bold text-green-900">
                                        {reportData.representatives.reduce((sum, r) => sum + r.totalRoutes, 0)}
                                    </p>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-5 h-5 text-purple-600" />
                                        <p className="text-sm text-purple-700">الرحلات المكتملة</p>
                                    </div>
                                    <p className="text-2xl font-bold text-purple-900">
                                        {reportData.representatives.reduce((sum, r) => sum + r.completedRoutes, 0)}
                                    </p>
                                </div>
                                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Flame className="w-5 h-5 text-orange-600" />
                                        <p className="text-sm text-orange-700">إجمالي الوزن</p>
                                    </div>
                                    <p className="text-2xl font-bold text-orange-900">
                                        {reportData.representatives.reduce((sum, r) => sum + r.totalWeight, 0).toLocaleString()} <span className="text-sm font-normal">كجم</span>
                                    </p>
                                </div>
                            </div>

                            {/* Performance Table */}
                            <div>
                                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Users className="w-5 h-5" />
                                    أداء المندوبين ({reportData.representatives.length})
                                </h3>
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                            <tr>
                                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">المندوب</th>
                                                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">إجمالي الرحلات</th>
                                                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">المكتملة</th>
                                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">الوزن</th>
                                                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">معدل الإنجاز</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {reportData.representatives.map((rep, idx) => {
                                                const completionRate = rep.totalRoutes > 0 ? Math.round((rep.completedRoutes / rep.totalRoutes) * 100) : 0;
                                                return (
                                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-8 h-8 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold">
                                                                    {rep.name.charAt(0)}
                                                                </span>
                                                                {rep.name}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-center text-gray-600">{rep.totalRoutes}</td>
                                                        <td className="px-4 py-3 text-sm text-center">
                                                            <span className="text-green-600 font-medium">{rep.completedRoutes}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-bold text-orange-600">{rep.totalWeight.toLocaleString()} كجم</td>
                                                        <td className="px-4 py-3 text-sm text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className={`h-full rounded-full ${
                                                                            completionRate >= 80 ? 'bg-green-500' :
                                                                            completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                                        }`}
                                                                        style={{ width: `${completionRate}%` }}
                                                                    />
                                                                </div>
                                                                <span className={`font-bold ${
                                                                    completionRate >= 80 ? 'text-green-600' :
                                                                    completionRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                                                                }`}>
                                                                    {completionRate}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-gray-100 font-bold">
                                            <tr>
                                                <td className="px-4 py-3 text-sm">الإجمالي</td>
                                                <td className="px-4 py-3 text-sm text-center">{reportData.representatives.reduce((sum, r) => sum + r.totalRoutes, 0)}</td>
                                                <td className="px-4 py-3 text-sm text-center text-green-600">{reportData.representatives.reduce((sum, r) => sum + r.completedRoutes, 0)}</td>
                                                <td className="px-4 py-3 text-sm text-orange-600">{reportData.representatives.reduce((sum, r) => sum + r.totalWeight, 0).toLocaleString()} كجم</td>
                                                <td className="px-4 py-3 text-sm text-center">-</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Incineration Report */}
                    {reportData.type === 'incineration' && (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Flame className="w-5 h-5 text-orange-600" />
                                        <p className="text-sm text-orange-700">إجمالي الكمية المحروقة</p>
                                    </div>
                                    <p className="text-2xl font-bold text-orange-900">
                                        {reportData.grandTotal.toLocaleString()} <span className="text-sm font-normal">كجم</span>
                                    </p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="w-5 h-5 text-blue-600" />
                                        <p className="text-sm text-blue-700">عدد الأيام</p>
                                    </div>
                                    <p className="text-2xl font-bold text-blue-900">{reportData.totalDays}</p>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Truck className="w-5 h-5 text-green-600" />
                                        <p className="text-sm text-green-700">عدد الرحلات</p>
                                    </div>
                                    <p className="text-2xl font-bold text-green-900">{reportData.totalRoutes}</p>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-5 h-5 text-purple-600" />
                                        <p className="text-sm text-purple-700">متوسط الحرق اليومي</p>
                                    </div>
                                    <p className="text-2xl font-bold text-purple-900">
                                        {reportData.totalDays > 0 ? Math.round(reportData.grandTotal / reportData.totalDays).toLocaleString() : 0} <span className="text-sm font-normal">كجم</span>
                                    </p>
                                </div>
                            </div>

                            {/* Incinerator Totals */}
                            {reportData.incineratorTotals.length > 0 && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <Flame className="w-4 h-4" />
                                        توزيع الكميات على المحارق
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {reportData.incineratorTotals.map((inc, idx) => {
                                            const percentage = reportData.grandTotal > 0 ? Math.round((inc.total / reportData.grandTotal) * 100) : 0;
                                            return (
                                                <div key={idx} className="bg-white rounded-lg p-4 border border-gray-100">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-medium text-gray-700">🔥 {inc.name}</span>
                                                        <span className="text-xs text-gray-500">{percentage}%</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-lg font-bold text-orange-600">{inc.total.toLocaleString()} كجم</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Daily Details Table */}
                            <div>
                                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    التفاصيل اليومية ({reportData.dailyData.length} يوم)
                                </h3>
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                            <tr>
                                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">التاريخ</th>
                                                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">عدد الرحلات</th>
                                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">إجمالي الوزن</th>
                                                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">التوزيع على المحارق</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {reportData.dailyData.map((day, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{day.date}</td>
                                                    <td className="px-4 py-3 text-sm text-center">
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                            {day.routesCount} رحلة
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-bold text-orange-600">
                                                        {day.totalWeight.toLocaleString()} كجم
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <div className="flex flex-wrap gap-1">
                                                            {Object.entries(day.byIncinerator).map(([name, weight], i) => (
                                                                <span key={i} className="px-2 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded text-xs">
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
                                                <td className="px-4 py-3 text-sm">الإجمالي</td>
                                                <td className="px-4 py-3 text-sm text-center text-blue-600">{reportData.totalRoutes} رحلة</td>
                                                <td className="px-4 py-3 text-sm text-orange-600">{reportData.grandTotal.toLocaleString()} كجم</td>
                                                <td className="px-4 py-3 text-sm"></td>
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
                            setReportType('clients');
                        }}
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-brand-400 hover:bg-brand-50 transition-all group text-right"
                    >
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">أداء العملاء</p>
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
