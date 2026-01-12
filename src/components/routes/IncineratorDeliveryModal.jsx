import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Camera, Edit3, Save, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '../../services/supabase';
import SignatureCanvas from 'react-signature-canvas';

const IncineratorDeliveryModal = ({ isOpen, onClose, route, onSuccess }) => {
    const [incinerators, setIncinerators] = useState([]);
    const [assignedIncinerator, setAssignedIncinerator] = useState(null);
    const [wantsToChange, setWantsToChange] = useState(false);
    const [changeReason, setChangeReason] = useState('');
    const [selectedIncineratorId, setSelectedIncineratorId] = useState('');
    
    const [delivery, setDelivery] = useState({
        bags_count: 0,
        weight_delivered: 0,
        safety_box_count: 0,
        safety_box_weight: 0,
        receiver_signature: null,
        photo_proof: null,
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [signingActive, setSigningActive] = useState(false);
    const [signaturePad, setSignaturePad] = useState(null);

    // حساب الكميات
    const totalCollected = {
        bags: route?.route_stops?.reduce((sum, stop) => 
            sum + (stop.collection_details?.bags_count || 0), 0) || 0,
        weight: route?.route_stops?.reduce((sum, stop) => 
            sum + (parseFloat(stop.collection_details?.total_weight) || 0), 0) || 0,
        safetyBoxCount: route?.route_stops?.reduce((sum, stop) => 
            sum + (stop.collection_details?.safety_box_count || 0), 0) || 0,
        safetyBoxWeight: route?.route_stops?.reduce((sum, stop) => 
            sum + (parseFloat(stop.collection_details?.safety_box_weight) || 0), 0) || 0
    };

    useEffect(() => {
        if (isOpen && route) {
            fetchIncinerators();
            fetchAssignedIncinerator();
            // Reset state
            setWantsToChange(false);
            setChangeReason('');
            setSelectedIncineratorId('');
            
            // ملء القيم تلقائياً من الكمية المجمعة
            const totalBags = route?.route_stops?.reduce((sum, stop) => 
                sum + (stop.collection_details?.bags_count || 0), 0) || 0;
            const totalWeight = route?.route_stops?.reduce((sum, stop) => 
                sum + (parseFloat(stop.collection_details?.total_weight) || 0), 0) || 0;
            const totalSafetyBoxCount = route?.route_stops?.reduce((sum, stop) => 
                sum + (stop.collection_details?.safety_box_count || 0), 0) || 0;
            const totalSafetyBoxWeight = route?.route_stops?.reduce((sum, stop) => 
                sum + (parseFloat(stop.collection_details?.safety_box_weight) || 0), 0) || 0;
            
            setDelivery({
                bags_count: totalBags,
                weight_delivered: totalWeight,
                safety_box_count: totalSafetyBoxCount,
                safety_box_weight: totalSafetyBoxWeight,
                receiver_signature: null,
                photo_proof: null,
                notes: ''
            });
        }
    }, [isOpen, route]);

    const fetchIncinerators = async () => {
        const { data, error } = await supabase
            .from('incinerators')
            .select('*')
            .eq('is_active', true)
            .order('name');
        
        if (!error && data) {
            setIncinerators(data);
        }
    };

    const fetchAssignedIncinerator = async () => {
        if (route?.incinerator_id) {
            const { data, error } = await supabase
                .from('incinerators')
                .select('*')
                .eq('id', route.incinerator_id)
                .single();
            
            if (!error && data) {
                setAssignedIncinerator(data);
            }
        }
    };

    const updateDelivery = (field, value) => {
        setDelivery(prev => ({ ...prev, [field]: value }));
    };

    const handlePhotoUpload = async (file) => {
        if (!file) return;

        try {
            // التحقق من حجم الملف (أقل من 5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                alert('حجم الصورة كبير جداً. يرجى اختيار صورة أصغر من 5 ميجابايت');
                return;
            }

            // ضغط الصورة قبل الرفع
            const compressedFile = await compressImage(file);
            
            const fileExt = file.name.split('.').pop().toLowerCase();
            const fileName = `${route.id}_incinerator_${Date.now()}.${fileExt}`;
            const filePath = `incinerator-receipts/${fileName}`;

            console.log('Uploading photo:', filePath);

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('medical-waste')
                .upload(filePath, compressedFile, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                throw uploadError;
            }

            console.log('Upload successful:', uploadData);

            const { data: { publicUrl } } = supabase.storage
                .from('medical-waste')
                .getPublicUrl(filePath);

            console.log('Public URL:', publicUrl);
            updateDelivery('photo_proof', publicUrl);
            alert('تم رفع الصورة بنجاح ✅');
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert(`فشل رفع الصورة: ${error.message || 'خطأ غير معروف'}`);
        }
    };

    // دالة ضغط الصورة
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // تصغير الصورة إذا كانت كبيرة
                    const maxDimension = 1920;
                    if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = (height / width) * maxDimension;
                            width = maxDimension;
                        } else {
                            width = (width / height) * maxDimension;
                            height = maxDimension;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const compressedFile = new File([blob], file.name, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now(),
                                });
                                resolve(compressedFile);
                            } else {
                                reject(new Error('فشل ضغط الصورة'));
                            }
                        },
                        'image/jpeg',
                        0.8 // جودة 80%
                    );
                };
                img.onerror = () => reject(new Error('فشل تحميل الصورة'));
            };
            reader.onerror = () => reject(new Error('فشل قراءة الملف'));
        });
    };

    const saveSignature = () => {
        if (signaturePad && !signaturePad.isEmpty()) {
            const signatureData = signaturePad.toDataURL();
            updateDelivery('receiver_signature', signatureData);
            setSigningActive(false);
        }
    };

    const clearSignature = () => {
        if (signaturePad) {
            signaturePad.clear();
        }
    };

    const getFinalIncineratorId = () => {
        if (wantsToChange && selectedIncineratorId) {
            return selectedIncineratorId;
        }
        return route?.incinerator_id;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const finalIncineratorId = getFinalIncineratorId();
        
        // التحقق من البيانات
        if (!finalIncineratorId) {
            alert('يرجى تحديد المحرقة');
            return;
        }

        if (delivery.bags_count <= 0 || delivery.weight_delivered <= 0) {
            alert('يرجى إدخال عدد الأكياس والوزن');
            return;
        }

        if (wantsToChange && !changeReason.trim()) {
            alert('يرجى كتابة سبب تغيير المحرقة');
            return;
        }

        setLoading(true);

        try {
            // بناء الملاحظات
            let notesText = delivery.notes || '';
            if (wantsToChange) {
                notesText = `سبب تغيير المحرقة: ${changeReason}\n${notesText}`;
            }
            if (delivery.safety_box_count > 0 || delivery.safety_box_weight > 0) {
                notesText += `\nسيفتي بوكس Safety Box: ${delivery.safety_box_count || 0} صندوق - ${delivery.safety_box_weight || 0} كجم`;
            }

            // حفظ التسليم
            // جلب سعر الكيلو من المحرقة المختارة
            const selectedIncinerator = incinerators.find(inc => inc.id === finalIncineratorId) || assignedIncinerator;
            const costPerKg = selectedIncinerator?.cost_per_kg || 0;
            const totalCost = parseFloat(delivery.weight_delivered) * costPerKg;

            const deliveryData = {
                route_id: route.id,
                incinerator_id: finalIncineratorId,
                bags_count: parseInt(delivery.bags_count),
                weight_delivered: parseFloat(delivery.weight_delivered),
                cost_per_kg: costPerKg,
                total_cost: totalCost,
                delivery_order: 1,
                notes: notesText.trim() || null,
                delivery_time: new Date().toISOString()
            };

            // إضافة التوقيع والصورة لو موجودين
            if (delivery.receiver_signature) {
                deliveryData.receiver_signature = delivery.receiver_signature;
            }
            if (delivery.photo_proof) {
                deliveryData.photo_proof = delivery.photo_proof;
            }

            console.log('Saving delivery:', deliveryData);

            const { data: insertedData, error: deliveryError } = await supabase
                .from('incinerator_deliveries')
                .insert([deliveryData])
                .select();

            if (deliveryError) {
                console.error('Delivery insert error:', deliveryError);
                alert('خطأ في حفظ التسليم: ' + deliveryError.message);
                return;
            }

            console.log('Delivery saved:', insertedData);

            // حساب الوزن الكلي (أكياس + سيفتي بوكس)
            const grandTotalWeight = totalCollected.weight + (totalCollected.safetyBoxWeight || 0);
            const deliveredTotalWeight = parseFloat(delivery.weight_delivered) + (totalCollected.safetyBoxWeight || 0);

            // حساب المتبقي
            const remainingBags = totalCollected.bags - parseInt(delivery.bags_count);
            const remainingWeight = grandTotalWeight - deliveredTotalWeight;

            // تحديث الرحلة
            const { error: routeError } = await supabase
                .from('routes')
                .update({
                    remaining_weight: remainingWeight,
                    remaining_bags: remainingBags,
                    total_weight_collected: grandTotalWeight,
                    status: 'completed',
                    end_time: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', route.id);

            if (routeError) {
                console.error('Route update error:', routeError);
                alert('تم حفظ التسليم لكن حدث خطأ في تحديث الرحلة');
            }

            alert('تم حفظ بيانات التسليم بنجاح ✅');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving delivery:', error);
            alert('حدث خطأ أثناء الحفظ');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">🏭 تسليم النفايات للمحرقة</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* ملخص الكميات المجمعة */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                        <h3 className="font-bold text-blue-900 mb-3">📦 الكمية المتاحة للتسليم:</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-blue-700">عدد الأكياس: </span>
                                <span className="font-bold text-blue-900">{totalCollected.bags}</span>
                            </div>
                            <div>
                                <span className="text-blue-700">وزن الأكياس: </span>
                                <span className="font-bold text-blue-900">{totalCollected.weight.toFixed(2)} كجم</span>
                            </div>
                        </div>
                        {/* سيفتي بوكس */}
                        {(totalCollected.safetyBoxCount > 0 || totalCollected.safetyBoxWeight > 0) && (
                            <div className="mt-3 pt-3 border-t border-blue-200">
                                <div className="flex items-center gap-2 text-amber-700 mb-2">
                                    <span className="font-bold">📦 سيفتي بوكس Safety Box:</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-amber-600">عدد الصناديق: </span>
                                        <span className="font-bold text-amber-800">{totalCollected.safetyBoxCount}</span>
                                    </div>
                                    <div>
                                        <span className="text-amber-600">الوزن: </span>
                                        <span className="font-bold text-amber-800">{totalCollected.safetyBoxWeight?.toFixed(2) || 0} كجم</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* الوزن الكلي */}
                        <div className="mt-3 pt-3 border-t border-blue-200 text-center">
                            <span className="text-blue-800 font-bold">⚖️ الوزن الكلي: </span>
                            <span className="font-bold text-blue-900 text-lg">
                                {(totalCollected.weight + (totalCollected.safetyBoxWeight || 0)).toFixed(2)} كجم
                            </span>
                        </div>
                    </div>

                    {/* المحرقة المحددة */}
                    <div className="border-2 border-gray-200 rounded-lg p-4 space-y-4">
                        <h4 className="font-bold text-gray-900">🏭 المحرقة المحددة</h4>
                        
                        {assignedIncinerator ? (
                            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-lg font-bold text-green-800">{assignedIncinerator.name}</p>
                                        {assignedIncinerator.location && (
                                            <p className="text-sm text-green-600 mt-1">{assignedIncinerator.location}</p>
                                        )}
                                    </div>
                                    {!wantsToChange && (
                                        <button
                                            type="button"
                                            onClick={() => setWantsToChange(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            تغيير المحرقة
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                                <p className="text-yellow-800">⚠️ لم يتم تحديد محرقة لهذه الرحلة</p>
                            </div>
                        )}

                        {/* نموذج تغيير المحرقة */}
                        {wantsToChange && (
                            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 space-y-4">
                                <div className="flex items-center gap-2 text-orange-800">
                                    <AlertTriangle className="w-5 h-5" />
                                    <span className="font-bold">تغيير المحرقة</span>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        اختر المحرقة البديلة *
                                    </label>
                                    <select
                                        value={selectedIncineratorId}
                                        onChange={(e) => setSelectedIncineratorId(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                                        required={wantsToChange}
                                    >
                                        <option value="">-- اختر المحرقة --</option>
                                        {incinerators
                                            .filter(inc => inc.id !== route?.incinerator_id)
                                            .map(inc => (
                                                <option key={inc.id} value={inc.id}>{inc.name}</option>
                                            ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        سبب التغيير *
                                    </label>
                                    <textarea
                                        value={changeReason}
                                        onChange={(e) => setChangeReason(e.target.value)}
                                        rows="2"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                                        placeholder="مثال: المحرقة مغلقة، رفض الاستلام، عطل في المحرقة..."
                                        required={wantsToChange}
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setWantsToChange(false);
                                        setChangeReason('');
                                        setSelectedIncineratorId('');
                                    }}
                                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                                >
                                    إلغاء التغيير والعودة للمحرقة الأصلية
                                </button>
                            </div>
                        )}
                    </div>

                    {/* الكميات */}
                    <div className="border-2 border-gray-200 rounded-lg p-4">
                        <label className="block text-sm font-bold text-gray-800 mb-3">📦 الكميات المسلمة</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    عدد الأكياس *
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max={totalCollected.bags}
                                    value={delivery.bags_count}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-center text-lg font-bold text-gray-600 cursor-not-allowed"
                                    readOnly
                                />
                                <p className="text-xs text-gray-500 mt-1 text-center">محسوب تلقائياً من الرحلات</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    الوزن (كجم) *
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max={totalCollected.weight}
                                    value={delivery.weight_delivered}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-center text-lg font-bold text-gray-600 cursor-not-allowed"
                                    readOnly
                                />
                                <p className="text-xs text-gray-500 mt-1 text-center">محسوب تلقائياً من الرحلات</p>
                            </div>
                        </div>
                    </div>

                    {/* سيفتي بوكس */}
                    {(totalCollected.safetyBoxCount > 0 || totalCollected.safetyBoxWeight > 0) && (
                        <div className="border-2 border-amber-300 bg-amber-50 rounded-lg p-4">
                            <label className="block text-sm font-bold text-amber-800 mb-3">📦 سيفتي بوكس Safety Box المسلمة</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-amber-700 mb-2">
                                        عدد الصناديق
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={totalCollected.safetyBoxCount}
                                        value={delivery.safety_box_count}
                                        className="w-full px-4 py-3 border border-amber-200 rounded-lg bg-white text-center text-lg font-bold text-gray-600 cursor-not-allowed"
                                        readOnly
                                    />
                                    <p className="text-xs text-amber-600 mt-1 text-center">محسوب تلقائياً</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-amber-700 mb-2">
                                        وزن الصناديق (كجم)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max={totalCollected.safetyBoxWeight}
                                        value={delivery.safety_box_weight}
                                        className="w-full px-4 py-3 border border-amber-200 rounded-lg bg-white text-center text-lg font-bold text-gray-600 cursor-not-allowed"
                                        readOnly
                                    />
                                    <p className="text-xs text-amber-600 mt-1 text-center">محسوب تلقائياً</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* صورة الإيصال */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            📷 صورة إيصال المحرقة
                        </label>
                        {delivery.photo_proof ? (
                            <div className="relative">
                                <img 
                                    src={delivery.photo_proof} 
                                    alt="إيصال المحرقة"
                                    className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                                />
                                <button
                                    type="button"
                                    onClick={() => updateDelivery('photo_proof', null)}
                                    className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-brand-500 hover:bg-gray-50">
                                <Camera className="w-8 h-8 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-600">اضغط لرفع صورة</span>
                                <span className="text-xs text-gray-400 mt-1">الحد الأقصى: 5 ميجابايت</span>
                                <input
                                    type="file"
                                    accept="image/*,image/heic,image/heif"
                                    capture="environment"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            handlePhotoUpload(file);
                                        }
                                        // Reset input
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                        )}
                    </div>

                    {/* التوقيع */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            ✍️ توقيع المستلم
                        </label>
                        {delivery.receiver_signature ? (
                            <div className="relative">
                                <img 
                                    src={delivery.receiver_signature} 
                                    alt="توقيع المستلم"
                                    className="w-full h-32 object-contain bg-white border-2 border-gray-200 rounded-lg"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        updateDelivery('receiver_signature', null);
                                        setSigningActive(true);
                                    }}
                                    className="absolute top-2 right-2 bg-brand-600 text-white p-2 rounded-full hover:bg-brand-700"
                                >
                                    <Edit3 className="w-4 h-4" />
                                </button>
                            </div>
                        ) : signingActive ? (
                            <div className="space-y-2">
                                <div className="border-2 border-gray-300 rounded-lg bg-white">
                                    <SignatureCanvas
                                        ref={(ref) => setSignaturePad(ref)}
                                        canvasProps={{
                                            className: 'w-full h-32',
                                            style: { touchAction: 'none' }
                                        }}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={saveSignature}
                                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        حفظ التوقيع
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearSignature}
                                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        مسح
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSigningActive(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setSigningActive(true)}
                                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-brand-500 flex items-center justify-center"
                            >
                                <div className="text-center">
                                    <Edit3 className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                    <span className="text-sm text-gray-600">اضغط للتوقيع</span>
                                </div>
                            </button>
                        )}
                    </div>

                    {/* ملاحظات */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            ملاحظات إضافية
                        </label>
                        <textarea
                            value={delivery.notes}
                            onChange={(e) => updateDelivery('notes', e.target.value)}
                            rows="2"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                            placeholder="أي ملاحظات إضافية..."
                        />
                    </div>

                    {/* أزرار الحفظ */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-brand-600 text-white py-3 rounded-lg hover:bg-brand-700 disabled:bg-gray-400 font-medium"
                        >
                            {loading ? 'جاري الحفظ...' : '💾 تأكيد التسليم'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default IncineratorDeliveryModal;
