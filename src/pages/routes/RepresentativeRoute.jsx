import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import RouteStopCard from '../../components/routes/RouteStopCard';
import IncineratorDeliveryModal from '../../components/routes/IncineratorDeliveryModal';
import PrintCompleteReceipt from '../../components/routes/PrintCompleteReceipt';
import { Loader2, MapPin, Clock, AlertCircle, CheckCircle2, Factory } from 'lucide-react';

const RepresentativeRoute = () => {
    const { routeId } = useParams();
    
    const [route, setRoute] = useState(null);
    const [stops, setStops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [isStarting, setIsStarting] = useState(false);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [deliveries, setDeliveries] = useState([]);

    useEffect(() => {
        fetchRouteDetails();
        fetchDeliveries();
        getCurrentLocation();
    }, [routeId]);

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCurrentLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert('الرجاء تفعيل خدمة الموقع للمتابعة');
                }
            );
        }
    };

    const fetchRouteDetails = async () => {
        try {
            setLoading(true);

            // Fetch route
            const { data: routeData, error: routeError } = await supabase
                .from('routes')
                .select('*')
                .eq('id', routeId)
                .single();

            if (routeError) throw routeError;

            // Fetch related data separately
            if (routeData) {
                // Fetch representative
                if (routeData.representative_id) {
                    const { data: rep } = await supabase
                        .from('representatives')
                        .select('id, user_id, users!user_id(full_name)')
                        .eq('id', routeData.representative_id)
                        .single();
                    routeData.representatives = rep;
                }

                // Fetch vehicle
                if (routeData.vehicle_id) {
                    const { data: vehicle } = await supabase
                        .from('vehicles')
                        .select('plate_number')
                        .eq('id', routeData.vehicle_id)
                        .single();
                    routeData.vehicles = vehicle;
                }

                // Fetch incinerator
                if (routeData.incinerator_id) {
                    const { data: incinerator } = await supabase
                        .from('incinerators')
                        .select('name, location')
                        .eq('id', routeData.incinerator_id)
                        .single();
                    routeData.incinerators = incinerator;
                }
            }

            setRoute(routeData);

            // Fetch stops
            const { data: stopsData, error: stopsError } = await supabase
                .from('route_stops')
                .select(`
                    *,
                    hospitals (name, address, contact_person, contact_phone)
                `)
                .eq('route_id', routeId)
                .order('stop_order', { ascending: true });

            if (stopsError) throw stopsError;
            setStops(stopsData || []);

        } catch (error) {
            console.error('Error fetching route:', error);
            alert('حدث خطأ في تحميل بيانات الرحلة');
        } finally {
            setLoading(false);
        }
    };

    const fetchDeliveries = async () => {
        try {
            const { data, error } = await supabase
                .from('incinerator_deliveries')
                .select('*, incinerators:incinerator_id(name)')
                .eq('route_id', routeId)
                .order('delivery_order', { ascending: true });

            if (error) {
                console.error('Error fetching deliveries:', error);
                return;
            }
            
            if (data) {
                setDeliveries(data);
            }
        } catch (error) {
            console.error('Error fetching deliveries:', error);
        }
    };

    const handleStartRoute = async () => {
        // استخدام موقع افتراضي لو مش متاح
        if (!currentLocation) {
            console.warn('Location not available, using default');
        }
        const locationData = currentLocation || { lat: 0, lng: 0, accuracy: 0 };

        try {
            setIsStarting(true);

            const now = new Date().toISOString();

            // Update route
            const { error: routeError } = await supabase
                .from('routes')
                .update({
                    status: 'in_progress',
                    start_time: now,
                    start_location: locationData
                })
                .eq('id', routeId);

            if (routeError) throw routeError;

            // Log event
            await supabase.from('route_tracking_logs').insert({
                route_id: routeId,
                event_type: 'route_started',
                event_time: now,
                location: locationData
            });

            await fetchRouteDetails();
            alert('تم بدء الرحلة بنجاح');

        } catch (error) {
            console.error('Error starting route:', error);
            alert('حدث خطأ في بدء الرحلة');
        } finally {
            setIsStarting(false);
        }
    };

    // تأكيد استلام مهمة الصيانة
    const handleAcceptMaintenance = async () => {
        try {
            setIsStarting(true);

            const now = new Date().toISOString();

            // تحديث الرحلة لتصبح مكتملة مباشرة
            const { error: routeError } = await supabase
                .from('routes')
                .update({
                    status: 'completed',
                    start_time: now,
                    end_time: now
                })
                .eq('id', routeId);

            if (routeError) throw routeError;

            // تسجيل الحدث
            await supabase.from('route_tracking_logs').insert({
                route_id: routeId,
                event_type: 'maintenance_accepted',
                event_time: now,
                data: { message: 'تم قبول مهمة الصيانة' }
            });

            await fetchRouteDetails();
            alert('تم تأكيد استلام مهمة الصيانة بنجاح');

        } catch (error) {
            console.error('Error accepting maintenance:', error);
            alert('حدث خطأ في تأكيد المهمة');
        } finally {
            setIsStarting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            </div>
        );
    }

    if (!route) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">لم يتم العثور على الرحلة</p>
            </div>
        );
    }

    const canStart = route.status === 'pending';
    const isInProgress = route.status === 'in_progress';
    const isCompleted = route.status === 'completed';

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Route Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold text-gray-900">
                                {route.route_name || `رحلة ${new Date(route.route_date).toLocaleDateString('ar-EG')}`}
                            </h1>
                            {route.route_type === 'maintenance' && (
                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                                    🔧 صيانة
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            {route.vehicles?.plate_number}
                            {route.route_type !== 'maintenance' && route.incinerators?.name && ` • ${route.incinerators.name}`}
                        </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        route.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        route.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        route.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                        {route.status === 'pending' ? 'معلقة' :
                         route.status === 'in_progress' ? 'جارية' :
                         route.status === 'completed' ? 'مكتملة' : 'ملغاة'}
                    </div>
                </div>

                {route.estimated_start_time && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>الوقت المتوقع للبدء: {route.estimated_start_time}</span>
                    </div>
                )}

                {/* زر بدء الرحلة - لرحلات الجمع */}
                {canStart && route.route_type !== 'maintenance' && (
                    <>
                        <button
                            onClick={handleStartRoute}
                            disabled={isStarting || !currentLocation}
                            className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isStarting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>جاري البدء...</span>
                                </>
                            ) : (
                                <>
                                    <MapPin className="w-5 h-5" />
                                    <span>بدء الرحلة</span>
                                </>
                            )}
                        </button>
                    </>
                )}

                {/* زر تأكيد استلام مهمة الصيانة */}
                {canStart && route.route_type === 'maintenance' && (
                    <button
                        onClick={handleAcceptMaintenance}
                        disabled={isStarting}
                        className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isStarting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>جاري التأكيد...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-5 h-5" />
                                <span>موافق - تم استلام المهمة</span>
                            </>
                        )}
                    </button>
                )}

                {/* رسالة تفعيل الموقع - فقط لرحلات الجمع */}
                {route.route_type !== 'maintenance' && !currentLocation && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700 mb-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span className="font-medium">خدمة الموقع غير مفعلة</span>
                        </div>
                        <p className="text-sm text-red-600 mb-3">يجب تفعيل خدمة الموقع للمتابعة في الرحلة</p>
                        <button
                            onClick={getCurrentLocation}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                        >
                            تفعيل الموقع
                        </button>
                    </div>
                )}
            </div>

            {/* Maintenance Route Info */}
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

            {/* Route Progress - فقط لرحلات الجمع */}
            {isInProgress && route.route_type !== 'maintenance' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">التقدم</span>
                        <span className="text-sm text-gray-500">
                            {stops.filter(s => s.status === 'collected').length} / {stops.length} محطة
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-brand-600 h-2 rounded-full transition-all"
                            style={{
                                width: `${(stops.filter(s => s.status === 'collected').length / stops.length) * 100}%`
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Stops List - فقط لرحلات الجمع */}
            {route.route_type !== 'maintenance' && (
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">المحطات</h2>
                {stops.map((stop, index) => (
                    <RouteStopCard
                        key={stop.id}
                        stop={stop}
                        stopNumber={index + 1}
                        routeId={routeId}
                        route={route}
                        isRouteInProgress={isInProgress}
                        currentLocation={currentLocation}
                        onUpdate={fetchRouteDetails}
                    />
                ))}
            </div>
            )}

            {/* Incinerator Delivery - After all stops collected */}
            {route.route_type !== 'maintenance' && isInProgress && stops.every(s => s.status === 'collected') && deliveries.length === 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 text-center">
                    <Factory className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                    <h3 className="font-bold text-gray-900 mb-2">تم التجميع من جميع العملاء</h3>
                    <p className="text-gray-600 mb-1">
                        إجمالي الأكياس: {stops.reduce((sum, s) => sum + (s.collection_details?.bags_count || 0), 0)} كيس
                        ({stops.reduce((sum, s) => sum + (s.collection_details?.total_weight || 0), 0).toFixed(2)} كجم)
                    </p>
                    {/* سيفتي بوكس */}
                    {stops.reduce((sum, s) => sum + (s.collection_details?.safety_box_count || 0), 0) > 0 && (
                        <p className="text-amber-700 mb-1 font-medium">
                            📦 سيفتي بوكس: {stops.reduce((sum, s) => sum + (s.collection_details?.safety_box_count || 0), 0)} صندوق
                            ({stops.reduce((sum, s) => sum + (s.collection_details?.safety_box_weight || 0), 0).toFixed(2)} كجم)
                        </p>
                    )}
                    <p className="text-brand-700 font-bold mb-1">
                        ⚖️ الوزن الكلي: {route.total_weight_collected || 0} كجم
                    </p>
                    <div className="mb-4"></div>
                    <button
                        onClick={() => setShowDeliveryModal(true)}
                        className="bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 font-medium inline-flex items-center gap-2"
                    >
                        <Factory className="w-5 h-5" />
                        تسليم للمحارق
                    </button>
                </div>
            )}

            {/* Delivery Summary - After delivery completed */}
            {route.route_type !== 'maintenance' && deliveries.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Factory className="w-5 h-5 text-green-600" />
                        ملخص التسليم للمحارق
                    </h3>
                    
                    <div className="space-y-3 mb-4">
                        {deliveries.map((delivery, index) => (
                            <div key={delivery.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                <div>
                                    <div className="font-medium text-gray-900">
                                        {delivery.delivery_number ? `${delivery.delivery_number} - ` : `${index + 1}. `}{delivery.incinerators?.name}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {new Date(delivery.delivery_time).toLocaleString('ar-EG')}
                                    </div>
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-green-600">
                                        {delivery.bags_count} كيس
                                    </div>
                                    <div className="text-sm text-green-600">
                                        {delivery.weight_delivered} كجم
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4 pt-4 border-t">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-sm text-gray-600 mb-1">المجمع</div>
                            <div className="font-bold text-blue-600">
                                {stops.reduce((sum, s) => sum + (s.collection_details?.bags_count || 0), 0)} كيس
                            </div>
                            <div className="text-sm text-blue-600">
                                {(() => {
                                    const bagsWeight = stops?.reduce((sum, s) => sum + (parseFloat(s.collection_details?.total_weight) || 0), 0) || 0;
                                    const safetyBoxWeight = stops?.reduce((sum, s) => sum + (parseFloat(s.collection_details?.safety_box_weight) || 0), 0) || 0;
                                    return (bagsWeight + safetyBoxWeight).toFixed(2);
                                })()} كجم
                            </div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-sm text-gray-600 mb-1">المسلم</div>
                            <div className="font-bold text-green-600">
                                {deliveries.reduce((sum, d) => sum + parseInt(d.bags_count || 0), 0)} كيس
                            </div>
                            <div className="text-sm text-green-600">
                                {(() => {
                                    const deliveredWeight = deliveries.reduce((sum, d) => sum + parseFloat(d.weight_delivered || 0), 0);
                                    const safetyBoxWeight = stops?.reduce((sum, s) => sum + (parseFloat(s.collection_details?.safety_box_weight) || 0), 0) || 0;
                                    return (deliveredWeight + safetyBoxWeight).toFixed(2);
                                })()} كجم
                            </div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <div className="text-sm text-gray-600 mb-1">المتبقي</div>
                            <div className="font-bold text-orange-600">
                                {route.remaining_bags || 0} كيس
                            </div>
                            <div className="text-sm text-orange-600">
                                {route.remaining_weight || 0} كجم
                            </div>
                        </div>
                    </div>

                    <PrintCompleteReceipt 
                        route={route} 
                        stops={stops} 
                        deliveries={deliveries} 
                    />
                </div>
            )}

            {/* Completed Message */}
            {isCompleted && route.route_type !== 'maintenance' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                    <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                        تم إنهاء الرحلة بنجاح
                    </h3>
                    <p className="text-sm text-green-700">
                        إجمالي الوزن المجمع: {(() => {
                            const bagsWeight = stops?.reduce((sum, stop) => sum + (parseFloat(stop.collection_details?.total_weight) || 0), 0) || 0;
                            const safetyBoxWeight = stops?.reduce((sum, stop) => sum + (parseFloat(stop.collection_details?.safety_box_weight) || 0), 0) || 0;
                            return (bagsWeight + safetyBoxWeight).toFixed(2);
                        })()} كجم
                    </p>
                </div>
            )}

            {/* Maintenance Completed Message */}
            {isCompleted && route.route_type === 'maintenance' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                    <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                        تم تأكيد استلام مهمة الصيانة
                    </h3>
                </div>
            )}

            {/* Incinerator Delivery Modal */}
            {route && (
                <IncineratorDeliveryModal
                    isOpen={showDeliveryModal}
                    onClose={() => setShowDeliveryModal(false)}
                    route={{ ...route, route_stops: stops }}
                    onSuccess={() => {
                        setShowDeliveryModal(false);
                        fetchRouteDetails();
                        fetchDeliveries();
                    }}
                />
            )}
        </div>
    );
};

export default RepresentativeRoute;
