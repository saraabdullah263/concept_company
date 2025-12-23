import { Printer } from 'lucide-react';
import { getCachedLogoBase64 } from '../../utils/logoBase64';

const PrintCompleteReceipt = ({ route, stops, deliveries }) => {
    const handlePrint = async () => {
        const logoBase64 = await getCachedLogoBase64();
        const printWindow = window.open('', '_blank');
        const receiptHTML = generateCompleteReceiptHTML(route, stops, deliveries, logoBase64);
        
        printWindow.document.write(receiptHTML);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
        }, 300);
    };

    const generateCompleteReceiptHTML = (route, stops, deliveries, logoSrc) => {
        const logoUrl = logoSrc || `${window.location.origin}/logo.png`;
        const routeDate = new Date(route.route_date).toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const totalCollected = {
            bags: stops.reduce((sum, stop) => sum + (stop.collection_details?.bags_count || 0), 0),
            weight: stops.reduce((sum, stop) => sum + (parseFloat(stop.collection_details?.total_weight) || 0), 0)
        };

        const totalDelivered = {
            bags: deliveries.reduce((sum, d) => sum + parseInt(d.bags_count || 0), 0),
            weight: deliveries.reduce((sum, d) => sum + parseFloat(d.weight_delivered || 0), 0)
        };

        const remaining = {
            bags: totalCollected.bags - totalDelivered.bags,
            weight: (totalCollected.weight - totalDelivered.weight).toFixed(2)
        };

        // جدول التجميع
        const collectionRows = stops.map((stop, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${stop.hospitals?.name || 'غير محدد'}</td>
                <td>${stop.collection_details?.bags_count || 0}</td>
                <td>${stop.collection_details?.total_weight || 0}</td>
                <td>${stop.collection_details?.collection_time ? 
                    new Date(stop.collection_details.collection_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) 
                    : '-'}</td>
            </tr>
        `).join('');

        // جدول التسليم للمحارق
        const deliveryRows = deliveries.map((delivery, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${delivery.incinerators?.name || 'غير محدد'}</td>
                <td>${delivery.bags_count}</td>
                <td>${delivery.weight_delivered}</td>
                <td>${new Date(delivery.delivery_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</td>
            </tr>
        `).join('');

        return `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>إيصال مجمع - رحلة ${route.id.slice(0, 8)}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        direction: rtl;
                        padding: 15mm;
                    }
                    
                    .receipt {
                        border: 3px solid #000;
                        padding: 10mm;
                        max-width: 210mm;
                        margin: 0 auto;
                    }
                    
                    .header {
                        display: flex;
                        align-items: center;
                        border-bottom: 3px solid #000;
                        padding-bottom: 5mm;
                        margin-bottom: 5mm;
                    }
                    
                    .header img {
                        height: 80px;
                    }
                    
                    .header-text {
                        flex: 1;
                        text-align: center;
                    }
                    
                    .header h1 {
                        font-size: 20pt;
                        color: #0066cc;
                        margin-bottom: 3mm;
                    }
                    
                    .header h2 {
                        font-size: 16pt;
                        color: #333;
                    }
                    
                    .info-section {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 3mm;
                        margin-bottom: 5mm;
                        padding: 3mm;
                        background: #f5f5f5;
                        border-radius: 2mm;
                    }
                    
                    .info-item {
                        font-size: 11pt;
                    }
                    
                    .info-label {
                        font-weight: bold;
                        color: #555;
                    }
                    
                    .section-title {
                        font-size: 14pt;
                        font-weight: bold;
                        background: #0066cc;
                        color: white;
                        padding: 2mm 3mm;
                        margin: 5mm 0 3mm 0;
                        border-radius: 2mm;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 5mm;
                        font-size: 10pt;
                    }
                    
                    th {
                        background: #e6f2ff;
                        border: 1px solid #333;
                        padding: 2mm;
                        font-weight: bold;
                        text-align: center;
                    }
                    
                    td {
                        border: 1px solid #666;
                        padding: 2mm;
                        text-align: center;
                    }
                    
                    .totals-row {
                        background: #fff3cd;
                        font-weight: bold;
                    }
                    
                    .summary-boxes {
                        display: grid;
                        grid-template-columns: 1fr 1fr 1fr;
                        gap: 3mm;
                        margin: 5mm 0;
                    }
                    
                    .summary-box {
                        border: 2px solid #333;
                        padding: 3mm;
                        text-align: center;
                        border-radius: 2mm;
                    }
                    
                    .summary-box.collected {
                        background: #e3f2fd;
                        border-color: #0066cc;
                    }
                    
                    .summary-box.delivered {
                        background: #e8f5e9;
                        border-color: #00cc66;
                    }
                    
                    .summary-box.remaining {
                        background: #fff3e0;
                        border-color: #ff9800;
                    }
                    
                    .summary-label {
                        font-size: 10pt;
                        color: #666;
                        margin-bottom: 2mm;
                    }
                    
                    .summary-value {
                        font-size: 14pt;
                        font-weight: bold;
                    }
                    
                    .signatures {
                        display: grid;
                        grid-template-columns: 1fr 1fr 1fr;
                        gap: 5mm;
                        margin-top: 8mm;
                        padding-top: 5mm;
                        border-top: 2px solid #333;
                    }
                    
                    .signature-box {
                        text-align: center;
                    }
                    
                    .signature-label {
                        font-weight: bold;
                        font-size: 11pt;
                        margin-bottom: 2mm;
                    }
                    
                    .signature-line {
                        height: 15mm;
                        border-bottom: 2px solid #333;
                        margin: 3mm 0;
                    }
                    
                    .signature-name {
                        font-size: 9pt;
                        color: #666;
                    }
                    
                    .footer {
                        text-align: center;
                        margin-top: 5mm;
                        padding-top: 3mm;
                        border-top: 1px solid #ccc;
                        font-size: 9pt;
                        color: #666;
                    }
                    
                    @media print {
                        body {
                            padding: 0;
                        }
                        
                        .receipt {
                            border: 3px solid #000;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <!-- Header -->
                    <div class="header">
                        <div class="header-text">
                            <h1>Concept Eco Care</h1>
                            <h2>إيصال مجمع تسليم نفايات طبية خطرة للمحرقة</h2>
                        </div>
                        <img src="${logoUrl}" alt="Concept Eco Care" />
                    </div>
                    
                    <!-- Route Info -->
                    <div class="info-section">
                        <div class="info-item">
                            <span class="info-label">رقم الإيصال: </span>
                            <span>${route.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">التاريخ: </span>
                            <span>${routeDate}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">المندوب: </span>
                            <span>${route.representatives?.users?.full_name || 'غير محدد'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">رقم السيارة: </span>
                            <span>${route.vehicles?.plate_number || 'غير محدد'}</span>
                        </div>
                    </div>
                    
                    <!-- Collection Section -->
                    <div class="section-title">📋 تفاصيل التجميع من العملاء</div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 8%">م</th>
                                <th style="width: 40%">اسم المنشأة</th>
                                <th style="width: 17%">عدد الأكياس</th>
                                <th style="width: 17%">الوزن (كجم)</th>
                                <th style="width: 18%">ساعة الاستلام</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${collectionRows}
                            <tr class="totals-row">
                                <td colspan="2">الإجمالي</td>
                                <td>${totalCollected.bags}</td>
                                <td>${totalCollected.weight.toFixed(2)}</td>
                                <td>-</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    ${deliveries.length > 0 ? `
                        <!-- Delivery Section -->
                        <div class="section-title">🏭 تفاصيل التسليم للمحارق</div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 8%">م</th>
                                    <th style="width: 40%">اسم المحرقة</th>
                                    <th style="width: 17%">عدد الأكياس</th>
                                    <th style="width: 17%">الوزن (كجم)</th>
                                    <th style="width: 18%">ساعة التسليم</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${deliveryRows}
                                <tr class="totals-row">
                                    <td colspan="2">الإجمالي المسلم</td>
                                    <td>${totalDelivered.bags}</td>
                                    <td>${totalDelivered.weight.toFixed(2)}</td>
                                    <td>-</td>
                                </tr>
                            </tbody>
                        </table>
                    ` : ''}
                    
                    <!-- Summary -->
                    <div class="summary-boxes">
                        <div class="summary-box collected">
                            <div class="summary-label">إجمالي المجمع</div>
                            <div class="summary-value">${totalCollected.bags} كيس</div>
                            <div class="summary-value">${totalCollected.weight.toFixed(2)} كجم</div>
                        </div>
                        <div class="summary-box delivered">
                            <div class="summary-label">إجمالي المسلم</div>
                            <div class="summary-value">${totalDelivered.bags} كيس</div>
                            <div class="summary-value">${totalDelivered.weight.toFixed(2)} كجم</div>
                        </div>
                        <div class="summary-box remaining">
                            <div class="summary-label">متبقي في السيارة</div>
                            <div class="summary-value">${remaining.bags} كيس</div>
                            <div class="summary-value">${remaining.weight} كجم</div>
                        </div>
                    </div>
                    
                    <!-- Signatures -->
                    <div class="signatures">
                        <div class="signature-box">
                            <div class="signature-label">توقيع المندوب</div>
                            <div class="signature-line"></div>
                            <div class="signature-name">الاسم: _______________</div>
                            <div class="signature-name">التاريخ: _______________</div>
                        </div>
                        ${deliveries.length > 0 ? deliveries.map(d => `
                            <div class="signature-box">
                                <div class="signature-label">توقيع ${d.incinerators?.name || 'المحرقة'}</div>
                                <div class="signature-line"></div>
                                <div class="signature-name">الاسم: _______________</div>
                                <div class="signature-name">التاريخ: _______________</div>
                            </div>
                        `).slice(0, 2).join('') : `
                            <div class="signature-box">
                                <div class="signature-label">توقيع المحرقة</div>
                                <div class="signature-line"></div>
                                <div class="signature-name">الاسم: _______________</div>
                                <div class="signature-name">التاريخ: _______________</div>
                            </div>
                        `}
                    </div>
                    
                    <!-- Footer -->
                    <div class="footer">
                        <p>جميع البيانات إعادة أيضاً من أيصالات الاستلام القياسية المسجلة خلال اليوم.</p>
                        <p>أقر بأن البيانات المدونة أعلاه تم تسجيلها أيضاً بصحتها الاستلام بإيصالات الصحة والبيئة.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    };

    // لا نعرض الزر إذا لم يكن هناك تجميع
    if (!stops || stops.length === 0 || !stops.some(s => s.collection_details)) {
        return null;
    }

    return (
        <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
            <Printer className="w-5 h-5" />
            <span>طباعة الإيصال المجمع</span>
        </button>
    );
};

export default PrintCompleteReceipt;
