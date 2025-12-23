import { Printer } from 'lucide-react';
import { getCachedLogoBase64 } from '../../utils/logoBase64';

const PrintReceipts = ({ route, stops }) => {
    const handlePrint = async () => {
        const logoBase64 = await getCachedLogoBase64();
        const printWindow = window.open('', '_blank');
        const receiptsHTML = generateReceiptsHTML(route, stops, logoBase64);
        
        printWindow.document.write(receiptsHTML);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
        }, 300);
    };

    const generateReceiptsHTML = (route, stops, logoSrc) => {
        const logoUrl = logoSrc || `${window.location.origin}/logo.png`;
        const companyName = 'Concept Eco Care';
        const routeDate = new Date(route.route_date).toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const receiptsContent = stops.map((stop) => `
            <!-- نسخة المستشفى -->
            <div class="receipt-page">
                <div class="receipt">
                    <div class="receipt-header">
                        <img src="${logoUrl}" alt="Concept Eco Care" />
                        <div class="receipt-header-text">
                            <h1>${companyName}</h1>
                            <h2>وصل استلام مخلفات طبية</h2>
                        </div>
                    </div>
                    
                    <div class="receipt-body">
                        <div class="info-row">
                            <span class="label">المستشفى:</span>
                            <span class="value">${stop.hospitals?.name || 'غير محدد'}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">العنوان:</span>
                            <span class="value">${stop.hospitals?.address || '-'}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">التاريخ:</span>
                            <span class="value">${routeDate}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">رقم الرحلة:</span>
                            <span class="value">${route.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">المندوب:</span>
                            <span class="value">${route.representatives?.users?.full_name || 'غير محدد'}</span>
                        </div>
                        
                        <div class="weight-section">
                            <div class="weight-label">الوزن المجمع (كجم):</div>
                            <div class="weight-box">_________________</div>
                        </div>
                        
                        <div class="signatures">
                            <div class="signature-box">
                                <div class="signature-label">توقيع المندوب</div>
                                <div class="signature-line"></div>
                                <div class="signature-name">الاسم: _______________</div>
                            </div>
                            <div class="signature-box">
                                <div class="signature-label">توقيع المستشفى</div>
                                <div class="signature-line"></div>
                                <div class="signature-name">الاسم: _______________</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="receipt-footer">
                        <p>هذا الوصل يثبت استلام المخلفات الطبية المذكورة أعلاه</p>
                        <p class="copy-label">نسخة المستشفى</p>
                    </div>
                </div>
            </div>
            
            <!-- نسخة الشركة -->
            <div class="receipt-page">
                <div class="receipt">
                    <div class="receipt-header">
                        <img src="${logoUrl}" alt="Concept Eco Care" />
                        <div class="receipt-header-text">
                            <h1>${companyName}</h1>
                            <h2>وصل استلام مخلفات طبية</h2>
                        </div>
                    </div>
                    
                    <div class="receipt-body">
                        <div class="info-row">
                            <span class="label">المستشفى:</span>
                            <span class="value">${stop.hospitals?.name || 'غير محدد'}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">العنوان:</span>
                            <span class="value">${stop.hospitals?.address || '-'}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">التاريخ:</span>
                            <span class="value">${routeDate}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">رقم الرحلة:</span>
                            <span class="value">${route.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">المندوب:</span>
                            <span class="value">${route.representatives?.users?.full_name || 'غير محدد'}</span>
                        </div>
                        
                        <div class="weight-section">
                            <div class="weight-label">الوزن المجمع (كجم):</div>
                            <div class="weight-box">_________________</div>
                        </div>
                        
                        <div class="signatures">
                            <div class="signature-box">
                                <div class="signature-label">توقيع المندوب</div>
                                <div class="signature-line"></div>
                                <div class="signature-name">الاسم: _______________</div>
                            </div>
                            <div class="signature-box">
                                <div class="signature-label">توقيع المستشفى</div>
                                <div class="signature-line"></div>
                                <div class="signature-name">الاسم: _______________</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="receipt-footer">
                        <p>هذا الوصل يثبت استلام المخلفات الطبية المذكورة أعلاه</p>
                        <p class="copy-label">نسخة الشركة</p>
                    </div>
                </div>
            </div>
        `).join('');

        return `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>وصلات الرحلة</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        direction: rtl;
                    }
                    
                    .receipt-page {
                        padding: 10mm;
                        page-break-after: always;
                        page-break-inside: avoid;
                    }
                    
                    .receipt {
                        width: 100%;
                        padding: 8mm;
                        border: 2px solid #333;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .receipt-header {
                        display: flex;
                        align-items: center;
                        border-bottom: 2px solid #333;
                        padding-bottom: 3mm;
                        margin-bottom: 3mm;
                    }
                    
                    .receipt-header img {
                        height: 60px;
                        margin-right: auto;
                    }
                    
                    .receipt-header-text {
                        flex: 1;
                        text-align: center;
                    }
                    
                    .receipt-header h1 {
                        font-size: 16pt;
                        color: #1a56db;
                        margin-bottom: 2mm;
                    }
                    
                    .receipt-header h2 {
                        font-size: 13pt;
                    }
                    
                    .receipt-body {
                        flex: 1;
                    }
                    
                    .info-row {
                        display: flex;
                        padding: 1.5mm 0;
                        border-bottom: 1px solid #ddd;
                        font-size: 10pt;
                    }
                    
                    .info-row .label {
                        font-weight: bold;
                        width: 30mm;
                    }
                    
                    .info-row .value {
                        flex: 1;
                    }
                    
                    .weight-section {
                        margin: 3mm 0;
                        padding: 3mm;
                        background: #f8f9fa;
                        border: 2px dashed #333;
                        text-align: center;
                    }
                    
                    .weight-label {
                        font-size: 11pt;
                        font-weight: bold;
                        margin-bottom: 2mm;
                    }
                    
                    .weight-box {
                        font-size: 14pt;
                        padding: 2mm;
                        background: white;
                        border: 1px solid #333;
                    }
                    
                    .signatures {
                        display: flex;
                        gap: 3mm;
                        margin-top: 3mm;
                    }
                    
                    .signature-box {
                        flex: 1;
                        padding: 2mm;
                        border: 1px solid #333;
                    }
                    
                    .signature-label {
                        font-weight: bold;
                        font-size: 9pt;
                        text-align: center;
                        margin-bottom: 1mm;
                    }
                    
                    .signature-line {
                        height: 12mm;
                        border-bottom: 2px solid #333;
                        margin: 2mm 0;
                    }
                    
                    .signature-name {
                        font-size: 8pt;
                        color: #666;
                    }
                    
                    .receipt-footer {
                        border-top: 2px solid #333;
                        padding-top: 2mm;
                        text-align: center;
                        font-size: 8pt;
                        color: #666;
                    }
                    
                    .copy-label {
                        font-weight: bold;
                        color: #1a56db;
                        font-size: 9pt;
                        margin-top: 1mm;
                    }
                    
                    @media print {
                        body {
                            margin: 0;
                            padding: 0;
                        }
                        
                        .receipt-page {
                            margin: 0;
                            page-break-after: always;
                        }
                        
                        .cut-line {
                            page-break-inside: avoid;
                        }
                    }
                </style>
            </head>
            <body>
                ${receiptsContent}
            </body>
            </html>
        `;
    };

    return (
        <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
        >
            <Printer className="w-5 h-5" />
            <span>طباعة الوصلات</span>
        </button>
    );
};

export default PrintReceipts;
