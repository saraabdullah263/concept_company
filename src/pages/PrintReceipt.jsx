import { useEffect, useState } from 'react';
import { getCachedLogoBase64 } from '../utils/logoBase64';

const PrintReceipt = () => {
    const [receiptData, setReceiptData] = useState(null);
    const [logoUrl, setLogoUrl] = useState('/logo.png');

    useEffect(() => {
        getCachedLogoBase64().then(setLogoUrl);
        
        const data = sessionStorage.getItem('printReceipt');
        if (data) {
            setReceiptData(JSON.parse(data));
            
            // حل محسّن للطباعة على الموبايل
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            setTimeout(() => {
                try {
                    window.print();
                } catch (e) {
                    console.error('Print error:', e);
                    if (isMobile) {
                        alert('حدث خطأ في الطباعة. يرجى المحاولة مرة أخرى أو استخدام زر الطباعة في الصفحة.');
                    }
                }
            }, isMobile ? 1000 : 500);
        } else {
            alert('لا توجد بيانات للطباعة');
            window.close();
        }
    }, []);

    if (!receiptData) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <p>جاري التحميل...</p>
            </div>
        );
    }

    const { route, stop, collectionData, receiptNumber, arrivalTime } = receiptData;
    const date = new Date(collectionData.collection_time);
    const arrivalDate = arrivalTime ? new Date(arrivalTime) : null;
    const totalWeight = ((collectionData.total_weight || 0) + (collectionData.safety_box_weight || 0)).toFixed(2);

    const renderReceipt = (copyLabel) => (
        <div className="receipt">
            <div className="copy-label">{copyLabel}</div>
            
            {/* Header */}
            <div className="header">
                <img src={logoUrl} alt="Logo" className="logo" />
                <div className="company">
                    <div className="company-en">Concept Eco Care</div>
                    <div className="company-ar">كونسبت للخدمات البيئية</div>
                </div>
            </div>

            {/* Title */}
            <div className="title">إيصال استلام نفايات طبية</div>

            {/* Info Row */}
            <div className="info-row">
                <span><b>الرقم:</b> {receiptNumber}</span>
                <span><b>التاريخ:</b> {date.toLocaleDateString('ar-EG')}</span>
            </div>

            {/* Client */}
            <div className="client-row">
                <b>الجهة:</b> {stop.hospitals?.name}
            </div>

            {/* Times */}
            <div className="times-row">
                <div className="time-box filled">
                    <span className="time-label">وقت الدخول</span>
                    <span className="time-value">
                        {arrivalDate ? arrivalDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '......'}
                    </span>
                </div>
                <div className="time-box empty">
                    <span className="time-label">وقت الخروج</span>
                    <span className="time-value">......</span>
                </div>
            </div>

            {/* Details Table */}
            <table className="details-table">
                <tbody>
                    <tr>
                        <td>
                            <div className="cell-label">عدد الأكياس</div>
                            <div className="cell-value">{collectionData.bags_count}</div>
                        </td>
                        <td>
                            <div className="cell-label">وزن الأكياس</div>
                            <div className="cell-value">{collectionData.total_weight} كجم</div>
                        </td>
                    </tr>
                    {(collectionData.safety_box_count > 0) && (
                        <tr className="safety-row">
                            <td>
                                <div className="cell-label">سيفتي بوكس</div>
                                <div className="cell-value">{collectionData.safety_box_count} صندوق</div>
                            </td>
                            <td>
                                <div className="cell-label">وزن الصناديق</div>
                                <div className="cell-value">{collectionData.safety_box_weight || 0} كجم</div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Total */}
            <div className="total-row">
                <span>الوزن الكلي:</span>
                <span className="total-value">{totalWeight} كجم</span>
            </div>

            {/* Rep Info */}
            <div className="rep-row">
                <span>المندوب: {route.representatives?.users?.full_name || '___'}</span>
                <span>السيارة: {route.vehicles?.plate_number || '___'}</span>
            </div>

            {/* Signatures */}
            <div className="signatures">
                <div className="sig-box">
                    <div className="sig-label">توقيع المندوب</div>
                    {collectionData.representative_signature ? (
                        <img src={collectionData.representative_signature} alt="توقيع المندوب" className="sig-img" />
                    ) : (
                        <div className="sig-area"></div>
                    )}
                </div>
                <div className="sig-box">
                    <div className="sig-label">توقيع العميل</div>
                    {collectionData.client_signature ? (
                        <img src={collectionData.client_signature} alt="توقيع العميل" className="sig-img" />
                    ) : (
                        <div className="sig-area"></div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <>
            <style>{`
                @page {
                    size: 100mm 150mm;
                    margin: 0;
                }
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
                }
                html, body {
                    direction: rtl;
                    text-align: right;
                }
                .print-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    padding: 10px;
                    justify-content: center;
                    background: #eee;
                }
                .receipt {
                    width: 100mm;
                    height: 150mm;
                    padding: 4mm;
                    border: 1px solid #000;
                    background: white;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    font-size: 10px;
                    page-break-after: always;
                    page-break-inside: avoid;
                }
                .copy-label {
                    position: absolute;
                    top: 2mm;
                    left: 2mm;
                    font-size: 8px;
                    background: #f0f0f0;
                    padding: 1px 4px;
                    border: 1px solid #999;
                    border-radius: 2px;
                }
                .header {
                    display: flex;
                    align-items: center;
                    gap: 3mm;
                    border-bottom: 1px solid #000;
                    padding-bottom: 2mm;
                    margin-bottom: 2mm;
                }
                .logo {
                    width: 12mm;
                    height: 12mm;
                }
                .company {
                    text-align: center;
                    flex: 1;
                }
                .company-en {
                    font-size: 12px;
                    font-weight: bold;
                    color: #0d4f8b;
                }
                .company-ar {
                    font-size: 9px;
                    color: #666;
                }
                .title {
                    text-align: center;
                    font-size: 12px;
                    font-weight: bold;
                    background: #e3f2fd;
                    padding: 2mm;
                    margin-bottom: 2mm;
                    border-radius: 2px;
                }
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 9px;
                    padding: 1mm 0;
                    border-bottom: 1px dashed #ccc;
                    margin-bottom: 1mm;
                }
                .client-row {
                    font-size: 10px;
                    padding: 1mm 0;
                    margin-bottom: 2mm;
                }
                .times-row {
                    display: flex;
                    gap: 2mm;
                    margin-bottom: 2mm;
                }
                .time-box {
                    flex: 1;
                    border: 1px solid #1976d2;
                    border-radius: 2px;
                    padding: 1.5mm;
                    text-align: center;
                }
                .time-box.filled {
                    background: #e3f2fd;
                }
                .time-box.empty {
                    background: #fff;
                }
                .time-label {
                    display: block;
                    font-size: 8px;
                    color: #666;
                }
                .time-value {
                    display: block;
                    font-size: 11px;
                    font-weight: bold;
                    color: #1565c0;
                }
                .details-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 2mm;
                }
                .details-table td {
                    border: 1px solid #ddd;
                    padding: 1.5mm;
                    text-align: center;
                    width: 50%;
                    background: #fafafa;
                }
                .safety-row td {
                    background: #fff8e1 !important;
                    border-color: #ffb74d !important;
                }
                .cell-label {
                    font-size: 8px;
                    color: #666;
                }
                .cell-value {
                    font-size: 12px;
                    font-weight: bold;
                    color: #333;
                }
                .total-row {
                    background: #1565c0;
                    color: white;
                    padding: 2mm;
                    border-radius: 2px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2mm;
                    font-size: 10px;
                }
                .total-value {
                    font-size: 14px;
                    font-weight: bold;
                }
                .rep-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 9px;
                    padding: 1mm 0;
                    border-top: 1px dashed #ccc;
                    border-bottom: 1px dashed #ccc;
                    margin-bottom: 2mm;
                }
                .signatures {
                    display: flex;
                    gap: 2mm;
                    flex: 1;
                }
                .sig-box {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                .sig-label {
                    font-size: 9px;
                    font-weight: bold;
                    text-align: center;
                    margin-bottom: 1mm;
                }
                .sig-area {
                    flex: 1;
                    border: 1px solid #333;
                    border-radius: 2px;
                    min-height: 18mm;
                }
                .sig-img {
                    flex: 1;
                    border: 1px solid #333;
                    border-radius: 2px;
                    min-height: 18mm;
                    max-height: 22mm;
                    width: 100%;
                    object-fit: contain;
                    background: white;
                }
                .no-print {
                    text-align: center;
                    padding: 15px;
                    background: #eee;
                }
                .no-print button {
                    padding: 10px 25px;
                    margin: 0 5px;
                    border: none;
                    border-radius: 5px;
                    font-size: 14px;
                    cursor: pointer;
                }
                .btn-print {
                    background: #0066cc;
                    color: white;
                }
                .btn-close {
                    background: #666;
                    color: white;
                }
                @media print {
                    .no-print { display: none !important; }
                    .print-container {
                        padding: 0;
                        background: white;
                    }
                    .receipt {
                        margin: 0;
                        border: none;
                    }
                }
            `}</style>

            <div className="print-container">
                {renderReceipt('نسخة العميل')}
                {renderReceipt('نسخة الشركة')}
            </div>

            <div className="no-print">
                <button className="btn-print" onClick={() => window.print()}>
                    🖨️ طباعة
                </button>
                <button className="btn-close" onClick={() => window.close()}>
                    إغلاق
                </button>
            </div>
        </>
    );
};

export default PrintReceipt;
