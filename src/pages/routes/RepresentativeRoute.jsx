import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import RouteStopCard from '../../components/routes/RouteStopCard';
import PrintReceipts from '../../components/routes/PrintReceipts';
import { Loader2, MapPin, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

const RepresentativeRoute = () => {
    const { routeId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [route, setRoute] = useState(null);
    const [stops, setStops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [isStarting, setIsStarting] = useState(false);

    useEffect(() => {
        fetchRouteDetails();
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
                        {/* Print Receipts Button - Before starting */}
                        {stops.length > 0 && (
                            <div className="mt-4">
                                <PrintReceipts route={route} stops={stops} />
                            </div>
                        )}
                        
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
                        isRouteInProgress={isInProgress}
                        currentLocation={currentLocation}
                        onUpdate={fetchRouteDetails}
                    />
                ))}
            </div>

            {/* Incinerator (Final Stop) */}
            {isInProgress && stops.every(s => s.status === 'collected') && (
                <IncineratorStop
                    route={route}
                    currentLocation={currentLocation}
                    onComplete={handleCompleteRoute}
                />
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
        </div>
    );
};

// Incinerator Final Stop Component
const IncineratorStop = ({ route, currentLocation, onComplete }) => {
    const [finalWeight, setFinalWeight] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!finalWeight || parseFloat(finalWeight) <= 0) {
            alert('الرجاء إدخال الوزن النهائي');
            return;
        }

        setIsSubmitting(true);
        await onComplete(parseFloat(finalWeight));
        setIsSubmitting(false);
    };

    return (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow-sm border border-purple-200 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                    M
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900">{route.incinerators?.name}</h3>
                    <p className="text-sm text-gray-600">{route.incinerators?.location}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        الوزن النهائي في المحرقة (كجم)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={finalWeight}
                        onChange={(e) => setFinalWeight(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        placeholder="أدخل الوزن النهائي"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || !currentLocation}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>جاري الإنهاء...</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="w-5 h-5" />
                            <span>إنهاء الرحلة</span>
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default RepresentativeRoute;
