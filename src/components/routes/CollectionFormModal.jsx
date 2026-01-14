import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { X, FileText, Loader2, PenTool, RotateCcw, Printer } from 'lucide-react';

const CollectionFormModal = ({ isOpen, onClose, stop, routeId, route, currentLocation, onSuccess }) => {
    // Form data
    const [formData, setFormData] = useState({
        wasteTypes: {
            hazardous: false
        },
        bagsCount: '',
        totalWeight: '',
        safetyBoxCount: '',
        safetyBoxWeight: '',
        notes: ''
    });

    // Signatures
    const representativeCanvasRef = useRef(null);
    const clientCanvasRef = useRef(null);
    const [isDrawingRep, setIsDrawingRep] = useState(false);
    const [isDrawingClient, setIsDrawingClient] = useState(false);
    const [hasRepSignature, setHasRepSignature] = useState(false);
    const [hasClientSignature, setHasClientSignature] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        if (isOpen) {
            initCanvas(representativeCanvasRef);
            initCanvas(clientCanvasRef);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const initCanvas = (canvasRef) => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
    };

    const startDrawing = (e, canvasRef, setIsDrawing, setHasSignature) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
        const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        setHasSignature(true);
    };

    const draw = (e, canvasRef, isDrawing) => {
        if (!isDrawing) return;
        if (e.type === 'mousemove') e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
        const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const clearSignature = (canvasRef, setHasSignature) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.bagsCount || parseInt(formData.bagsCount) <= 0) {
            alert('الرجاء إدخال عدد الأكياس');
            return;
        }
        if (!formData.totalWeight || parseFloat(formData.totalWeight) <= 0) {
            alert('الرجاء إدخال الوزن الإجمالي');
            return;
        }
        if (!Object.values(formData.wasteTypes).some(v => v)) {
            alert('الرجاء اختيار نوع النفايات');
            return;
        }
        
        // استخدام موقع افتراضي لو مش متاح
        if (!currentLocation) {
            console.warn('Location not available, using default');
        }
        const locationData = currentLocation || { lat: 0, lng: 0, accuracy: 0 };

        try {
            setIsSaving(true);
            const now = new Date().toISOString();

            // Get signatures as base64 (only if they exist)
            const repSignature = hasRepSignature ? representativeCanvasRef.current.toDataURL('image/png') : null;
            const clientSignature = hasClientSignature ? clientCanvasRef.current.toDataURL('image/png') : null;

            // Save collection data
            const collectionData = {
                waste_types: formData.wasteTypes,
                bags_count: parseInt(formData.bagsCount),
                total_weight: parseFloat(formData.totalWeight),
                safety_box_count: formData.safetyBoxCount ? parseInt(formData.safetyBoxCount) : 0,
                safety_box_weight: formData.safetyBoxWeight ? parseFloat(formData.safetyBoxWeight) : 0,
                notes: formData.notes,
                representative_signature: repSignature,
                client_signature: clientSignature,
                collection_time: now,
                collection_location: locationData
            };

            // حساب الوزن الكلي (وزن الأكياس + وزن السيفتي بوكس)
            const grandTotalWeight = parseFloat(formData.totalWeight) + (formData.safetyBoxWeight ? parseFloat(formData.safetyBoxWeight) : 0);

            // Update route stop
            const { error: updateError } = await supabase
                .from('route_stops')
                .update({
                    weight_collected: grandTotalWeight,
                    hospital_signature: clientSignature ? { url: clientSignature } : null,
                    collection_details: collectionData,
                    weight_entry_time: now,
                    signature_time: clientSignature ? now : null,
                    weight_entry_location: locationData,
                    signature_location: clientSignature ? locationData : null
                })
                .eq('id', stop.id);

            if (updateError) throw updateError;

            // Log event
            await supabase.from('route_tracking_logs').insert({
                route_id: routeId,
                route_stop_id: stop.id,
                event_type: 'collection_completed',
                event_time: now,
                location: locationData,
                data: collectionData
            });

            // تحديث route_stop وإنشاء رقم الإيصال تلقائياً من الـ database
            // الـ trigger هيولد receipt_number تلقائياً
            
            // جلب رقم الإيصال المُولد
            const { data: updatedStop, error: fetchError } = await supabase
                .from('route_stops')
                .select('receipt_number')
                .eq('id', stop.id)
                .single();

            if (fetchError) {
                console.error('Error fetching receipt number:', fetchError);
            }

            const receiptNumber = updatedStop?.receipt_number || `R${Date.now().toString().slice(-4)}`;

            // Store receipt data for printing
            const receiptData = {
                route,
                stop,
                collectionData,
                receiptNumber,
                arrivalTime: stop.arrival_time // وقت الدخول للمحطة
            };
            sessionStorage.setItem('printReceipt', JSON.stringify(receiptData));

            // Update UI state first
            setIsSaved(true);
            setIsSaving(false);
            
            // Show success message
            alert('تم حفظ البيانات بنجاح! يمكنك الآن طباعة الإيصال');
            
            // Reload data immediately after save
            if (onSuccess) {
                onSuccess();
            }

        } catch (error) {
            console.error('Error:', error);
            alert('حدث خطأ في حفظ البيانات');
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        if (!isSaved) {
            alert('يجب حفظ البيانات أولاً');
            return;
        }

        setIsPrinting(true);
        
        // Open print window
        const printWindow = window.open('/print-receipt', '_blank');
        if (!printWindow) {
            alert('الرجاء السماح بفتح النوافذ المنبثقة للطباعة');
        }

        setTimeout(() => {
            setIsPrinting(false);
            // Close modal after printing
            onClose();
        }, 500);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full my-8 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-brand-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">تفاصيل الاستلام</h2>
                            <p className="text-sm text-gray-600">{stop?.hospitals?.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Waste Types */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">نوع النفايات</label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.wasteTypes.hazardous}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        wasteTypes: { ...formData.wasteTypes, hazardous: e.target.checked }
                                    })}
                                    className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                                />
                                <span className="text-gray-900">نفايات خطرة</span>
                            </label>
                        </div>
                    </div>

                    {/* Bags Count & Weight */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">عدد الأكياس</label>
                            <input
                                type="number"
                                value={formData.bagsCount}
                                onChange={(e) => setFormData({ ...formData, bagsCount: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="0"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">الوزن الإجمالي (كجم)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.totalWeight}
                                onChange={(e) => setFormData({ ...formData, totalWeight: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>

                    {/* Safety Box Section */}
                    <div className="border-2 border-amber-200 bg-amber-50 rounded-lg p-4">
                        <label className="block text-sm font-bold text-amber-800 mb-3">📦 سيفتي بوكس Safety Box</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">عدد الصناديق</label>
                                <input
                                    type="number"
                                    value={formData.safetyBoxCount}
                                    onChange={(e) => setFormData({ ...formData, safetyBoxCount: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">وزن الصناديق (كجم)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.safetyBoxWeight}
                                    onChange={(e) => setFormData({ ...formData, safetyBoxWeight: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            rows="3"
                            placeholder="أي ملاحظات إضافية..."
                        />
                    </div>

                    {/* Electronic Signatures (Optional) */}
                    <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-center gap-2 mb-3">
                            <PenTool className="w-5 h-5 text-gray-600" />
                            <h3 className="text-sm font-semibold text-gray-900">التوقيع الإلكتروني (اختياري)</h3>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">
                            يمكنك استخدام التوقيع الإلكتروني هنا، أو ترك المكان فارغاً للتوقيع اليدوي على الإيصال المطبوع
                        </p>

                        {/* Representative Signature */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">توقيع المندوب (اختياري)</label>
                                <button
                                    type="button"
                                    onClick={() => clearSignature(representativeCanvasRef, setHasRepSignature)}
                                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    مسح
                                </button>
                            </div>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 relative">
                                <canvas
                                    ref={representativeCanvasRef}
                                    onMouseDown={(e) => startDrawing(e, representativeCanvasRef, setIsDrawingRep, setHasRepSignature)}
                                    onMouseMove={(e) => draw(e, representativeCanvasRef, isDrawingRep)}
                                    onMouseUp={() => setIsDrawingRep(false)}
                                    onMouseLeave={() => setIsDrawingRep(false)}
                                    onTouchStart={(e) => startDrawing(e, representativeCanvasRef, setIsDrawingRep, setHasRepSignature)}
                                    onTouchMove={(e) => draw(e, representativeCanvasRef, isDrawingRep)}
                                    onTouchEnd={() => setIsDrawingRep(false)}
                                    style={{ touchAction: 'none' }}
                                    className="w-full h-32 cursor-crosshair"
                                />
                                <div className="absolute bottom-2 left-2 text-xs text-gray-400 pointer-events-none">
                                    {hasRepSignature ? 'تم التوقيع' : 'وقع هنا أو اتركه فارغاً'}
                                </div>
                            </div>
                        </div>

                        {/* Client Signature */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">توقيع العميل (اختياري)</label>
                                <button
                                    type="button"
                                    onClick={() => clearSignature(clientCanvasRef, setHasClientSignature)}
                                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    مسح
                                </button>
                            </div>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 relative">
                                <canvas
                                    ref={clientCanvasRef}
                                    onMouseDown={(e) => startDrawing(e, clientCanvasRef, setIsDrawingClient, setHasClientSignature)}
                                    onMouseMove={(e) => draw(e, clientCanvasRef, isDrawingClient)}
                                    onMouseUp={() => setIsDrawingClient(false)}
                                    onMouseLeave={() => setIsDrawingClient(false)}
                                    onTouchStart={(e) => startDrawing(e, clientCanvasRef, setIsDrawingClient, setHasClientSignature)}
                                    onTouchMove={(e) => draw(e, clientCanvasRef, isDrawingClient)}
                                    onTouchEnd={() => setIsDrawingClient(false)}
                                    style={{ touchAction: 'none' }}
                                    className="w-full h-32 cursor-crosshair"
                                />
                                <div className="absolute bottom-2 left-2 text-xs text-gray-400 pointer-events-none">
                                    {hasClientSignature ? 'تم التوقيع' : 'وقع هنا أو اتركه فارغاً'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            {isSaved ? 'إغلاق' : 'إلغاء'}
                        </button>
                        
                        {!isSaved ? (
                            <button
                                type="submit"
                                onClick={handleSubmit}
                                disabled={isSaving || !currentLocation}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>جاري الحفظ...</span>
                                    </>
                                ) : (
                                    <>
                                        <FileText className="w-5 h-5" />
                                        <span>حفظ البيانات</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handlePrint}
                                disabled={isPrinting}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                {isPrinting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>جاري الطباعة...</span>
                                    </>
                                ) : (
                                    <>
                                        <Printer className="w-5 h-5" />
                                        <span>طباعة الإيصال</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};

export default CollectionFormModal;
