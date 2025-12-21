import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { X, PenTool, Loader2, RotateCcw } from 'lucide-react';

const SignatureModal = ({ isOpen, onClose, stopId, routeId, hospitalName, currentLocation, onSuccess }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        if (isOpen && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            
            // Set canvas size
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            
            // Set drawing style
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        setHasSignature(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        
        // Only preventDefault for mouse events, not touch
        if (e.type === 'mousemove') {
            e.preventDefault();
        }
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const saveSignature = async () => {
        if (!hasSignature) {
            alert('الرجاء التوقيع أولاً');
            return;
        }

        if (!currentLocation) {
            alert('الرجاء تفعيل خدمة الموقع');
            return;
        }

        try {
            setIsSaving(true);
            const now = new Date().toISOString();

            // Convert canvas to base64
            const canvas = canvasRef.current;
            const base64Signature = canvas.toDataURL('image/png');

            let signatureUrl = base64Signature;

            // Try to upload to Storage (optional)
            try {
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                const fileName = `${stopId}_signature_${Date.now()}.png`;
                const filePath = `signatures/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('medical-waste')
                    .upload(filePath, blob, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (!uploadError) {
                    // Get public URL if upload succeeded
                    const { data: { publicUrl } } = supabase.storage
                        .from('medical-waste')
                        .getPublicUrl(filePath);
                    signatureUrl = publicUrl;
                } else {
                    console.warn('Storage upload failed, using base64:', uploadError);
                }
            } catch (storageError) {
                console.warn('Storage error, using base64:', storageError);
            }

            // Update route stop
            const { error: updateError } = await supabase
                .from('route_stops')
                .update({
                    hospital_signature: { url: signatureUrl },
                    signature_time: now,
                    signature_location: currentLocation
                })
                .eq('id', stopId);

            if (updateError) throw updateError;

            // Log event
            await supabase.from('route_tracking_logs').insert({
                route_id: routeId,
                route_stop_id: stopId,
                event_type: 'signature_taken',
                event_time: now,
                location: currentLocation,
                data: { signature_url: signatureUrl }
            });

            onSuccess();
            onClose();

        } catch (error) {
            console.error('Error:', error);
            alert(`حدث خطأ في حفظ التوقيع: ${error.message || 'خطأ غير معروف'}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                            <PenTool className="w-5 h-5 text-brand-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">التوقيع الإلكتروني</h2>
                            <p className="text-sm text-gray-600">{hospitalName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Canvas */}
                <div className="p-6 space-y-4">
                    <div className="border-2 border-gray-300 rounded-lg bg-white relative">
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            style={{ touchAction: 'none' }}
                            className="w-full h-64 cursor-crosshair"
                        />
                        <div className="absolute bottom-2 left-2 text-xs text-gray-400 pointer-events-none">
                            وقع هنا
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <button
                            onClick={clearSignature}
                            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span>مسح</span>
                        </button>

                        <p className="text-xs text-gray-500">
                            استخدم الماوس أو الإصبع للتوقيع
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={saveSignature}
                            disabled={!hasSignature || isSaving || !currentLocation}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>جاري الحفظ...</span>
                                </>
                            ) : (
                                <span>حفظ التوقيع</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignatureModal;
