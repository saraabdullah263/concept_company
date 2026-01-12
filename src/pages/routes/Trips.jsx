import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import TripList from '../../components/routes/TripList';
import { Search, Loader2, Calendar, MapPin } from 'lucide-react';
import clsx from 'clsx';

const TripsPage = () => {
    const { userRole, user } = useAuth();
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [representativeFilter, setRepresentativeFilter] = useState('all');
    const [hospitalFilter, setHospitalFilter] = useState('all');
    const [routeFilter, setRouteFilter] = useState('all');
    const [representativeId, setRepresentativeId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    
    // Lists for filters
    const [representatives, setRepresentatives] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [tripStats, setTripStats] = useState({ totalTrips: 0, hospitalVisits: {} });

    // Get representative ID if user is representative
    useEffect(() => {
        const getRepresentativeId = async () => {
            if (userRole === 'representative' && user) {
                const { data } = await supabase
                    .from('representatives')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();
                
                if (data) {
                    setRepresentativeId(data.id);
                }
            }
        };
        getRepresentativeId();
    }, [userRole, user]);

    // Fetch filter options
    useEffect(() => {
        const fetchFilterOptions = async () => {
            // Fetch representatives
            if (userRole !== 'representative') {
                const { data: repsData } = await supabase
                    .from('representatives')
                    .select('id, user_id, users!user_id(full_name)')
                    .order('users(full_name)');
                if (repsData) setRepresentatives(repsData);
            }

            // Fetch hospitals
            const { data: hospitalsData } = await supabase
                .from('hospitals')
                .select('id, name')
                .eq('is_active', true)
                .order('name');
            if (hospitalsData) setHospitals(hospitalsData);

            // Fetch routes
            const { data: routesData } = await supabase
                .from('routes')
                .select('id, route_number, route_name')
                .eq('route_type', 'collection')
                .order('route_date', { ascending: false })
                .limit(50);
            if (routesData) setRoutes(routesData);
        };

        fetchFilterOptions();
    }, [userRole]);

    const fetchTrips = async () => {
        try {
            setLoading(true);

            // جلب خطوط السير أولاً
            let routeQuery = supabase
                .from('routes')
                .select('*')
                .eq('route_type', 'collection')
                .order('route_date', { ascending: false });

            // إذا كان المستخدم مندوب، اعرض رحلاته فقط
            if (userRole === 'representative' && representativeId) {
                routeQuery = routeQuery.eq('representative_id', representativeId);
            }

            // Filter by representative
            if (representativeFilter !== 'all') {
                routeQuery = routeQuery.eq('representative_id', representativeFilter);
            }

            // Filter by route
            if (routeFilter !== 'all') {
                routeQuery = routeQuery.eq('id', routeFilter);
            }

            // Filter by date range
            if (filterDateFrom) {
                routeQuery = routeQuery.gte('route_date', filterDateFrom);
            }
            if (filterDateTo) {
                routeQuery = routeQuery.lte('route_date', filterDateTo);
            }

            const { data: routesData, error: routesError } = await routeQuery;
            if (routesError) throw routesError;

            if (!routesData || routesData.length === 0) {
                setTrips([]);
                setTripStats({ totalTrips: 0, hospitalVisits: {} });
                setLoading(false);
                return;
            }

            // جلب البيانات المرتبطة
            const routeIds = routesData.map(r => r.id);
            const repIds = [...new Set(routesData.map(r => r.representative_id).filter(Boolean))];
            const vehicleIds = [...new Set(routesData.map(r => r.vehicle_id).filter(Boolean))];

            // جلب المندوبين
            let repsMap = {};
            if (repIds.length > 0) {
                const { data: reps } = await supabase
                    .from('representatives')
                    .select('id, user_id, users!user_id(full_name)')
                    .in('id', repIds);
                if (reps) repsMap = Object.fromEntries(reps.map(r => [r.id, r]));
            }

            // جلب المركبات
            let vehiclesMap = {};
            if (vehicleIds.length > 0) {
                const { data: vehicles } = await supabase
                    .from('vehicles')
                    .select('id, plate_number, model')
                    .in('id', vehicleIds);
                if (vehicles) vehiclesMap = Object.fromEntries(vehicles.map(v => [v.id, v]));
            }

            // جلب محطات خطوط السير (رحلات العملاء)
            let stopsQuery = supabase
                .from('route_stops')
                .select('*, hospitals!hospital_id(id, name, address)')
                .in('route_id', routeIds)
                .order('route_id')
                .order('stop_order');

            // Filter by hospital
            if (hospitalFilter !== 'all') {
                stopsQuery = stopsQuery.eq('hospital_id', hospitalFilter);
            }

            const { data: stopsData } = await stopsQuery;

            // جلب رحلات المحارق
            const { data: deliveriesData } = await supabase
                .from('incinerator_deliveries')
                .select('*, incinerators:incinerator_id(name)')
                .in('route_id', routeIds)
                .order('route_id')
                .order('delivery_order');

            // تحويل كل محطة ورحلة محرقة إلى "رحلة" منفصلة
            const allTrips = [];
            const hospitalVisitCount = {};

            routesData.forEach(route => {
                const routeInfo = {
                    route_id: route.id,
                    route_number: route.route_number,
                    route_name: route.route_name,
                    route_date: route.route_date,
                    route_status: route.status,
                    representative: route.representative_id ? repsMap[route.representative_id] : null,
                    vehicle: route.vehicle_id ? vehiclesMap[route.vehicle_id] : null,
                };

                // إضافة رحلات العملاء
                const routeStops = stopsData?.filter(s => s.route_id === route.id) || [];
                routeStops.forEach(stop => {
                    const bagsWeight = parseFloat(stop.collection_details?.total_weight || 0);
                    const safetyBoxWeight = parseFloat(stop.collection_details?.safety_box_weight || 0);
                    
                    // Count hospital visits
                    if (stop.hospital_id) {
                        hospitalVisitCount[stop.hospital_id] = (hospitalVisitCount[stop.hospital_id] || 0) + 1;
                    }
                    
                    allTrips.push({
                        ...routeInfo,
                        trip_id: stop.id,
                        trip_type: 'hospital',
                        trip_order: stop.stop_order,
                        status: stop.status,
                        hospital_id: stop.hospital_id,
                        destination: stop.hospitals?.name || 'مستشفى غير معروف',
                        destination_address: stop.hospitals?.address,
                        arrival_time: stop.arrival_time,
                        departure_time: stop.departure_time,
                        weight: bagsWeight + safetyBoxWeight,
                        bags_count: stop.collection_details?.bags_count || 0,
                        safety_box_count: stop.collection_details?.safety_box_count || 0,
                        receipt_number: stop.receipt_number,
                        has_signature: !!stop.hospital_signature,
                        has_photo: !!stop.photo_proof,
                    });
                });

                // إضافة رحلات المحارق
                const routeDeliveries = deliveriesData?.filter(d => d.route_id === route.id) || [];
                routeDeliveries.forEach(delivery => {
                    allTrips.push({
                        ...routeInfo,
                        trip_id: delivery.id,
                        trip_type: 'incinerator',
                        trip_order: 1000 + delivery.delivery_order,
                        status: 'completed',
                        destination: delivery.incinerators?.name || 'محرقة غير معروفة',
                        delivery_time: delivery.delivery_time,
                        weight: parseFloat(delivery.weight_delivered || 0),
                        bags_count: delivery.bags_count || 0,
                        delivery_number: delivery.delivery_number,
                        has_signature: !!delivery.receiver_signature,
                        has_photo: !!delivery.photo_proof,
                    });
                });
            });

            // فلترة حسب الحالة
            let filteredTrips = allTrips;
            if (statusFilter !== 'all') {
                filteredTrips = filteredTrips.filter(trip => trip.status === statusFilter);
            }

            // فلترة حسب العميل (رحلات المستشفيات فقط)
            if (hospitalFilter !== 'all') {
                filteredTrips = filteredTrips.filter(trip => 
                    trip.trip_type === 'hospital' && trip.hospital_id === hospitalFilter
                );
            }

            // ترتيب حسب التاريخ ثم الترتيب
            filteredTrips.sort((a, b) => {
                const dateCompare = new Date(b.route_date) - new Date(a.route_date);
                if (dateCompare !== 0) return dateCompare;
                return a.trip_order - b.trip_order;
            });

            setTrips(filteredTrips);
            setTripStats({
                totalTrips: filteredTrips.length,
                hospitalVisits: hospitalVisitCount
            });
        } catch (error) {
            console.error('Error fetching trips:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userRole === 'representative' && !representativeId) {
            return;
        }
        setCurrentPage(1); // Reset to first page when filters change
        fetchTrips();
    }, [filterDateFrom, filterDateTo, statusFilter, representativeFilter, hospitalFilter, routeFilter, userRole, representativeId]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {userRole === 'representative' ? 'رحلاتي' : 'جميع الرحلات'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        عرض وتتبع الرحلات اليومية
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {/* Date From */}
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">من تاريخ</label>
                        <div className="relative">
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                            <input
                                type="date"
                                className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                                value={filterDateFrom}
                                onChange={(e) => setFilterDateFrom(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Date To */}
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">إلى تاريخ</label>
                        <div className="relative">
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                            <input
                                type="date"
                                className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                                value={filterDateTo}
                                onChange={(e) => setFilterDateTo(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">الحالة</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white text-sm"
                        >
                            <option value="all">جميع الحالات</option>
                            <option value="pending">معلقة</option>
                            <option value="arrived">وصل</option>
                            <option value="collected">مكتملة</option>
                            <option value="skipped">ملغاة</option>
                        </select>
                    </div>

                    {/* Representative Filter */}
                    {userRole !== 'representative' && (
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">المندوب</label>
                            <select
                                value={representativeFilter}
                                onChange={(e) => setRepresentativeFilter(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white text-sm"
                            >
                                <option value="all">جميع المندوبين</option>
                                {representatives.map(rep => (
                                    <option key={rep.id} value={rep.id}>
                                        {rep.users?.full_name || 'غير محدد'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Hospital Filter */}
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">العميل</label>
                        <select
                            value={hospitalFilter}
                            onChange={(e) => setHospitalFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white text-sm"
                        >
                            <option value="all">جميع العملاء</option>
                            {hospitals.map(hospital => (
                                <option key={hospital.id} value={hospital.id}>
                                    {hospital.name}
                                    {tripStats.hospitalVisits[hospital.id] && 
                                        ` (${tripStats.hospitalVisits[hospital.id]} زيارة)`
                                    }
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Route Filter */}
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">خط السير</label>
                        <select
                            value={routeFilter}
                            onChange={(e) => setRouteFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white text-sm"
                        >
                            <option value="all">جميع خطوط السير</option>
                            {routes.map(route => (
                                <option key={route.id} value={route.id}>
                                    {route.route_number || route.route_name || `خط ${route.id.slice(0, 8)}`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Stats Summary */}
                {tripStats.totalTrips > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-600">إجمالي الرحلات:</span>
                            <span className="font-bold text-brand-600">{tripStats.totalTrips}</span>
                        </div>
                        {hospitalFilter !== 'all' && tripStats.hospitalVisits[hospitalFilter] && (
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600">عدد الزيارات:</span>
                                <span className="font-bold text-green-600">{tripStats.hospitalVisits[hospitalFilter]}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                </div>
            ) : (
                <>
                    <TripList 
                        trips={trips.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)} 
                    />
                    
                    {/* Pagination */}
                    {trips.length > itemsPerPage && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                عرض {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, trips.length)} من {trips.length} رحلة
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    السابق
                                </button>
                                
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.ceil(trips.length / itemsPerPage) }, (_, i) => i + 1)
                                        .filter(page => {
                                            // Show first page, last page, current page, and pages around current
                                            return page === 1 || 
                                                   page === Math.ceil(trips.length / itemsPerPage) || 
                                                   Math.abs(page - currentPage) <= 1;
                                        })
                                        .map((page, index, array) => (
                                            <div key={page} className="flex items-center">
                                                {index > 0 && array[index - 1] !== page - 1 && (
                                                    <span className="px-2 text-gray-400">...</span>
                                                )}
                                                <button
                                                    onClick={() => setCurrentPage(page)}
                                                    className={clsx(
                                                        "w-10 h-10 rounded-lg text-sm font-medium transition-colors",
                                                        currentPage === page
                                                            ? "bg-brand-600 text-white"
                                                            : "text-gray-700 hover:bg-gray-100"
                                                    )}
                                                >
                                                    {page}
                                                </button>
                                            </div>
                                        ))
                                    }
                                </div>
                                
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(trips.length / itemsPerPage), prev + 1))}
                                    disabled={currentPage === Math.ceil(trips.length / itemsPerPage)}
                                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    التالي
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default TripsPage;
