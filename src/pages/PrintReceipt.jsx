import { useEffect, useState } from 'react';
import { getCachedLogoBase64 } from '../utils/logoBase64';

const PrintReceipt = () => {
    const [receiptData, setReceiptData] = useState(null);
    const [logoUrl, setLogoUrl] = useState('/logo.png');

    useEffect(() => {
        // Get logo as base64
        getCachedLogoBase64().then(setLogoUrl);
        
        // Get data from sessionStorage
        const data = sessionStorage.getItem('printReceipt');
        if (data) {
            setReceiptData(JSON.parse(data));
            // Auto print after a short delay
            setTimeout(() => {
                window.print();
            }, 500);
        } else {
            alert('لا توجد بيانات للطباعة');
            window.close();
        }
    }, []);

    if (!receiptData) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p>جاري التحميل...</p>
            </div>
        );
    }

    const { route, stop, collectionData, receiptNumber } = receiptData;
    const date = new Date(collectionData.collection_time);
    
    // Generate short receipt number (last 6 chars + timestamp)
    const shortReceiptNumber = `${receiptNumber.slice(-6).toUpperCase()}-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;

    const renderReceiptContent = (copyLabel) => (
        <div className="receipt-border" style={{ position: 'relative' }}>
            <div className="copy-label">{copyLabel}</div>
            
            {/* Header */}
            <div className="receipt-header">
                <div className="logo-section">
                    <img src={logoUrl} alt="Concept Eco Care" className="logo-img" />
                    <div>
                        <div className="company-name">Concept Eco Care</div>
                        <div className="company-name-ar">كونسبت للخدمات البيئية</div>
                    </div>
                </div>
                <div style={{ textAlign: 'left' }}>
                    <div className="qr-code">
                        <span>Scan to Track</span>
                    </div>
                </div>
            </div>

            {/* Title */}
            <div className="receipt-title">
                إيصال استلام نفايات طبية
                <div className="receipt-title-en">Medical Waste Collection Receipt</div>
            </div>

            {/* Receipt Info */}
            <div className="info-row">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="info-label">الرقم:</span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{shortReceiptNumber}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="info-label">التاريخ:</span>
                    <span>{date.toLocaleDateString('ar-EG')} {date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>

            {/* Hospital Info */}
            <div className="section-title">📍 بيانات الجهة</div>
            <div className="section-content">
                <div className="info-row" style={{ justifyContent: 'flex-start', gap: '8px', borderBottom: 'none', marginBottom: '1mm' }}>
                    <span className="info-label">اسم الجهة:</span>
                    <span>{stop.hospitals?.name}</span>
                </div>
                <div className="info-row" style={{ justifyContent: 'flex-start', gap: '8px', borderBottom: 'none' }}>
                    <span className="info-label">العنوان:</span>
                    <span>{stop.hospitals?.address}</span>
                </div>
            </div>

            {/* Collection Details */}
            <div className="section-title">📦 تفاصيل الاستلام</div>
            <div className="section-content">
                <div className="info-row" style={{ justifyContent: 'flex-start', gap: '8px', borderBottom: 'none', marginBottom: '1mm' }}>
                    <span className="info-label">نوع النفايات:</span>
                    <div className="checkbox-group">
                        <div className="checkbox-item">
                            <span className={`checkbox ${collectionData.waste_types?.hazardous ? 'checked' : ''}`}></span>
                            <span>نفايات خطرة</span>
                        </div>
                    </div>
                </div>
                <div className="info-row" style={{ justifyContent: 'flex-start', gap: '8px', borderBottom: 'none', marginBottom: '1mm' }}>
                    <span className="info-label">عدد الأكياس:</span>
                    <span style={{ fontWeight: 'bold', color: '#1976d2' }}>{collectionData.bags_count}</span>
                </div>
                <div className="info-row" style={{ justifyContent: 'flex-start', gap: '8px', borderBottom: 'none', marginBottom: '1mm' }}>
                    <span className="info-label">الوزن الإجمالي:</span>
                    <span style={{ fontWeight: 'bold', color: '#1976d2' }}>{collectionData.total_weight} كجم</span>
                </div>
                {(collectionData.safety_box_bags > 0 || collectionData.safety_box_count > 0) && (
                    <div className="info-row" style={{ justifyContent: 'flex-start', gap: '8px', borderBottom: 'none', marginBottom: '1mm', background: '#fff8e1', padding: '4px 8px', borderRadius: '4px' }}>
                        <span className="info-label">📦 صناديق الأمانة:</span>
                        <span style={{ fontWeight: 'bold', color: '#f57c00' }}>
                            {collectionData.safety_box_bags || 0} كيس - {collectionData.safety_box_count || 0} صندوق
                        </span>
                    </div>
                )}
                {collectionData.notes && (
                    <div className="info-row" style={{ justifyContent: 'flex-start', gap: '8px', borderBottom: 'none' }}>
                        <span className="info-label">ملاحظات:</span>
                        <span>{collectionData.notes}</span>
                    </div>
                )}
            </div>

            {/* Representative Info */}
            <div className="section-title">👤 بيانات المندوب</div>
            <div className="section-content">
                <div className="info-row" style={{ justifyContent: 'flex-start', gap: '8px', borderBottom: 'none', marginBottom: '1mm' }}>
                    <span className="info-label">اسم المندوب:</span>
                    <span>{route.representatives?.users?.full_name || 'غير محدد'}</span>
                </div>
                <div className="info-row" style={{ justifyContent: 'flex-start', gap: '8px', borderBottom: 'none' }}>
                    <span className="info-label">رقم السيارة:</span>
                    <span>{route.vehicles?.plate_number || 'غير محدد'}</span>
                </div>
            </div>

            {/* Signatures */}
            <div className="signature-section">
                <div className="signature-row">
                    <div className="signature-box">
                        <div className="signature-label">✍️ توقيع المندوب</div>
                        <div className="signature-content">
                            {collectionData.representative_signature && (
                                <div className="signature-image">
                                    <img src={collectionData.representative_signature} alt="توقيع المندوب" />
                                </div>
                            )}
                            <div className="manual-signature-area">
                                {collectionData.representative_signature ? 'التوقيع اليدوي:' : 'التوقيع:'}
                            </div>
                        </div>
                    </div>
                    <div className="signature-box">
                        <div className="signature-label">✍️ توقيع العميل</div>
                        <div className="signature-content">
                            {collectionData.client_signature && (
                                <div className="signature-image">
                                    <img src={collectionData.client_signature} alt="توقيع العميل" />
                                </div>
                            )}
                            <div className="manual-signature-area">
                                {collectionData.client_signature ? 'التوقيع اليدوي:' : 'التوقيع:'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="footer-note">
                تم الاستلام طبقاً لاشتراطات وزارة البيئة المصرية
            </div>
        </div>
    );

    return (
        <>
            <style>{`
                @media print {
                    html, body { 
                        margin: 0; 
                        padding: 0;
                        height: 100%;
                    }
                    .no-print { display: none !important; }
                    .print-container { 
                        width: 100%;
                        height: 100%;
                        margin: 0;
                        padding: 0;
                    }
                    .receipt-border {
                        margin: 0 !important;
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                    }
                }
                @media screen {
                    .print-container {
                        max-width: 800px;
                        margin: 20px auto;
                        background: white;
                    }
                }
                * {
                    direction: rtl;
                    text-align: right;
                }
                .receipt-border {
                    border: 2px solid #000;
                    padding: 10mm 12mm;
                    page-break-after: always;
                    page-break-inside: avoid;
                    margin: 0;
                    width: 100%;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    min-height: calc(297mm - 16mm);
                }
                .receipt-border:last-child {
                    page-break-after: auto;
                }
                .receipt-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #000;
                }
                .logo-section {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .logo-img {
                    width: 70px;
                    height: 70px;
                    object-fit: contain;
                }
                .company-name {
                    font-size: 18px;
                    font-weight: bold;
                    color: #333;
                }
                .company-name-ar {
                    font-size: 14px;
                    color: #666;
                }
                .receipt-title {
                    text-align: center;
                    font-size: 22px;
                    font-weight: bold;
                    margin: 8px 0;
                    padding: 10px;
                    background: #f5f5f5;
                    border-radius: 4px;
                }
                .receipt-title-en {
                    font-size: 14px;
                    color: #666;
                    margin-top: 4px;
                    text-align: center;
                }
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 6px 0;
                    border-bottom: 1px solid #ddd;
                    font-size: 14px;
                    align-items: center;
                }
                .info-label {
                    font-weight: bold;
                    color: #333;
                }
                .section-title {
                    font-size: 14px;
                    font-weight: bold;
                    margin: 5mm 0 3mm;
                    padding: 3mm;
                    background: #e3f2fd;
                    border-right: 4px solid #1976d2;
                    border-radius: 3px;
                }
                
                .section-content {
                    background: #fafafa;
                    padding: 3mm;
                    border-radius: 3px;
                    margin-bottom: 3mm;
                    border: 1px solid #e0e0e0;
                    flex-grow: 1;
                }
                .checkbox-group {
                    display: flex;
                    gap: 20px;
                    padding: 4px 0;
                    font-size: 13px;
                }
                .checkbox-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .checkbox {
                    width: 14px;
                    height: 14px;
                    border: 2px solid #333;
                    display: inline-block;
                    position: relative;
                    flex-shrink: 0;
                }
                .checkbox.checked::after {
                    content: '✓';
                    position: absolute;
                    top: -3px;
                    left: 1px;
                    font-size: 13px;
                    font-weight: bold;
                }
                .signature-section {
                    margin-top: auto;
                    padding-top: 5mm;
                    border-top: 1px solid #ddd;
                }
                .signature-row {
                    display: flex;
                    justify-content: space-between;
                    gap: 20px;
                    margin-top: 8px;
                }
                .signature-box {
                    flex: 1;
                }
                .signature-label {
                    font-weight: bold;
                    margin-bottom: 3mm;
                    font-size: 13px;
                    color: #333;
                    text-align: center;
                }
                .signature-content {
                    border: 2px solid #333;
                    padding: 8px;
                    min-height: 80px;
                    background: white;
                    display: flex;
                    flex-direction: column;
                }
                .signature-image {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 35px;
                    border-bottom: 1px dashed #ccc;
                    padding-bottom: 5px;
                    margin-bottom: 5px;
                }
                .signature-image img {
                    max-width: 100%;
                    height: auto;
                    max-height: 30px;
                }
                .manual-signature-area {
                    flex: 1;
                    min-height: 35px;
                    text-align: right;
                    padding-right: 8px;
                    font-size: 11px;
                    color: #666;
                    display: flex;
                    align-items: flex-end;
                    padding-bottom: 5px;
                }
                .footer-note {
                    margin-top: 8px;
                    padding: 8px;
                    background: #f9f9f9;
                    border: 1px solid #ddd;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                }
                .qr-code {
                    width: 60px;
                    height: 60px;
                    border: 1px solid #ddd;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 8px;
                    color: #999;
                }
                .copy-label {
                    position: absolute;
                    top: 8px;
                    left: 8px;
                    background: #f0f0f0;
                    border: 2px solid #333;
                    padding: 5px 15px;
                    font-size: 12px;
                    font-weight: bold;
                    color: #333;
                    border-radius: 4px;
                }
                @page {
                    size: A4;
                    margin: 8mm;
                }
            `}</style>

            <div className="print-container">
                {/* Copy 1 - Client */}
                {renderReceiptContent('نسخة العميل')}
                
                {/* Copy 2 - Company */}
                {renderReceiptContent('نسخة الشركة')}
            </div>

            {/* Print Button (only visible on screen) */}
            <div className="no-print" style={{ textAlign: 'center', margin: '20px' }}>
                <button
                    onClick={() => window.print()}
                    style={{
                        padding: '12px 24px',
                        background: '#0066cc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        cursor: 'pointer',
                        marginLeft: '10px'
                    }}
                >
                    طباعة
                </button>
                <button
                    onClick={() => window.close()}
                    style={{
                        padding: '12px 24px',
                        background: '#666',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        cursor: 'pointer'
                    }}
                >
                    إغلاق
                </button>
            </div>
        </>
    );
};

export default PrintReceipt;
