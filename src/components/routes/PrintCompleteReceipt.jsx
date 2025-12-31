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
            weight: stops.reduce((sum, stop) => sum + (parseFloat(stop.collection_details?.total_weight) || 0), 0),
            safetyBoxCount: stops.reduce((sum, stop) => sum + (stop.collection_details?.safety_box_count || 0), 0),
            safetyBoxWeight: stops.reduce((sum, stop) => sum + (parseFloat(stop.collection_details?.safety_box_weight) || 0), 0)
        };

        // الوزن الكلي = وزن الأكياس + وزن السيفتي بوكس
        const grandTotalWeight = totalCollected.weight + totalCollected.safetyBoxWeight;

        const totalDelivered = {
            bags: deliveries.reduce((sum, d) => sum + parseInt(d.bags_count || 0), 0),
            weight: deliveries.reduce((sum, d) => sum + parseFloat(d.weight_delivered || 0), 0),
            // الوزن الكلي المسلم يشمل السيفتي بوكس
            totalWeight: deliveries.reduce((sum, d) => sum + parseFloat(d.weight_delivered || 0), 0) + totalCollected.safetyBoxWeight
        };

        const remaining = {
            bags: totalCollected.bags - totalDelivered.bags,
            weight: (grandTotalWeight - totalDelivered.totalWeight).toFixed(2)
        };

        // جدول التجميع
        const collectionRows = stops.map((stop, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${stop.hospitals?.name || 'غير محدد'}</td>
                <td>${stop.collection_details?.bags_count || 0}</td>
                <td>${stop.collection_details?.total_weight || 0}</td>
                <td>${stop.collection_details?.safety_box_count || 0} صندوق (${stop.collection_details?.safety_box_weight || 0} كجم)</td>
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
                    @page {
                        size: A4;
                        margin: 6mm;
                    }
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Segoe UI', Tahoma, sans-serif;
                        direction: rtl;
                        font-size: 11pt;
                        line-height: 1.4;
                    }
                    .receipt {
                        width: 100%;
                        max-width: 195mm;
                        margin: 0 auto;
                        padding: 4mm;
                        border: 2px solid #000;
                        height: calc(297mm - 12mm);
                        display: flex;
                        flex-direction: column;
                    }
                    .main-content {
                        flex: 0 0 auto;
                    }
                    .bottom-section {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        justify-content: flex-end;
                    }
                    .header {
                        display: flex;
                        align-items: center;
                        border-bottom: 2px solid #000;
                        padding-bottom: 3mm;
                        margin-bottom: 3mm;
                    }
                    .header img {
                        height: 55px;
                    }
                    .header-text {
                        flex: 1;
                        text-align: center;
                    }
                    .header h1 {
                        font-size: 18pt;
                        color: #0066cc;
                        margin-bottom: 1mm;
                    }
                    .header h2 {
                        font-size: 12pt;
                        color: #333;
                    }
                    .info-section {
                        display: flex;
                        justify-content: space-between;
                        flex-wrap: wrap;
                        gap: 2mm;
                        margin-bottom: 3mm;
                        padding: 3mm;
                        background: #f5f5f5;
                        border-radius: 2mm;
                        font-size: 11pt;
                    }
                    .info-item {
                        display: inline;
                    }
                    .info-label {
                        font-weight: bold;
                    }
                    .section-title {
                        font-size: 12pt;
                        font-weight: bold;
                        background: #0066cc;
                        color: white;
                        padding: 2mm 4mm;
                        margin: 3mm 0 2mm 0;
                        border-radius: 2mm;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 3mm;
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
                        display: flex;
                        gap: 3mm;
                        margin: 4mm 0;
                    }
                    .summary-box {
                        flex: 1;
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
                        margin-bottom: 1mm;
                    }
                    .summary-value {
                        font-size: 12pt;
                        font-weight: bold;
                    }
                    .signatures {
                        display: flex;
                        gap: 4mm;
                        margin-top: 5mm;
                        padding-top: 3mm;
                        border-top: 2px solid #333;
                    }
                    .signature-box {
                        flex: 1;
                        text-align: center;
                    }
                    .signature-label {
                        font-weight: bold;
                        font-size: 12pt;
                        margin-bottom: 2mm;
                    }
                    .signature-line {
                        height: 18mm;
                        border-bottom: 1px solid #333;
                        margin: 2mm 0;
                    }
                    .signature-name {
                        font-size: 10pt;
                        color: #666;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 4mm;
                        padding-top: 3mm;
                        border-top: 1px solid #ccc;
                        font-size: 10pt;
                        color: #666;
                    }
                    @media print {
                        body { padding: 0; }
                        .receipt { border: 2px solid #000; }
                    }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <div class="main-content">
                    <!-- Header -->
                    <div class="header">
                        <div class="header-text">
                            <h1>Concept Eco Care</h1>
                            <h2>إيصال مجمع تسليم نفايات طبية خطرة للمحرقة</h2>
                        </div>
                        <img src="${logoUrl}" alt="Logo" />
                    </div>
                    
                    <!-- Route Info -->
                    <div class="info-section">
                        <div class="info-item"><span class="info-label">رقم الإيصال:</span> ${route.id.slice(0, 8).toUpperCase()}</div>
                        <div class="info-item"><span class="info-label">التاريخ:</span> ${routeDate}</div>
                        <div class="info-item"><span class="info-label">المندوب:</span> ${route.representatives?.users?.full_name || 'غير محدد'}</div>
                        <div class="info-item"><span class="info-label">السيارة:</span> ${route.vehicles?.plate_number || 'غير محدد'}</div>
                    </div>
                    
                    <!-- Collection Section -->
                    <div class="section-title">📋 تفاصيل التجميع من العملاء</div>
                    <table>
                        <thead>
                            <tr>
                                <th>م</th>
                                <th>اسم المنشأة</th>
                                <th>الأكياس</th>
                                <th>الوزن</th>
                                <th>سيفتي بوكس</th>
                                <th>الوقت</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${collectionRows}
                            <tr class="totals-row">
                                <td colspan="2">الإجمالي</td>
                                <td>${totalCollected.bags}</td>
                                <td>${totalCollected.weight.toFixed(2)} كجم</td>
                                <td>${totalCollected.safetyBoxCount} (${totalCollected.safetyBoxWeight?.toFixed(2) || 0} كجم)</td>
                                <td>-</td>
                            </tr>
                            <tr class="totals-row" style="background: #e3f2fd;">
                                <td colspan="3"><strong>⚖️ الوزن الكلي</strong></td>
                                <td colspan="3"><strong>${(totalCollected.weight + (totalCollected.safetyBoxWeight || 0)).toFixed(2)} كجم</strong></td>
                            </tr>
                        </tbody>
                    </table>
                    
                    ${deliveries.length > 0 ? `
                        <div class="section-title">🏭 تفاصيل التسليم للمحارق</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>م</th>
                                    <th>المحرقة</th>
                                    <th>الأكياس</th>
                                    <th>الوزن</th>
                                    <th>الوقت</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${deliveryRows}
                                <tr class="totals-row">
                                    <td colspan="2">الإجمالي</td>
                                    <td>${totalDelivered.bags}</td>
                                    <td>${totalDelivered.weight.toFixed(2)} كجم</td>
                                    <td>-</td>
                                </tr>
                                ${totalCollected.safetyBoxCount > 0 ? `
                                <tr class="totals-row" style="background: #fff8e1;">
                                    <td colspan="2">📦 سيفتي بوكس</td>
                                    <td>${totalCollected.safetyBoxCount} صندوق</td>
                                    <td>${totalCollected.safetyBoxWeight?.toFixed(2) || 0} كجم</td>
                                    <td>-</td>
                                </tr>
                                ` : ''}
                                <tr class="totals-row" style="background: #e8f5e9;">
                                    <td colspan="2"><strong>⚖️ الوزن الكلي المسلم</strong></td>
                                    <td colspan="3"><strong>${totalDelivered.totalWeight.toFixed(2)} كجم</strong></td>
                                </tr>
                            </tbody>
                        </table>
                    ` : ''}
                    
                    <!-- Summary -->
                    <div class="summary-boxes">
                        <div class="summary-box collected">
                            <div class="summary-label">إجمالي المجمع</div>
                            <div class="summary-value">${totalCollected.bags} كيس (${totalCollected.weight.toFixed(2)} كجم)</div>
                            ${totalCollected.safetyBoxCount > 0 ? `<div style="font-size:8pt;color:#ff9800;">📦 ${totalCollected.safetyBoxCount} صندوق (${totalCollected.safetyBoxWeight?.toFixed(2)||0} كجم)</div>` : ''}
                            <div style="font-size:9pt;font-weight:bold;color:#1565c0;">⚖️ الكلي: ${grandTotalWeight.toFixed(2)} كجم</div>
                        </div>
                        <div class="summary-box delivered">
                            <div class="summary-label">إجمالي المسلم</div>
                            <div class="summary-value">${totalDelivered.bags} كيس (${totalDelivered.weight.toFixed(2)} كجم)</div>
                            ${totalCollected.safetyBoxCount > 0 ? `<div style="font-size:8pt;color:#ff9800;">📦 ${totalCollected.safetyBoxCount} صندوق (${totalCollected.safetyBoxWeight?.toFixed(2)||0} كجم)</div>` : ''}
                            <div style="font-size:9pt;font-weight:bold;color:#00cc66;">⚖️ الكلي: ${totalDelivered.totalWeight.toFixed(2)} كجم</div>
                        </div>
                        <div class="summary-box remaining">
                            <div class="summary-label">متبقي في السيارة</div>
                            <div class="summary-value">${remaining.bags} كيس</div>
                            <div class="summary-value">${remaining.weight} كجم</div>
                        </div>
                    </div>
                    </div>
                    
                    <div class="bottom-section">
                    <!-- Signatures -->
                    <div class="signatures">
                        <div class="signature-box">
                            <div class="signature-label">توقيع المندوب</div>
                            <div class="signature-line"></div>
                            <div class="signature-name">الاسم: _________ التاريخ: _________</div>
                        </div>
                        ${deliveries.length > 0 ? deliveries.slice(0, 2).map(d => `
                            <div class="signature-box">
                                <div class="signature-label">توقيع ${d.incinerators?.name || 'المحرقة'}</div>
                                <div class="signature-line"></div>
                                <div class="signature-name">الاسم: _________ التاريخ: _________</div>
                            </div>
                        `).join('') : `
                            <div class="signature-box">
                                <div class="signature-label">توقيع المحرقة</div>
                                <div class="signature-line"></div>
                                <div class="signature-name">الاسم: _________ التاريخ: _________</div>
                            </div>
                        `}
                    </div>
                    
                    <!-- Footer -->
                    <div class="footer">
                        أقر بأن البيانات المدونة أعلاه صحيحة ومطابقة لإيصالات الاستلام المسجلة.
                    </div>
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
