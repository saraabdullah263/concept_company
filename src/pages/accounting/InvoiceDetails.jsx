import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { ArrowRight, Printer, Download, Edit, Loader2, Calendar, Building2, FileText, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { getCachedLogoBase64 } from '../../utils/logoBase64';

const InvoiceDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [logoBase64, setLogoBase64] = useState(null);

    useEffect(() => {
        fetchInvoiceDetails();
        getCachedLogoBase64().then(setLogoBase64);
    }, [id]);

    const fetchInvoiceDetails = async () => {
        try {
            setLoading(true);

            // Fetch invoice with hospital details
            const { data: invoiceData, error: invoiceError } = await supabase
                .from('invoices')
                .select(`
                    *,
                    hospitals (
                        name,
                        address,
                        contact_person,
                        contact_phone
                    ),
                    contracts (
                        contract_number,
                        price_per_kg
                    )
                `)
                .eq('id', id)
                .single();

            if (invoiceError) {
                console.error('Invoice fetch error:', invoiceError);
                throw invoiceError;
            }
            
            setInvoice(invoiceData);

            // Fetch related routes (optional - may not exist)
            try {
                const { data: routesData, error: routesError } = await supabase
                    .from('invoice_routes')
                    .select(`
                        route_id,
                        routes (
                            id,
                            route_name,
                            route_date,
                            status,
                            route_stops (
                                weight_collected,
                                hospital_id
                            )
                        )
                    `)
                    .eq('invoice_id', id);

                if (!routesError && routesData) {
                    // Filter and calculate weights for this hospital
                    const processedRoutes = routesData?.map(item => {
                        const route = item.routes;
                        const hospitalWeight = route.route_stops
                            ?.filter(stop => stop.hospital_id === invoiceData.hospital_id)
                            .reduce((sum, stop) => sum + (parseFloat(stop.weight_collected) || 0), 0) || 0;

                        return {
                            ...route,
                            weight_for_hospital: hospitalWeight
                        };
                    }) || [];

                    setRoutes(processedRoutes);
                }
            } catch (routesErr) {
                console.warn('Could not fetch routes:', routesErr);
                // Continue without routes
            }

        } catch (error) {
            console.error('Error fetching invoice details:', error);
            alert('حدث خطأ أثناء تحميل تفاصيل الفاتورة: ' + (error.message || 'خطأ غير معروف'));
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        const invoiceHTML = generateInvoiceHTML();
        
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
        }, 300);
    };

    const generateInvoiceHTML = () => {
        const logoUrl = logoBase64 || `${window.location.origin}/logo.png`;
        const totalWeight = routes.reduce((sum, route) => sum + route.weight_for_hospital, 0);
        
        const routesRows = routes.map((route) => {
            const amount = route.weight_for_hospital * (invoice.contracts?.price_per_kg || 0);
            return `
                <tr>
                    <td class="px-4 py-3">${route.route_name || `رحلة ${route.id.slice(0, 8)}`}</td>
                    <td class="px-4 py-3 font-mono">${format(new Date(route.route_date), 'dd/MM/yyyy')}</td>
                    <td class="px-4 py-3 font-bold">${route.weight_for_hospital.toFixed(2)}</td>
                    <td class="px-4 py-3">${invoice.contracts?.price_per_kg || '-'}</td>
                    <td class="px-4 py-3 font-bold">${amount.toFixed(2)} ج.م</td>
                </tr>
            `;
        }).join('');

        return `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>فاتورة ${invoice.invoice_number}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        direction: rtl;
                        padding: 20mm;
                        background: white;
                    }
                    
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 3px solid #0284c7;
                    }
                    
                    .header h1 {
                        font-size: 28pt;
                        color: #0284c7;
                        margin-bottom: 10px;
                    }
                    
                    .header h2 {
                        font-size: 16pt;
                        color: #666;
                    }
                    
                    .info-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 30px;
                        margin-bottom: 30px;
                    }
                    
                    .info-section h3 {
                        font-size: 12pt;
                        color: #666;
                        margin-bottom: 15px;
                        padding-bottom: 5px;
                        border-bottom: 1px solid #ddd;
                    }
                    
                    .info-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 8px 0;
                        font-size: 10pt;
                    }
                    
                    .info-label {
                        color: #666;
                    }
                    
                    .info-value {
                        font-weight: bold;
                    }
                    
                    .status-badge {
                        display: inline-block;
                        padding: 4px 12px;
                        border-radius: 12px;
                        font-size: 9pt;
                        font-weight: bold;
                    }
                    
                    .status-sent {
                        background: #dbeafe;
                        color: #1e40af;
                    }
                    
                    .status-paid {
                        background: #dcfce7;
                        color: #166534;
                    }
                    
                    .status-draft {
                        background: #f3f4f6;
                        color: #374151;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 30px 0;
                        border: 1px solid #ddd;
                    }
                    
                    thead {
                        background: #f3f4f6;
                    }
                    
                    th {
                        padding: 12px;
                        text-align: right;
                        font-size: 10pt;
                        font-weight: bold;
                        border-bottom: 2px solid #ddd;
                    }
                    
                    td {
                        padding: 10px 12px;
                        text-align: right;
                        font-size: 10pt;
                        border-bottom: 1px solid #f3f4f6;
                    }
                    
                    tfoot {
                        background: #f3f4f6;
                        font-weight: bold;
                    }
                    
                    tfoot td {
                        border-top: 2px solid #ddd;
                    }
                    
                    .total-section {
                        border-top: 3px solid #0284c7;
                        padding-top: 20px;
                        margin-top: 30px;
                        text-align: left;
                    }
                    
                    .total-amount {
                        font-size: 24pt;
                        font-weight: bold;
                        color: #0284c7;
                    }
                    
                    .notes {
                        margin-top: 30px;
                        padding: 15px;
                        background: #f9fafb;
                        border-radius: 8px;
                    }
                    
                    .notes h4 {
                        font-size: 11pt;
                        margin-bottom: 10px;
                    }
                    
                    .footer {
                        margin-top: 50px;
                        padding-top: 20px;
                        border-top: 1px solid #ddd;
                        text-align: center;
                        font-size: 9pt;
                        color: #666;
                    }
                    
                    @media print {
                        body {
                            padding: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="${logoUrl}" alt="Concept Eco Care" style="height: 80px; margin-bottom: 10px;" />
                    <h1>Concept Eco Care</h1>
                    <h2>فاتورة</h2>
                </div>

                <div class="info-grid">
                    <div class="info-section">
                        <h3>معلومات العميل</h3>
                        <div class="info-row">
                            <span class="info-label">اسم المستشفى:</span>
                            <span class="info-value">${invoice.hospitals?.name || '-'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">العنوان:</span>
                            <span class="info-value">${invoice.hospitals?.address || '-'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">جهة الاتصال:</span>
                            <span class="info-value">${invoice.hospitals?.contact_person || '-'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">الهاتف:</span>
                            <span class="info-value">${invoice.hospitals?.contact_phone || '-'}</span>
                        </div>
                    </div>

                    <div class="info-section">
                        <h3>معلومات الفاتورة</h3>
                        <div class="info-row">
                            <span class="info-label">رقم الفاتورة:</span>
                            <span class="info-value" style="color: #0284c7;">#${invoice.invoice_number}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">تاريخ الإصدار:</span>
                            <span class="info-value">${format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">تاريخ الاستحقاق:</span>
                            <span class="info-value">${format(new Date(invoice.due_date), 'dd/MM/yyyy')}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">الحالة:</span>
                            <span class="status-badge status-${invoice.status}">${getStatusText(invoice.status)}</span>
                        </div>
                        ${invoice.contracts?.contract_number ? `
                        <div class="info-row">
                            <span class="info-label">رقم العقد:</span>
                            <span class="info-value">${invoice.contracts.contract_number}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                ${routes.length > 0 ? `
                <h3 style="font-size: 14pt; margin-bottom: 15px;">الرحلات المرتبطة</h3>
                <table>
                    <thead>
                        <tr>
                            <th>اسم الرحلة</th>
                            <th>التاريخ</th>
                            <th>الوزن (كجم)</th>
                            <th>السعر/كجم</th>
                            <th>المبلغ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${routesRows}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2" style="text-align: left;">الإجمالي</td>
                            <td>${totalWeight.toFixed(2)} كجم</td>
                            <td></td>
                            <td>${(totalWeight * (invoice.contracts?.price_per_kg || 0)).toFixed(2)} ج.م</td>
                        </tr>
                    </tfoot>
                </table>
                ` : ''}

                <div class="total-section">
                    <div style="font-size: 14pt; margin-bottom: 10px;">المبلغ الإجمالي:</div>
                    <div class="total-amount">${invoice.total_amount?.toLocaleString() || 0} ج.م</div>
                </div>

                ${invoice.notes ? `
                <div class="notes">
                    <h4>ملاحظات:</h4>
                    <p style="font-size: 10pt; color: #666;">${invoice.notes}</p>
                </div>
                ` : ''}

                <div class="footer">
                    <p>شكراً لتعاملكم معنا</p>
                    <p style="margin-top: 5px;">للاستفسارات: info@medicalwaste.com | 01234567890</p>
                </div>
            </body>
            </html>
        `;
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'sent': return 'bg-blue-100 text-blue-800';
            case 'overdue': return 'bg-red-100 text-red-800';
            case 'draft': return 'bg-gray-100 text-gray-800';
            case 'cancelled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'paid': return 'تم الدفع';
            case 'sent': return 'مرسلة';
            case 'overdue': return 'متأخرة';
            case 'draft': return 'مسودة';
            case 'cancelled': return 'ملغاة';
            default: return status;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">الفاتورة غير موجودة</p>
            </div>
        );
    }

    const totalWeight = routes.reduce((sum, route) => sum + route.weight_for_hospital, 0);

    return (
        <div className="space-y-6 print:space-y-4">
            {/* Header - Hidden in print */}
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/invoices')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">تفاصيل الفاتورة</h1>
                        <p className="text-sm text-gray-500 mt-1">#{invoice.invoice_number}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                        <span>طباعة</span>
                    </button>
                </div>
            </div>

            {/* Invoice Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 print:shadow-none print:border-0">
                {/* Company Header */}
                <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
                    <h2 className="text-3xl font-bold text-brand-600 mb-2">Concept Eco Care</h2>
                    <p className="text-gray-600">فاتورة</p>
                </div>

                {/* Invoice Info Grid */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    {/* Client Info */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            معلومات العميل
                        </h3>
                        <div className="space-y-2">
                            <p className="font-bold text-lg text-gray-900">{invoice.hospitals?.name}</p>
                            <p className="text-sm text-gray-600">{invoice.hospitals?.address || '-'}</p>
                            <p className="text-sm text-gray-600">جهة الاتصال: {invoice.hospitals?.contact_person || '-'}</p>
                            <p className="text-sm text-gray-600">الهاتف: {invoice.hospitals?.contact_phone || '-'}</p>
                        </div>
                    </div>

                    {/* Invoice Info */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            معلومات الفاتورة
                        </h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">رقم الفاتورة:</span>
                                <span className="font-mono font-bold text-brand-600">#{invoice.invoice_number}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">تاريخ الإصدار:</span>
                                <span className="font-medium">{format(new Date(invoice.invoice_date), 'dd/MM/yyyy', { locale: ar })}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">تاريخ الاستحقاق:</span>
                                <span className="font-medium">{format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: ar })}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">الحالة:</span>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(invoice.status)}`}>
                                    {getStatusText(invoice.status)}
                                </span>
                            </div>
                            {invoice.contracts?.contract_number && (
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">رقم العقد:</span>
                                    <span className="font-medium">{invoice.contracts.contract_number}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Routes Table */}
                {routes.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">الرحلات المرتبطة</h3>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold text-gray-700">اسم الرحلة</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">التاريخ</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">الوزن (كجم)</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">السعر/كجم</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">المبلغ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {routes.map((route) => {
                                        const amount = route.weight_for_hospital * (invoice.contracts?.price_per_kg || 0);
                                        return (
                                            <tr key={route.id}>
                                                <td className="px-4 py-3">{route.route_name || `رحلة ${route.id.slice(0, 8)}`}</td>
                                                <td className="px-4 py-3 font-mono">{format(new Date(route.route_date), 'dd/MM/yyyy')}</td>
                                                <td className="px-4 py-3 font-bold">{route.weight_for_hospital.toFixed(2)}</td>
                                                <td className="px-4 py-3">{invoice.contracts?.price_per_kg || '-'}</td>
                                                <td className="px-4 py-3 font-bold">{amount.toFixed(2)} ج.م</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-gray-50 font-bold">
                                    <tr>
                                        <td colSpan="2" className="px-4 py-3 text-left">الإجمالي</td>
                                        <td className="px-4 py-3">{totalWeight.toFixed(2)} كجم</td>
                                        <td className="px-4 py-3"></td>
                                        <td className="px-4 py-3">{(totalWeight * (invoice.contracts?.price_per_kg || 0)).toFixed(2)} ج.م</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {/* Total Section */}
                <div className="border-t-2 border-gray-200 pt-6">
                    <div className="flex justify-end">
                        <div className="w-full max-w-sm space-y-3">
                            <div className="flex justify-between text-lg">
                                <span className="text-gray-600">المبلغ الإجمالي:</span>
                                <span className="font-bold text-2xl text-brand-600">{invoice.total_amount?.toLocaleString() || 0} ج.م</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                    <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-gray-700 mb-2">ملاحظات:</h4>
                        <p className="text-sm text-gray-600">{invoice.notes}</p>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
                    <p>شكراً لتعاملكم معنا</p>
                    <p className="mt-1">للاستفسارات: info@medicalwaste.com | 01234567890</p>
                </div>
            </div>
        </div>
    );
};

export default InvoiceDetails;
