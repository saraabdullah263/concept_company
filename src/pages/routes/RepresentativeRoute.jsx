import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import RouteStopCard from '../../components/routes/RouteStopCard';
import IncineratorDeliveryModal from '../../components/routes/IncineratorDeliveryModal';
import PrintCompleteReceipt from '../../components/routes/PrintCompleteReceipt';
import { Loader2, MapPin, Clock, AlertCircle, CheckCircle2, Factory } from 'lucide-react';

const RepresentativeRoute = () => {
    const { routeId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
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
                .select('*, incinerators(name)')
                .eq('route_id', routeId)
                .order('delivery_order', { ascending: true });

            if (!error && data) {
                setDeliveries(data);
            }
        } catch (error) {
            console.error('Error fetching deliveries:', error);
        }
    };

    const handleStartRoute = async () => {
        if (!currentLocation) {
            alert('الرجاء تفعيل خدمة الموقع');
            getCurrentLocation();
            return;
        }

        try {
            setIsStarting(true);

            const now = new Date().toISOString();

            // Update route
            const { error: routeError } = await supabase
                .from('routes')
                .update({
                    status: 'in_progress',
                    start_time: now,
                    start_location: currentLocation
                })
                .eq('id', routeId);

            if (routeError) throw routeError;

            // Log event
            await supabase.from('route_tracking_logs').insert({
                route_id: routeId,
                event_type: 'route_started',
                event_time: now,
                location: currentLocation
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

    const handleCompleteRoute = async (finalWeight) => {
        if (!currentLocation) {
            alert('الرجاء تفعيل خدمة الموقع');
            return;
        }

        try {
            const now = new Date().toISOString();

            // Update route
            const { error: routeError } = await supabase
                .from('routes')
                .update({
                    status: 'completed',
                    end_time: now,
                    end_location: currentLocation,
                    final_weight_at_incinerator: finalWeight
                })
                .eq('id', routeId);

            if (routeError) throw routeError;

            // Log event
            await supabase.from('route_tracking_logs').insert({
                route_id: routeId,
                event_type: 'route_completed',
                event_time: now,
                location: currentLocation,
                data: { final_weight: finalWeight }
            });

            alert('تم إنهاء الرحلة بنجاح');
            navigate('/routes');

        } catch (error) {
            console.error('Error completing route:', error);
            alert('حدث خطأ في إنهاء الرحلة');
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
                        <h1 className="text-2xl font-bold text-gray-900">
                            {route.route_name || `رحلة ${new Date(route.route_date).toLocaleDateString('ar-EG')}`}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {route.vehicles?.plate_number} • {route.incinerators?.name}
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

                {canStart && (
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

                {!currentLocation && (
                    <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>الرجاء تفعيل خدمة الموقع للمتابعة</span>
                    </div>
                )}
            </div>

            {/* Route Progress */}
            {isInProgress && (
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

            {/* Stops List */}
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

            {/* Incinerator Delivery - After all stops collected */}
            {isInProgress && stops.every(s => s.status === 'collected') && deliveries.length === 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 text-center">
                    <Factory className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                    <h3 className="font-bold text-gray-900 mb-2">تم التجميع من جميع العملاء</h3>
                    <p className="text-gray-600 mb-1">
                        إجمالي المجمع: {stops.reduce((sum, s) => sum + (s.collection_details?.bags_count || 0), 0)} كيس
                    </p>
                    <p className="text-gray-600 mb-4">
                        الوزن الكلي: {route.total_weight_collected || 0} كجم
                    </p>
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
            {deliveries.length > 0 && (
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
                                        {index + 1}. {delivery.incinerators?.name}
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
                                {route.total_weight_collected || 0} كجم
                            </div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-sm text-gray-600 mb-1">المسلم</div>
                            <div className="font-bold text-green-600">
                                {deliveries.reduce((sum, d) => sum + parseInt(d.bags_count || 0), 0)} كيس
                            </div>
                            <div className="text-sm text-green-600">
                                {deliveries.reduce((sum, d) => sum + parseFloat(d.weight_delivered || 0), 0).toFixed(2)} كجم
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
            {isCompleted && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                    <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                        تم إنهاء الرحلة بنجاح
                    </h3>
                    <p className="text-sm text-green-700">
                        إجمالي الوزن المجمع: {route.total_weight_collected} كجم
                    </p>
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
