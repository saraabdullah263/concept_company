import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { ArrowRight, MapPin, User, Truck, Calendar, Package, CheckCircle, Clock, Loader2 } from 'lucide-react';
import PrintReceipts from '../../components/routes/PrintReceipts';

const RouteDetails = () => {
    const { id } = useParams();
    const [route, setRoute] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRouteDetails();
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
                    {route.route_stops && route.route_stops.length > 0 && (
                        <PrintReceipts route={route} stops={route.route_stops} />
                    )}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(route.status)}`}>
                        {getStatusText(route.status)}
                    </span>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Package className="w-5 h-5 text-brand-600" />
                        <span className="text-sm text-gray-500">الوزن المجمع</span>
                    </div>
                    <p className="font-medium">{route.total_weight_collected || 0} كجم</p>
                </div>
            </div>

            {/* Route Stops */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">محطات الرحلة ({route.route_stops?.length || 0})</h3>
                </div>

                {route.route_stops && route.route_stops.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {route.route_stops
                            .sort((a, b) => a.stop_order - b.stop_order)
                            .map((stop, index) => (
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

                                    {/* Additional Details - Photos, Signatures, Times */}
                                    {(stop.photo_proof || stop.hospital_signature || stop.arrival_time) && (
                                        <div className="mt-4 ml-12 space-y-3 bg-gray-50 rounded-lg p-4">
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

                                            {/* Signature */}
                                            {stop.hospital_signature?.url && (
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700 mb-2">✍️ التوقيع الإلكتروني:</p>
                                                    <div className="inline-block bg-white p-3 rounded-lg border-2 border-gray-200">
                                                        <img 
                                                            src={stop.hospital_signature.url} 
                                                            alt="توقيع المستشفى"
                                                            className="max-w-xs"
                                                        />
                                                    </div>
                                                    {stop.signature_time && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            تم التوقيع: {new Date(stop.signature_time).toLocaleString('ar-EG')}
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

            {/* Additional Info */}
            {route.notes && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <h3 className="font-bold text-gray-900 mb-2">ملاحظات</h3>
                    <p className="text-gray-700">{route.notes}</p>
                </div>
            )}
        </div>
    );
};

export default RouteDetails;
