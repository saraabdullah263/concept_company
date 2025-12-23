import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Camera, Edit3, Save } from 'lucide-react';
import { supabase } from '../../services/supabase';
import SignatureCanvas from 'react-signature-canvas';

const IncineratorDeliveryModal = ({ isOpen, onClose, route, onSuccess }) => {
    const [incinerators, setIncinerators] = useState([]);
    const [deliveries, setDeliveries] = useState([{
        incinerator_id: '',
        bags_count: 0,
        weight_delivered: 0,
        receiver_signature: null,
        photo_proof: null,
        notes: ''
    }]);
    const [loading, setLoading] = useState(false);
    const [signingIndex, setSigningIndex] = useState(null);
    const [signaturePad, setSignaturePad] = useState(null);

    // حساب الكميات
    const totalCollected = {
        bags: route.route_stops?.reduce((sum, stop) => 
            sum + (stop.collection_details?.bags_count || 0), 0) || 0,
        weight: route.route_stops?.reduce((sum, stop) => 
            sum + (parseFloat(stop.collection_details?.total_weight) || 0), 0) || 0
    };

    const totalDelivered = deliveries.reduce((sum, d) => ({
        bags: sum.bags + (parseInt(d.bags_count) || 0),
        weight: sum.weight + (parseFloat(d.weight_delivered) || 0)
    }), { bags: 0, weight: 0 });

    const remaining = {
        bags: totalCollected.bags - totalDelivered.bags,
        weight: (totalCollected.weight - totalDelivered.weight).toFixed(2)
    };

    useEffect(() => {
        if (isOpen) {
            fetchIncinerators();
        }
    }, [isOpen]);

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

    const addDelivery = () => {
        setDeliveries([...deliveries, {
            incinerator_id: '',
            bags_count: 0,
            weight_delivered: 0,
            receiver_signature: null,
            photo_proof: null,
            notes: ''
        }]);
    };

    const removeDelivery = (index) => {
        setDeliveries(deliveries.filter((_, i) => i !== index));
    };

    const updateDelivery = (index, field, value) => {
        const updated = [...deliveries];
        updated[index][field] = value;
        setDeliveries(updated);
    };

    const handlePhotoUpload = async (index, file) => {
        if (!file) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${route.id}_incinerator_${index}_${Date.now()}.${fileExt}`;
            const filePath = `incinerator-receipts/${fileName}`;

            const { error: uploadError, data } = await supabase.storage
                .from('waste-management')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('waste-management')
                .getPublicUrl(filePath);

            updateDelivery(index, 'photo_proof', publicUrl);
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert('فشل رفع الصورة');
        }
    };

    const saveSignature = (index) => {
        if (signaturePad && !signaturePad.isEmpty()) {
            const signatureData = signaturePad.toDataURL();
            updateDelivery(index, 'receiver_signature', signatureData);
            setSigningIndex(null);
        }
    };

    const clearSignature = () => {
        if (signaturePad) {
            signaturePad.clear();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // التحقق من البيانات
        if (deliveries.some(d => !d.incinerator_id || d.bags_count <= 0 || d.weight_delivered <= 0)) {
            alert('يرجى ملء جميع البيانات المطلوبة');
            return;
        }

        if (totalDelivered.bags > totalCollected.bags || totalDelivered.weight > totalCollected.weight) {
            alert('الكمية المسلمة أكبر من الكمية المجمعة!');
            return;
        }

        setLoading(true);

        try {
            // حفظ التسليمات
            const deliveriesData = deliveries.map((d, index) => ({
                route_id: route.id,
                incinerator_id: d.incinerator_id,
                bags_count: parseInt(d.bags_count),
                weight_delivered: parseFloat(d.weight_delivered),
                delivery_order: index + 1,
                receiver_signature: d.receiver_signature,
                photo_proof: d.photo_proof,
                notes: d.notes,
                delivery_time: new Date().toISOString()
            }));

            const { error: deliveryError } = await supabase
                .from('incinerator_deliveries')
                .insert(deliveriesData);

            if (deliveryError) throw deliveryError;

            // حساب إجمالي الوزن المسلم
            const totalDeliveredWeight = deliveriesData.reduce((sum, d) => sum + d.weight_delivered, 0);

            // تحديث الرحلة
            const { error: routeError } = await supabase
                .from('routes')
                .update({
                    remaining_weight: parseFloat(remaining.weight),
                    remaining_bags: remaining.bags,
                    total_weight_collected: totalCollected.weight,
                    status: 'completed', // تحديث الحالة لمكتملة
                    end_time: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', route.id);

            if (routeError) throw routeError;

            alert('تم حفظ بيانات التسليم بنجاح ✅');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving deliveries:', error);
            alert('حدث خطأ أثناء الحفظ');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">🏭 تسليم النفايات للمحارق</h2>
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
                                <span className="text-blue-700">الوزن: </span>
                                <span className="font-bold text-blue-900">{totalCollected.weight.toFixed(2)} كجم</span>
                            </div>
                        </div>
                    </div>

                    {/* قائمة التسليمات */}
                    <div className="space-y-4">
                        {deliveries.map((delivery, index) => (
                            <div key={index} className="border-2 border-gray-200 rounded-lg p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-gray-900">🏭 المحرقة {index + 1}</h4>
                                    {deliveries.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeDelivery(index)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>

                                {/* اختيار المحرقة */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        اختر المحرقة *
                                    </label>
                                    <select
                                        value={delivery.incinerator_id}
                                        onChange={(e) => updateDelivery(index, 'incinerator_id', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                                        required
                                    >
                                        <option value="">-- اختر المحرقة --</option>
                                        {incinerators.map(inc => (
                                            <option key={inc.id} value={inc.id}>{inc.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* الكميات */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            عدد الأكياس *
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={delivery.bags_count}
                                            onChange={(e) => updateDelivery(index, 'bags_count', e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            الوزن (كجم) *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            value={delivery.weight_delivered}
                                            onChange={(e) => updateDelivery(index, 'weight_delivered', e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                                            required
                                        />
                                    </div>
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
                                                    updateDelivery(index, 'receiver_signature', null);
                                                    setSigningIndex(index);
                                                }}
                                                className="absolute top-2 right-2 bg-brand-600 text-white p-2 rounded-full hover:bg-brand-700"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : signingIndex === index ? (
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
                                                    onClick={() => saveSignature(index)}
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
                                                    onClick={() => setSigningIndex(null)}
                                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                                >
                                                    إلغاء
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setSigningIndex(index)}
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
                                        ملاحظات
                                    </label>
                                    <textarea
                                        value={delivery.notes}
                                        onChange={(e) => updateDelivery(index, 'notes', e.target.value)}
                                        rows="2"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                                        placeholder="أي ملاحظات إضافية..."
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* زر إضافة محرقة */}
                    <button
                        type="button"
                        onClick={addDelivery}
                        className="w-full py-3 border-2 border-dashed border-brand-300 text-brand-600 rounded-lg hover:bg-brand-50 flex items-center justify-center gap-2 font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        إضافة محرقة أخرى
                    </button>

                    {/* ملخص نهائي */}
                    <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 space-y-2">
                        <h3 className="font-bold text-gray-900 mb-3">📊 الملخص النهائي:</h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="bg-white p-3 rounded-lg">
                                <div className="text-gray-600 mb-1">المجمع</div>
                                <div className="font-bold text-blue-600">
                                    {totalCollected.bags} كيس<br/>
                                    {totalCollected.weight.toFixed(2)} كجم
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg">
                                <div className="text-gray-600 mb-1">المسلم</div>
                                <div className="font-bold text-green-600">
                                    {totalDelivered.bags} كيس<br/>
                                    {totalDelivered.weight.toFixed(2)} كجم
                                </div>
                            </div>
                            <div className="bg-white p-3 rounded-lg">
                                <div className="text-gray-600 mb-1">المتبقي</div>
                                <div className="font-bold text-orange-600">
                                    {remaining.bags} كيس<br/>
                                    {remaining.weight} كجم
                                </div>
                            </div>
                        </div>
                        {(remaining.bags < 0 || remaining.weight < 0) && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                                ⚠️ تحذير: الكمية المسلمة أكبر من الكمية المجمعة!
                            </div>
                        )}
                    </div>

                    {/* أزرار الحفظ */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-brand-600 text-white py-3 rounded-lg hover:bg-brand-700 disabled:bg-gray-400 font-medium"
                        >
                            {loading ? 'جاري الحفظ...' : '💾 حفظ التسليم'}
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
