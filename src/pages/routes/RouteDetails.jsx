import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { ArrowRight, MapPin, User, Truck, Calendar, Package, CheckCircle, Clock, Loader2, Factory } from 'lucide-react';
import PrintReceipts from '../../components/routes/PrintReceipts';
import PrintCompleteReceipt from '../../components/routes/PrintCompleteReceipt';
import IncineratorDeliveryModal from '../../components/routes/IncineratorDeliveryModal';

const RouteDetails = () => {
    const { id } = useParams();
    const [route, setRoute] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deliveries, setDeliveries] = useState([]);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);

    useEffect(() => {
        fetchRouteDetails();
        fetchDeliveries();
    }, [id]);

    const fetchRouteDetails = async () => {
        try {
            setLoading(true);

            // Fetch route
            const { data: routeData, error } = await supabase
                .from('routes')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            // Fetch related data separately
            if (routeData) {
                // Fetch representative
                if (routeData.representative_id) {
                    const { data: rep } = await supabase
                        .from('representatives')
                        .select('id, user_id, users!user_id(full_name, email)')
                        .eq('id', routeData.representative_id)
                        .single();
                    routeData.representatives = rep;
                }

                // Fetch vehicle
                if (routeData.vehicle_id) {
                    const { data: vehicle } = await supabase
                        .from('vehicles')
                        .select('plate_number, model')
                        .eq('id', routeData.vehicle_id)
                        .single();
                    routeData.vehicles = vehicle;
                }

                // Fetch incinerator
                if (routeData.incinerator_id) {
                    const { data: incinerator } = await supabase
                        .from('incinerators')
                        .select('name')
                        .eq('id', routeData.incinerator_id)
                        .single();
                    routeData.incinerators = incinerator;
                }

                // Fetch route stops with hospitals
                const { data: stops } = await supabase
                    .from('route_stops')
                    .select('*, hospitals!hospital_id(name, address)')
                    .eq('route_id', id)
                    .order('stop_order', { ascending: true });
                
                routeData.route_stops = stops || [];
            }

            setRoute(routeData);
        } catch (error) {
            console.error('Error fetching route:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDeliveries = async () => {
        try {
            const { data, error } = await supabase
                .from('incinerator_deliveries')
                .select('*, incinerators:incinerator_id(name)')
                .eq('route_id', id)
                .order('delivery_order', { ascending: true });

            if (!error && data) {
                setDeliveries(data);
            }
        } catch (error) {
            console.error('Error fetching deliveries:', error);
        }
    };

    const handleDeliverySuccess = () => {
        fetchRouteDetails();
        fetchDeliveries();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            </div>
        );
    }

    if (!route) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">لم يتم العثور على الرحلة</p>
                <Link to="/routes" className="text-brand-600 hover:underline mt-2 inline-block">
                    العودة للرحلات
                </Link>
            </div>
        );
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'in_progress': return 'bg-blue-100 text-blue-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'completed': return 'مكتملة';
            case 'in_progress': return 'جارية';
            case 'cancelled': return 'ملغاة';
            default: return 'معلقة';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Link to="/routes" className="text-brand-600 hover:text-brand-700 flex items-center gap-1 text-sm mb-2">
                        <ArrowRight className="w-4 h-4" />
                        العودة للرحلات
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">{route.route_name || 'رحلة بدون اسم'}</h1>
                    <p className="text-sm text-gray-500 mt-1">ID: {route.id.slice(0, 8)}</p>
                </div>
                <div className="flex items-center gap-3">
                    {route.route_stops && route.route_stops.length > 0 && route.status === 'completed' && (
                        <PrintCompleteReceipt route={route} stops={route.route_stops} deliveries={deliveries} />
                    )}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(route.status)}`}>
                        {getStatusText(route.status)}
                    </span>
                </div>
            </div>

            {/* Info Cards */}
            <div className={`grid grid-cols-1 gap-4 ${route.route_type === 'maintenance' ? 'md:grid-cols-2' : 'md:grid-cols-4'}`}>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <User className="w-5 h-5 text-brand-600" />
                        <span className="text-sm text-gray-500">المندوب</span>
                    </div>
                    <p className="font-medium">{route.representatives?.users?.full_name || 'غير محدد'}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Truck className="w-5 h-5 text-brand-600" />
                        <span className="text-sm text-gray-500">المركبة</span>
                    </div>
                    <p className="font-medium">{route.vehicles?.plate_number || 'غير محدد'}</p>
                    {route.vehicles?.model && <p className="text-xs text-gray-500">{route.vehicles.model}</p>}
                </div>

                {route.route_type !== 'maintenance' && (
                <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Package className="w-5 h-5 text-brand-600" />
                        <span className="text-sm text-gray-500">الوزن المجمع</span>
                    </div>
                    <p className="font-medium">
                        {(() => {
                            const bagsWeight = route.route_stops?.reduce((sum, stop) => sum + (parseFloat(stop.collection_details?.total_weight) || 0), 0) || 0;
                            const safetyBoxWeight = route.route_stops?.reduce((sum, stop) => sum + (parseFloat(stop.collection_details?.safety_box_weight) || 0), 0) || 0;
                            return (bagsWeight + safetyBoxWeight).toFixed(2);
                        })()} كجم
                    </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Factory className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-gray-500">المسلم للمحارق</span>
                    </div>
                    <p className="font-medium text-green-600">
                        {(() => {
                            const deliveredWeight = deliveries.reduce((sum, d) => sum + parseFloat(d.weight_delivered || 0), 0);
                            const safetyBoxWeight = route.route_stops?.reduce((sum, stop) => sum + (parseFloat(stop.collection_details?.safety_box_weight) || 0), 0) || 0;
                            return (deliveredWeight + safetyBoxWeight).toFixed(2);
                        })()} كجم
                    </p>
                </div>
                </>
                )}
            </div>

            {/* Maintenance Details */}
            {route.route_type === 'maintenance' && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-2xl">🔧</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-orange-900">رحلة صيانة</h3>
                            <p className="text-sm text-orange-700">هذه الرحلة مخصصة لصيانة المركبة</p>
                        </div>
                    </div>
                    {route.maintenance_details && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-orange-200">
                            <p className="text-xs text-gray-500 mb-1">تفاصيل الصيانة:</p>
                            <p className="text-sm text-gray-700">{route.maintenance_details}</p>
                        </div>
                    )}
                    {route.notes && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-orange-200">
                            <p className="text-xs text-gray-500 mb-1">ملاحظات:</p>
                            <p className="text-sm text-gray-700">{route.notes}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Incinerator Deliveries Section - فقط لرحلات الجمع */}
            {route.route_type !== 'maintenance' && deliveries.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="p-4 border-b border-gray-100">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Factory className="w-5 h-5 text-green-600" />
                            ملخص التسليم للمحارق
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">رقم الإيصال: {route.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <div className="p-4">
                        <div className="space-y-3">
                            {deliveries.map((delivery) => {
                                // حساب الوزن الكلي المسلم (أكياس + سيفتي بوكس)
                                const safetyBoxWeight = route.route_stops?.reduce((sum, stop) => sum + (parseFloat(stop.collection_details?.safety_box_weight) || 0), 0) || 0;
                                const totalDeliveredWeight = parseFloat(delivery.weight_delivered) + safetyBoxWeight;
                                
                                return (
                                <div key={delivery.id} className="border-2 border-green-100 rounded-lg p-4 bg-green-50">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                                <span className="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                                                    {delivery.delivery_order}
                                                </span>
                                                {delivery.incinerators?.name}
                                            </h4>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {new Date(delivery.delivery_time).toLocaleString('ar-EG')}
                                            </p>
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm text-gray-600">الكمية المسلمة</div>
                                            <div className="font-bold text-green-600">
                                                {delivery.bags_count} كيس - {delivery.weight_delivered} كجم
                                            </div>
                                            {safetyBoxWeight > 0 && (
                                                <div className="text-xs text-amber-600 mt-1">
                                                    + سيفتي بوكس: {safetyBoxWeight.toFixed(2)} كجم
                                                </div>
                                            )}
                                            <div className="font-bold text-green-800 mt-1 pt-1 border-t border-green-200">
                                                ⚖️ الكلي: {totalDeliveredWeight.toFixed(2)} كجم
                                            </div>
                                        </div>
                                    </div>

                                    {/* Photo and Signature */}
                                    <div className="grid grid-cols-2 gap-4 mt-3">
                                        {delivery.photo_proof && (
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 mb-2">📷 صورة الإيصال:</p>
                                                <img 
                                                    src={delivery.photo_proof} 
                                                    alt="إيصال المحرقة"
                                                    className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:border-green-500"
                                                    onClick={() => window.open(delivery.photo_proof, '_blank')}
                                                />
                                            </div>
                                        )}
                                        {delivery.receiver_signature && (
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 mb-2">✍️ توقيع المستلم:</p>
                                                <img 
                                                    src={delivery.receiver_signature} 
                                                    alt="توقيع المستلم"
                                                    className="w-full h-32 object-contain bg-white rounded-lg border-2 border-gray-200"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {delivery.notes && (
                                        <div className="mt-3 pt-3 border-t border-green-200">
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">ملاحظات: </span>
                                                {delivery.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )})}
                        </div>

                        {/* Summary */}
                        <div className="mt-4 pt-4 border-t-2 border-gray-200">
                            {/* حساب الإجماليات */}
                            {(() => {
                                const totalBags = route.route_stops?.reduce((sum, stop) => sum + (stop.collection_details?.bags_count || 0), 0) || 0;
                                const totalBagsWeight = route.route_stops?.reduce((sum, stop) => sum + (parseFloat(stop.collection_details?.total_weight) || 0), 0) || 0;
                                const totalSafetyBoxCount = route.route_stops?.reduce((sum, stop) => sum + (stop.collection_details?.safety_box_count || 0), 0) || 0;
                                const totalSafetyBoxWeight = route.route_stops?.reduce((sum, stop) => sum + (parseFloat(stop.collection_details?.safety_box_weight) || 0), 0) || 0;
                                const grandTotalWeight = totalBagsWeight + totalSafetyBoxWeight;
                                const deliveredWeight = deliveries.reduce((sum, d) => sum + parseFloat(d.weight_delivered || 0), 0);
                                const deliveredBags = deliveries.reduce((sum, d) => sum + parseInt(d.bags_count || 0), 0);
                                // المسلم يشمل كل شيء (أكياس + سيفتي بوكس)
                                const totalDeliveredWeight = deliveredWeight + totalSafetyBoxWeight;

                                return (
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div className="bg-blue-50 p-3 rounded-lg">
                                            <div className="text-sm text-gray-600 mb-1">إجمالي المجمع</div>
                                            <div className="font-bold text-blue-600">{totalBags} كيس ({totalBagsWeight.toFixed(2)} كجم)</div>
                                            {totalSafetyBoxCount > 0 && (
                                                <div className="text-xs text-amber-600 mt-1">📦 {totalSafetyBoxCount} صندوق ({totalSafetyBoxWeight.toFixed(2)} كجم)</div>
                                            )}
                                            <div className="font-bold text-blue-800 mt-1 pt-1 border-t border-blue-200">⚖️ الكلي: {grandTotalWeight.toFixed(2)} كجم</div>
                                        </div>
                                        <div className="bg-green-50 p-3 rounded-lg">
                                            <div className="text-sm text-gray-600 mb-1">إجمالي المسلم</div>
                                            <div className="font-bold text-green-600">{deliveredBags} كيس ({deliveredWeight.toFixed(2)} كجم)</div>
                                            {totalSafetyBoxCount > 0 && (
                                                <div className="text-xs text-amber-600 mt-1">📦 {totalSafetyBoxCount} صندوق ({totalSafetyBoxWeight.toFixed(2)} كجم)</div>
                                            )}
                                            <div className="font-bold text-green-800 mt-1 pt-1 border-t border-green-200">⚖️ الكلي: {totalDeliveredWeight.toFixed(2)} كجم</div>
                                        </div>
                                        <div className="bg-orange-50 p-3 rounded-lg">
                                            <div className="text-sm text-gray-600 mb-1">متبقي في السيارة</div>
                                            <div className="font-bold text-orange-600">
                                                {route.remaining_bags || 0} كيس
                                            </div>
                                            <div className="font-bold text-orange-600">
                                                {route.remaining_weight || 0} كجم
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            ) : (
                route.route_type !== 'maintenance' && route.route_stops?.some(stop => stop.collection_details) && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 text-center">
                        <Factory className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                        <h3 className="font-bold text-gray-900 mb-2">لم يتم تسليم النفايات للمحارق بعد</h3>
                        <p className="text-gray-600 mb-4">تم التجميع من العملاء، يمكنك الآن تسجيل التسليم للمحارق</p>
                        <button
                            onClick={() => setShowDeliveryModal(true)}
                            className="bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 font-medium inline-flex items-center gap-2"
                        >
                            <Factory className="w-5 h-5" />
                            تسليم للمحارق
                        </button>
                    </div>
                )
            )}

            {/* Route Stops - فقط لرحلات الجمع */}
            {route.route_type !== 'maintenance' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">محطات الرحلة ({route.route_stops?.length || 0})</h3>
                </div>

                {route.route_stops && route.route_stops.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {route.route_stops
                            .sort((a, b) => a.stop_order - b.stop_order)
                            .map((stop) => (
                                <div key={stop.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0">
                                            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-sm">
                                                {stop.stop_order}
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-900">{stop.hospitals?.name || 'مستشفى غير معروف'}</h4>
                                            {stop.hospitals?.address && (
                                                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {stop.hospitals.address}
                                                </p>
                                            )}
                                            {stop.weight_collected && (
                                                <p className="text-sm text-brand-600 mt-1 font-medium">
                                                    الوزن: {stop.weight_collected} كجم
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            {stop.status === 'collected' && (
                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                            )}
                                            {stop.status === 'pending' && (
                                                <Clock className="w-5 h-5 text-yellow-600" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Additional Details - Collection Data, Photos, Signatures, Times */}
                                    {(stop.collection_details || stop.photo_proof || stop.hospital_signature || stop.arrival_time) && (
                                        <div className="mt-4 ml-12 space-y-3 bg-gray-50 rounded-lg p-4">
                                            {/* Collection Details */}
                                            {stop.collection_details && (
                                                <div className="bg-white rounded-lg p-4 border-2 border-brand-100">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h5 className="font-semibold text-gray-900 flex items-center gap-2">
                                                            <Package className="w-4 h-4 text-brand-600" />
                                                            تفاصيل الاستلام
                                                        </h5>
                                                        <span className="text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded-full font-mono">
                                                            رقم الإيصال: EC-{new Date(stop.collection_details.collection_time || Date.now()).getFullYear()}-{stop.hospital_id?.slice(-3).toUpperCase() || '000'}-{Date.parse(stop.collection_details.collection_time || Date.now()).toString().slice(-5)}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Waste Types */}
                                                    <div className="mb-3">
                                                        <p className="text-sm font-medium text-gray-700 mb-1">نوع النفايات:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {stop.collection_details.waste_types?.hazardous && (
                                                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                                                                    نفايات خطرة
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Bags and Weight */}
                                                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                                                        <div>
                                                            <span className="text-gray-600">عدد الأكياس: </span>
                                                            <span className="font-medium">{stop.collection_details.bags_count}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">الوزن الإجمالي: </span>
                                                            <span className="font-medium">{stop.collection_details.total_weight} كجم</span>
                                                        </div>
                                                    </div>

                                                    {/* Safety Box */}
                                                    {(stop.collection_details.safety_box_count > 0 || stop.collection_details.safety_box_weight > 0) && (
                                                        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                                            <p className="text-sm font-medium text-amber-800 mb-1">📦 سيفتي بوكس Safety Box:</p>
                                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                                <div>
                                                                    <span className="text-amber-700">عدد الصناديق: </span>
                                                                    <span className="font-medium text-amber-900">{stop.collection_details.safety_box_count || 0}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-amber-700">الوزن: </span>
                                                                    <span className="font-medium text-amber-900">{stop.collection_details.safety_box_weight || 0} كجم</span>
                                                                </div>
                                                            </div>
                                                            <div className="mt-2 pt-2 border-t border-amber-200">
                                                                <span className="text-amber-800 font-medium">الوزن الكلي: </span>
                                                                <span className="font-bold text-amber-900">
                                                                    {((stop.collection_details.total_weight || 0) + (stop.collection_details.safety_box_weight || 0)).toFixed(2)} كجم
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Notes */}
                                                    {stop.collection_details.notes && (
                                                        <div className="mb-3">
                                                            <p className="text-sm font-medium text-gray-700 mb-1">ملاحظات:</p>
                                                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                                                {stop.collection_details.notes}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Signatures */}
                                                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-700 mb-2">توقيع المندوب:</p>
                                                            {stop.collection_details.representative_signature ? (
                                                                <div className="bg-white p-2 rounded border border-gray-200">
                                                                    <img 
                                                                        src={stop.collection_details.representative_signature} 
                                                                        alt="توقيع المندوب"
                                                                        className="max-w-full h-20 object-contain"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-gray-500 italic">توقيع يدوي على الإيصال</p>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-700 mb-2">توقيع العميل:</p>
                                                            {stop.collection_details.client_signature ? (
                                                                <div className="bg-white p-2 rounded border border-gray-200">
                                                                    <img 
                                                                        src={stop.collection_details.client_signature} 
                                                                        alt="توقيع العميل"
                                                                        className="max-w-full h-20 object-contain"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-gray-500 italic">توقيع يدوي على الإيصال</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Collection Time */}
                                                    {stop.collection_details.collection_time && (
                                                        <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
                                                            <span className="font-medium">⏰ وقت الاستلام: </span>
                                                            <span>{new Date(stop.collection_details.collection_time).toLocaleString('ar-EG')}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Times */}
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                {stop.arrival_time && (
                                                    <div>
                                                        <span className="text-gray-600">وقت الوصول: </span>
                                                        <span className="font-medium block">{new Date(stop.arrival_time).toLocaleString('ar-EG')}</span>
                                                    </div>
                                                )}
                                                {stop.departure_time && (
                                                    <div>
                                                        <span className="text-gray-600">وقت المغادرة: </span>
                                                        <span className="font-medium block">{new Date(stop.departure_time).toLocaleString('ar-EG')}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Photo */}
                                            {stop.photo_proof && (
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700 mb-2">📷 صورة الوصل:</p>
                                                    <img 
                                                        src={stop.photo_proof} 
                                                        alt="وصل المحطة"
                                                        className="max-w-sm rounded-lg border-2 border-gray-200 cursor-pointer hover:border-brand-500 transition-colors"
                                                        onClick={() => window.open(stop.photo_proof, '_blank')}
                                                        title="اضغط للفتح في نافذة جديدة"
                                                    />
                                                    {stop.photo_upload_time && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            تم الرفع: {new Date(stop.photo_upload_time).toLocaleString('ar-EG')}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Location Info */}
                                            {stop.arrival_location && (
                                                <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                                                    <span className="font-medium">📍 الموقع: </span>
                                                    <span>
                                                        {stop.arrival_location.lat?.toFixed(6)}, {stop.arrival_location.lng?.toFixed(6)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p>لا توجد محطات لهذه الرحلة</p>
                    </div>
                )}
            </div>
            )}

            {/* Additional Info */}
            {route.notes && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <h3 className="font-bold text-gray-900 mb-2">ملاحظات</h3>
                    <p className="text-gray-700">{route.notes}</p>
                </div>
            )}

            {/* Incinerator Delivery Modal */}
            <IncineratorDeliveryModal
                isOpen={showDeliveryModal}
                onClose={() => setShowDeliveryModal(false)}
                route={route}
                onSuccess={handleDeliverySuccess}
            />
        </div>
    );
};

export default RouteDetails;
