import { useState, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { X, Camera, Upload, Loader2, Image as ImageIcon } from 'lucide-react';

const PhotoUploadModal = ({ isOpen, onClose, stopId, routeId, currentLocation, onSuccess }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                alert('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
                return;
            }

            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            alert('الرجاء اختيار صورة');
            return;
        }

        if (!currentLocation) {
            alert('الرجاء تفعيل خدمة الموقع');
            return;
        }

        try {
            setIsUploading(true);
            const now = new Date().toISOString();

            // Convert file to base64 as fallback (store in database instead of storage)
            const reader = new FileReader();
            const base64Promise = new Promise((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(selectedFile);
            });

            const base64Image = await base64Promise;

            // Try to upload to Storage first
            let photoUrl = null;
            try {
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `${stopId}_${Date.now()}.${fileExt}`;
                const filePath = `route-photos/${fileName}`;

                const { error: uploadError, data: uploadData } = await supabase.storage
                    .from('medical-waste')
                    .upload(filePath, selectedFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    console.warn('Storage upload failed, using base64:', uploadError);
                    // Use base64 as fallback
                    photoUrl = base64Image;
                } else {
                    // Get public URL
                    const { data: { publicUrl } } = supabase.storage
                        .from('medical-waste')
                        .getPublicUrl(filePath);
                    photoUrl = publicUrl;
                }
            } catch (storageError) {
                console.warn('Storage error, using base64:', storageError);
                photoUrl = base64Image;
            }

            // Update route stop
            const { error: updateError } = await supabase
                .from('route_stops')
                .update({
                    photo_proof: photoUrl,
                    photo_upload_time: now,
                    photo_upload_location: currentLocation
                })
                .eq('id', stopId);

            if (updateError) throw updateError;

            // Log event
            await supabase.from('route_tracking_logs').insert({
                route_id: routeId,
                route_stop_id: stopId,
                event_type: 'photo_uploaded',
                event_time: now,
                location: currentLocation,
                data: { photo_url: photoUrl }
            });

            onSuccess();
            onClose();
            setSelectedFile(null);
            setPreview(null);

        } catch (error) {
            console.error('Error:', error);
            alert(`حدث خطأ في رفع الصورة: ${error.message || 'خطأ غير معروف'}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                            <Camera className="w-5 h-5 text-brand-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">رفع صورة</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Preview */}
                    {preview ? (
                        <div className="relative">
                            <img
                                src={preview}
                                alt="Preview"
                                className="w-full h-64 object-cover rounded-lg"
                            />
                            <button
                                onClick={() => {
                                    setSelectedFile(null);
                                    setPreview(null);
                                }}
                                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition-colors"
                        >
                            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-sm text-gray-600 mb-2">
                                اضغط لاختيار صورة
                            </p>
                            <p className="text-xs text-gray-500">
                                الحد الأقصى: 5 ميجابايت
                            </p>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

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
                            onClick={handleUpload}
                            disabled={!selectedFile || isUploading || !currentLocation}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>جاري الرفع...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-5 h-5" />
                                    <span>رفع</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PhotoUploadModal;
